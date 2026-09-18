# Study Buddy API

This FastAPI service is the trusted model-facing layer. It receives a Supabase
access token, lets Supabase RLS determine course access, reads only published
course materials, and calls the configured model. The browser never receives the
OpenAI key.

## Run locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
# Copy .env.example to .env and set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY,
# and OPENAI_API_KEY. Do not put the OpenAI key in VITE_* frontend variables.
uvicorn app.main:app --reload --port 8000
```

The frontend expects `VITE_API_URL=http://localhost:8000`. Check the service:

```bash
curl http://localhost:8000/health
```

`llm_configured` must be `true` for live Study responses. If it is `false`,
the backend is running but the model provider is not configured.

## Integration notes

- `POST /courses/{course_id}/chat` powers the real course Study view.
- `POST /courses/{course_id}/materials/{material_id}/extract` previews document text.
- `POST /courses/{course_id}/materials/{material_id}/suggest` uses structured model output for topics, objectives, and policy passages.
- `POST /courses/{course_id}/chat` requires `message`, and accepts `attempt` and recent `history`.
- Chat answers use only published materials and the saved course policy; evidence is treated as untrusted document data.
- PDFs with no text layer need OCR and are rejected with an explanation for now.
- Public website sources must be HTTPS. Login-only pages should be exported as PDF or text.
- The OpenAI adapter is isolated in `app/llm.py`, so another OpenAI-compatible provider can replace it later.

## Smoke test

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/courses/COURSE_ID/chat \
  -H "Authorization: Bearer SUPABASE_ACCESS_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"message":"What is this course about?","attempt":"I think it covers the topics listed in the published materials."}'
```
