import os
import uuid
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from .agent import Agent
from .llm import LLMError, LLMProvider
from .models import ChatRequest, EvaluateRequest, GenerateRequest, RecommendationRequest, SessionRequest
from .store import Store


store = Store(os.getenv("STUDY_BUDDY_DB", "backend/data/study_buddy.sqlite3"))
agent = Agent(store, LLMProvider())


def authenticate(authorization: str | None = Header(default=None)) -> None:
    expected = os.getenv("AGENT_API_KEY")
    if not expected:
        raise HTTPException(503, "AGENT_API_KEY is not configured")
    if authorization != f"Bearer {expected}":
        raise HTTPException(401, "Invalid API key")


@asynccontextmanager
async def lifespan(_: FastAPI):
    yield
    store.close()


app = FastAPI(title="Study Buddy Learner Agent", version="1.0.0", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","), allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
def health() -> dict[str, str | bool]:
    return {"status": "ok", "service": "learner-agent", "llm_configured": agent.llm.configured}


@app.post("/v1/sessions", dependencies=[Depends(authenticate)])
def create_session(request: SessionRequest) -> dict[str, str]:
    run_id = f"run_{uuid.uuid4().hex[:12]}"
    store.add_run(run_id, request)
    return {"run_id": run_id, "status": "created"}


@app.post("/v1/generate", dependencies=[Depends(authenticate)])
def generate(request: GenerateRequest) -> dict:
    run = store.run(request.run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    try:
        return agent.generate(run, request.operation, request.question_count, request.topic, request.detail)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc


@app.post("/v1/quiz/evaluate", dependencies=[Depends(authenticate)])
def evaluate(request: EvaluateRequest) -> dict:
    quiz = store.quiz(request.quiz_id)
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    if not quiz["verified"]:
        raise HTTPException(409, "A human reviewer must verify this answer key before grading")
    results = store.add_attempts(quiz, request.responses)
    return {"quiz_id": request.quiz_id, "results": results, "verified": True}


@app.post("/v1/quiz/{quiz_id}/verify", dependencies=[Depends(authenticate)])
def verify_quiz(quiz_id: str) -> dict[str, object]:
    if not store.verify_quiz(quiz_id):
        raise HTTPException(404, "Quiz not found")
    return {"quiz_id": quiz_id, "verified": True}


@app.post("/v1/recommendations", dependencies=[Depends(authenticate)])
def recommendations(request: RecommendationRequest) -> dict:
    attempts = store.attempts(request.course_id, request.learner_id)
    missed: dict[str, int] = {}
    for item in attempts:
        if not item["correct"] and (not request.topic or request.topic.lower() in item["concept_id"].lower()):
            missed[item["concept_id"]] = missed.get(item["concept_id"], 0) + 1
    ordered = sorted(missed, key=missed.get, reverse=True)[:request.limit]
    return {"course_id": request.course_id, "learner_id": request.learner_id, "concepts": [{"concept_id": concept, "misses": missed[concept], "priority": "review_needed"} for concept in ordered]}


@app.post("/v1/chat", dependencies=[Depends(authenticate)])
def chat(request: ChatRequest) -> dict:
    run = store.run(request.run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    try:
        return agent.chat(run, request.message, request.student_attempt)
    except LLMError as exc:
        raise HTTPException(502, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(502, "Agent could not produce a grounded response") from exc


@app.get("/v1/runs/{run_id}", dependencies=[Depends(authenticate)])
def get_run(run_id: str) -> dict:
    run = store.run(run_id)
    if not run:
        raise HTTPException(404, "Run not found")
    return {"run_id": run["run_id"], "course_id": run["course_id"], "learner_id": run["learner_id"], "status": run["status"], "created_at": run["created_at"]}
