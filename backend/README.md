# Learner agent

This service is the model-facing layer between the separate frontend and backend application services. It accepts extracted, versioned course sources and returns grounded, structured artefacts.

## Run locally

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export AGENT_API_KEY='local-dev-key'
# Optional: enables model-backed generation; without it, a safe source-index fallback is used.
export OPENAI_API_KEY='...'
uvicorn app.main:app --reload --port 8000
```

Every `/v1/*` request needs `Authorization: Bearer $AGENT_API_KEY`. `/health` is public for service checks.

## Integration notes

- The service stores runs, versioned sources, quizzes, and attempts in SQLite by default. Set `STUDY_BUDDY_DB` for another location.
- `POST /v1/sessions` receives extracted text rather than raw files; file parsing belongs to the application backend.
- Generated quiz keys are persisted but should be human-reviewed before a quiz is marked trusted.
- Call `POST /v1/quiz/{quiz_id}/verify` after a human checks the answer key; grading is rejected until then.
- The frontend can call this service through a backend proxy; do not expose the agent API key in the browser.
- The LLM adapter uses an OpenAI-compatible chat-completions endpoint and can be replaced through `LLM_ENDPOINT`.

## Smoke test

```bash
curl http://localhost:8000/health
curl -H "Authorization: Bearer $AGENT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"course_id":"bio-101","learner_id":"student-1","sources":[{"source_id":"chapter-3","title":"Cell structure","text":"The cell membrane is selectively permeable. Active transport uses energy."}]}' \
  http://localhost:8000/v1/sessions
```
