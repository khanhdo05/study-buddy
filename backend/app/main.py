from uuid import UUID
from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from .llm import get_extractor
from .documents import MAX_BYTES, extract_text, fetch_website
from .supabase import UserDatabase, user_database

app = FastAPI(title='Study Buddy API', version='0.1.0')
app.add_middleware(CORSMiddleware, allow_origins=get_settings().cors_origins,
                   allow_methods=['GET', 'POST'], allow_headers=['Authorization', 'Content-Type'])


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
