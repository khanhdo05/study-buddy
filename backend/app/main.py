from uuid import UUID
from fastapi import Depends, FastAPI
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .llm import answer_course_question, generate_course_quiz, get_extractor
from .documents import MAX_BYTES, extract_text, fetch_website
from .supabase import UserDatabase, user_database

app = FastAPI(title='Study Buddy API', version='0.1.0')
app.add_middleware(CORSMiddleware, allow_origins=get_settings().cors_origins,
                   allow_methods=['GET', 'POST'], allow_headers=['Authorization', 'Content-Type'])


class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    attempt: str | None = Field(default=None, max_length=4000)
    history: list[dict] = Field(default_factory=list, max_length=20)


@app.get('/health')
def health():
    return {'status': 'ok', 'llm_configured': bool(get_settings().openai_api_key)}


def read_material(course_id: UUID, material_id: UUID, db: UserDatabase):
    db.require_owner(str(course_id))
    material = db.material(str(course_id), str(material_id))
    if material['source_type'] == 'website':
        content, mime = fetch_website(material['source_url'])
    else:
        content = db.download(material['bucket'], material['storage_path'], MAX_BYTES)
        mime = material['mime_type']
    text, warnings = extract_text(content, mime)
    return text, warnings


@app.post('/courses/{course_id}/materials/{material_id}/extract')
def extract_material(course_id: UUID, material_id: UUID, db: UserDatabase = Depends(user_database)):
    text, warnings = read_material(course_id, material_id, db)
    return {'material_id': str(material_id), 'text': text, 'warnings': warnings,
            'llm_connected': False, 'suggestions': None}


@app.post('/courses/{course_id}/materials/{material_id}/suggest')
def suggest_material(course_id: UUID, material_id: UUID, db: UserDatabase = Depends(user_database)):
    text, warnings = read_material(course_id, material_id, db)
    suggestions = get_extractor(get_settings()).suggest(text)
    return {'material_id': str(material_id), 'text': text, 'warnings': warnings,
            'llm_connected': True, 'suggestions': suggestions.model_dump()}


@app.post('/courses/{course_id}/chat')
def chat(course_id: UUID, request: ChatRequest, db: UserDatabase = Depends(user_database)):
    """The bearer token is forwarded to Supabase, so RLS limits course data."""
    course_id_text = str(course_id)
    policy = db.policy(course_id_text)
    if policy.get('require_attempt') and not request.attempt:
        return {'answer': 'Your instructor requires an attempt first. Share what you tried and where you got stuck.', 'mode': 'guided', 'citations': []}
    evidence_parts = []
    for material in db.published_materials(course_id_text):
        try:
            if material['source_type'] == 'website':
                content, mime = fetch_website(material['source_url'])
            else:
                content = db.download(material['bucket'], material['storage_path'], MAX_BYTES)
                mime = material['mime_type']
            text, _ = extract_text(content, mime)
            evidence_parts.append(f"SOURCE {material['id']} ({material['title']}):\n{text[:12000]}")
        except Exception:
            # One malformed source should not expose an error or private path.
            continue
    answer = answer_course_question(get_settings(), request.message, request.attempt,
                                    policy, '\n\n'.join(evidence_parts)[:50000], request.history)
    return {**answer, 'course_id': course_id_text, 'llm_connected': True}


class QuizRequest(BaseModel):
    count: int = Field(default=5, ge=1, le=10)


@app.post('/courses/{course_id}/quiz')
def quiz(course_id: UUID, request: QuizRequest, db: UserDatabase = Depends(user_database)):
    policy = db.policy(str(course_id))
    evidence = []
    for material in db.published_materials(str(course_id)):
        try:
            if material['source_type'] == 'website': content, mime = fetch_website(material['source_url'])
            else: content, mime = db.download(material['bucket'], material['storage_path'], MAX_BYTES), material['mime_type']
            text, _ = extract_text(content, mime)
            evidence.append(f"SOURCE {material['title']}:\n{text[:12000]}")
        except Exception: continue
    if not evidence: raise HTTPException(422, 'Publish at least one readable course material before generating practice.')
    return {**generate_course_quiz(get_settings(), policy, '\n\n'.join(evidence)[:50000], request.count), 'course_id': str(course_id), 'llm_connected': True}


class AnswerRequest(BaseModel):
    concept: str = Field(min_length=1, max_length=200)
    correct: bool


@app.post('/courses/{course_id}/progress')
def record_progress(course_id: UUID, request: AnswerRequest, db: UserDatabase = Depends(user_database)):
    user = db.get('auth/v1/user')
    # Fetching the course through the same bearer token confirms enrollment/ownership via RLS.
    if not db.get('rest/v1/courses', {'id': f'eq.{course_id}', 'select': 'id'}):
        raise HTTPException(403, 'You are not enrolled in this course.')
    existing = db.get('rest/v1/student_concept_state', {'student_id': f'eq.{user["id"]}', 'course_id': f'eq.{course_id}', 'concept': f'eq.{request.concept}', 'select': '*'} )
    current = existing[0] if existing else {'times_seen': 0, 'times_correct': 0}
    row = {'student_id': user['id'], 'course_id': str(course_id), 'concept': request.concept.strip(), 'times_seen': current['times_seen'] + 1, 'times_correct': current['times_correct'] + int(request.correct), 'last_result': request.correct, 'last_reviewed': 'now()'}
    # PostgREST does not evaluate SQL expressions in JSON; use a timestamp generated server-side.
    from datetime import datetime, timezone
    row['last_reviewed'] = datetime.now(timezone.utc).isoformat()
    saved = db.post('rest/v1/student_concept_state', row, upsert=True)
    return saved[0] if saved else row


@app.get('/courses/{course_id}/progress')
def progress(course_id: UUID, db: UserDatabase = Depends(user_database)):
    return db.get('rest/v1/student_concept_state', {'course_id': f'eq.{course_id}', 'select': 'concept,times_seen,times_correct,last_result,last_reviewed', 'order': 'last_reviewed.desc'})


DEMO_POLICY = {
    'hints_first': True, 'require_attempt': False, 'allow_direct_answers': False,
    'restrict_to_topics': True, 'topics': ['Membrane transport', 'Enzyme activity', 'Cell organelles'],
    'objectives': ['Explain how substances cross membranes.', 'Describe how enzymes affect reaction rates.', 'Identify major organelle functions.'],
    'instructions': 'This is a presentation demo. Explain concepts and ask guiding questions. Do not provide direct answers to graded work.',
}
DEMO_EVIDENCE = '''SOURCE demo-cell-biology (BIO 101 Chapter 3):
Cell membranes are selectively permeable. Small nonpolar molecules can diffuse through the lipid bilayer. Active transport uses energy and transport proteins to move substances against a concentration gradient.

Enzymes speed reactions by lowering activation energy. Their active sites bind specific substrates, and high temperatures can change an enzyme shape and reduce activity.

The Golgi apparatus modifies and sorts proteins. Lysosomes contain enzymes that break down and recycle damaged cellular material.'''


@app.post('/demo/chat')
def demo_chat(request: ChatRequest):
    """Live-model presentation path using intentionally fixed, non-sensitive demo evidence."""
    answer = answer_course_question(get_settings(), request.message, request.attempt,
                                    DEMO_POLICY, DEMO_EVIDENCE, request.history)
    return {**answer, 'demo': True, 'llm_connected': True}
