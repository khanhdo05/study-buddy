from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import httpx
from .config import Settings, get_settings

bearer = HTTPBearer()


class UserDatabase:
    """User-scoped requests preserve Supabase RLS; no service key is needed."""
    def __init__(self, settings: Settings, token: str):
        self.url = settings.supabase_url.rstrip('/')
        self.headers = {'apikey': settings.supabase_publishable_key, 'Authorization': f'Bearer {token}'}

    def get(self, path: str, params: dict | None = None):
        try:
            response = httpx.get(f'{self.url}/{path}', headers=self.headers, params=params, timeout=15)
        except httpx.HTTPError as exc:
            raise HTTPException(502, 'Cannot reach the course database.') from exc
        if response.status_code in (401, 403):
            raise HTTPException(401, 'Your session expired or access was denied. Sign in again.')
        if not response.is_success:
            raise HTTPException(502, 'Cannot load course data. Check the database migration.')
        return response.json()

    def post(self, path: str, payload: dict, *, upsert: bool = False):
        headers = {**self.headers, 'Content-Type': 'application/json', 'Prefer': 'return=representation' + (',resolution=merge-duplicates' if upsert else '')}
        try:
            response = httpx.post(f'{self.url}/{path}', headers=headers, json=payload, timeout=15)
        except httpx.HTTPError as exc:
            raise HTTPException(502, 'Cannot reach the course database.') from exc
        if response.status_code in (401, 403): raise HTTPException(401, 'Your session expired or access was denied.')
        if not response.is_success: raise HTTPException(502, 'The learning result could not be saved.')
        return response.json() if response.content else None

    def require_owner(self, course_id: str):
        user = self.get('auth/v1/user')
        courses = self.get('rest/v1/courses', {'id': f'eq.{course_id}', 'select': 'id,owner_id'})
        if not courses or courses[0]['owner_id'] != user['id']:
            raise HTTPException(403, 'Only the course owner can process materials.')

    def material(self, course_id: str, material_id: str):
        rows = self.get('rest/v1/course_materials', {
            'id': f'eq.{material_id}', 'course_id': f'eq.{course_id}', 'select': '*',
        })
        if not rows:
            raise HTTPException(404, 'Material not found in this course.')
        return rows[0]

    def published_materials(self, course_id: str):
        return self.get('rest/v1/course_materials', {
            'course_id': f'eq.{course_id}', 'published': 'eq.true', 'select': '*',
            'order': 'created_at.desc',
        })

    def policy(self, course_id: str):
        rows = self.get('rest/v1/course_policies', {
            'course_id': f'eq.{course_id}', 'select': '*',
        })
        return rows[0] if rows else {
            'hints_first': True, 'require_attempt': True,
            'allow_direct_answers': False, 'restrict_to_topics': True,
            'topics': [], 'objectives': [], 'instructions': '',
        }

    def download(self, bucket: str, path: str, limit: int) -> bytes:
        from urllib.parse import quote
        try:
            with httpx.stream('GET', f'{self.url}/storage/v1/object/authenticated/{quote(bucket, safe="")}/{quote(path, safe="/")}', headers=self.headers, timeout=30) as response:
                if not response.is_success:
                    raise HTTPException(502, 'Cannot download the stored document.')
                content = bytearray()
                for chunk in response.iter_bytes(65536):
                    content.extend(chunk)
                    if len(content) > limit:
                        raise HTTPException(413, 'Document exceeds the processing size limit.')
                return bytes(content)
        except httpx.HTTPError as exc:
            raise HTTPException(502, 'Document download failed.') from exc


def user_database(credentials: HTTPAuthorizationCredentials = Depends(bearer), settings: Settings = Depends(get_settings)):
    if not settings.supabase_url or not settings.supabase_publishable_key:
        raise HTTPException(503, 'Backend Supabase configuration is missing.')
    return UserDatabase(settings, credentials.credentials)
