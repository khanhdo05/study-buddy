from typing import Any, Literal

from pydantic import BaseModel, Field


Operation = Literal["concept_map", "review_sheet", "quiz", "combined"]


class SourceInput(BaseModel):
    source_id: str = Field(min_length=1, max_length=120)
    title: str = Field(min_length=1, max_length=300)
    text: str = Field(min_length=1)
    version: str = Field(default="1", max_length=80)
    metadata: dict[str, Any] = Field(default_factory=dict)


class Scope(BaseModel):
    included_topics: list[str] = Field(default_factory=list)
    excluded_topics: list[str] = Field(default_factory=list)
    learning_objectives: list[str] = Field(default_factory=list)
    current_material_only: bool = True
    direct_homework_answers: bool = False
    require_attempt_before_help: bool = False


class SessionRequest(BaseModel):
    course_id: str = Field(min_length=1, max_length=120)
    learner_id: str | None = Field(default=None, max_length=120)
    sources: list[SourceInput] = Field(default_factory=list)
    scope: Scope = Field(default_factory=Scope)


class GenerateRequest(BaseModel):
    run_id: str = Field(min_length=1)
    operation: Operation
    question_count: int = Field(default=5, ge=1, le=20)
    topic: str | None = Field(default=None, max_length=200)
    detail: Literal["concise", "standard", "expanded"] = "concise"


class EvaluateRequest(BaseModel):
    quiz_id: str
    responses: dict[str, str] = Field(default_factory=dict)


class RecommendationRequest(BaseModel):
    course_id: str
    learner_id: str
    topic: str | None = None
    limit: int = Field(default=5, ge=1, le=20)


class ChatRequest(BaseModel):
    run_id: str
    message: str = Field(min_length=1, max_length=4000)
    student_attempt: str | None = Field(default=None, max_length=4000)
