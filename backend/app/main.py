from uuid import UUID
from fastapi import Depends, FastAPI
from pydantic import BaseModel, Field
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .llm import answer_course_question, get_extractor
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
