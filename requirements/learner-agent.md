# Learner Agent Requirements

## 1. Purpose

The learner agent is an LLM-backed service that turns course materials into grounded learning artefacts and adapts practice to a learner's recorded performance. It is an agent layer only: the frontend owns presentation and interaction, while the backend owns authentication, persistence, file storage, and application orchestration.

The agent must prefer correctness, source grounding, and concise output over unsupported completeness or verbose explanation.

## 2. Scope and actors

### Actors

- **Learner:** requests artefacts, studies them, answers quiz questions, and provides feedback.
- **Instructor/course administrator:** supplies course scope, syllabus, inclusion/exclusion rules, and optionally reviews generated content.
- **Backend:** authenticates callers, stores source and learner data, invokes the agent, and exposes application APIs.
- **Frontend:** renders artefacts, concept maps, quiz interactions, citations, and errors.
- **Human reviewer:** validates quiz answers against the source before a quiz is considered trusted for the demo.

### In scope for the first version

- Syllabus plus one or more course documents as source material.
- Concept map, critical-review sheet, and single-answer multiple-choice quiz.
- Persistent quiz history and retry of missed concepts across sessions.
- Instructor-defined scope constraints.
- Grounded answers with source references and explicit uncertainty.
- A stateless, API-key-authenticated agent API.

### Deferred or optional

- Automated long-term spaced-repetition scheduling beyond missed-item retry.
- Full learner modeling, free-response grading, multimodal input, collaborative classrooms, and adaptive learning-style diagnosis.
- Dyslexia-friendly, ADHD-paced, and screen-reader presentation modes. The agent should provide structured, accessible content, but formatting remains primarily a frontend responsibility.

## 3. Functional requirements

### FR-1: Accept and normalize source material

The agent shall accept a request containing:

- `course_id` and optional `learner_id` supplied by the backend;
- source references or extracted text for a syllabus, chapter, paper, lecture notes, or assignment;
- instructor scope, including required topics, excluded topics, learning objectives, and assessment emphasis;
- an operation and output constraints such as difficulty, question count, and desired detail.

The backend shall provide stable source identifiers and versions. The agent shall not assume that an unversioned or missing source is current.

The agent should work from extracted text and metadata, not raw files, unless the integration explicitly supports file parsing.

### FR-2: Establish source scope

Before generation, the agent shall identify the relevant source set and versions, supported topics/objectives, instructor constraints, and ambiguous, missing, contradictory, or out-of-scope material.

If the request cannot be grounded in the provided sources, the agent shall say so and either ask for more material or return a clearly labeled limitation. It shall not fill gaps with fabricated facts.

### FR-3: Generate a course overview and concept map

When a syllabus is available, the agent shall produce a concise course-level overview linking major units, prerequisites, and learning objectives.

For selected material, the agent shall produce a concept map as structured graph data, not only prose. Each node and relationship shall include a stable local identifier, concise label, relationship type (`prerequisite`, `part_of`, `causes`, `contrasts_with`, etc.), source citation(s), and confidence or ambiguity marker where appropriate.

The frontend shall render the graph as a visual flowchart or interactive graph. The agent shall not require a particular rendering library.

### FR-4: Generate a critical-review sheet

The agent shall generate a structured review sheet containing, as applicable: central claim or learning objective; key concepts and evidence; assumptions, limitations, counterarguments, or unresolved questions; important terminology; and concise study prompts.

Every factual claim must cite a source location. Interpretation must be labeled as interpretation, inference, or question rather than presented as source fact.

### FR-5: Generate quizzes

The agent shall generate single-correct-answer multiple-choice questions by default. Each question shall contain a stable question and concept/topic identifier, stem and answer choices, a protected correct-answer field, concise rationale, difficulty, learning objective, source citation(s), and a quality flag if the source does not support a unique answer.

The agent shall avoid trick wording, duplicate choices, unsupported distractors, and questions whose answer depends on information outside the selected source scope. Questions with no defensible single answer shall be rejected or returned for human review.

The agent may generate a quiz, but the system shall not treat the answer key as authoritative until a human reviewer has checked it against the cited source for the hackathon workflow.

### FR-6: Evaluate quiz attempts and maintain learning memory

The backend shall persist, at minimum: quiz and question versions; presented questions and choices; learner responses and timestamps; correctness status (`correct`, `incorrect`, `unanswered`, `needs_review`); concept/topic mappings; source versions used; and human verification status for generated answer keys.

The agent shall recommend retry candidates using persisted history. The initial policy shall prioritize learner-missed questions and concepts from earlier sessions, especially when they overlap the current topic. Once a learner answers an item correctly, that attempt shall be recorded; the item may still recur under a later scheduling policy.

The agent shall never infer past performance from conversation text when the backend has not supplied the relevant records.

### FR-7: Build and use a knowledge representation

The system shall maintain a deduplicated representation of source documents, concepts, relationships, citations, and source versions. Duplicate detection shall use stable source identity and content fingerprinting where available.

For the first version, this may be implemented as structured records plus vector or keyword retrieval; a graph database is not required. Retrieval results supplied to the agent shall include source identifiers and text spans sufficient for citation.

### FR-8: Operate as a multi-phase agent with human-in-the-loop checkpoints

The workflow shall support: **scope** (validate sources and constraints), **retrieve** (select versioned evidence), **plan** (select artefacts and coverage), **generate**, **validate** (schema, citations, scope, quiz quality), **review**, and **deliver**.

The workflow shall be restartable and expose phase/status information to the backend without exposing internal chain-of-thought.

## 4. Integration contract

The agent layer shall expose versioned, backend-to-agent APIs. A minimum contract is:

- `POST /v1/sessions` — create an agent run with course, learner, sources, scope, and operation.
- `POST /v1/generate` — generate a concept map, review sheet, quiz, or combined artefact.
- `POST /v1/quiz/evaluate` — evaluate supplied responses using the backend-provided question version and approved answer key.
- `POST /v1/recommendations` — return retry candidates from backend-provided history.
- `GET /v1/runs/{run_id}` — return status, structured output, citations, warnings, and validation state.

Exact paths may change, but the boundary shall remain explicit and versioned. Requests and responses shall use documented JSON schemas. Long-running generation shall support polling or an asynchronous job response.

API-key requirements:

- Require an API key for every agent endpoint and send it through an authorization header, never a URL or generated content.
- Store and validate keys in the backend or gateway, not in the frontend.
- Support key rotation, revocation, rate limits, request IDs, and environment-specific keys.
- Never log keys, source secrets, learner answers, or raw prompts by default.

## 5. Non-functional requirements

### NFR-1: Grounding and correctness

- Generated factual statements, graph edges, review points, and quiz keys shall have source citations.
- The agent shall distinguish source fact, inference, uncertainty, and missing evidence.
- Validation shall reject malformed output, missing citations where required, and quiz items without a unique supported answer.
- Human verification status shall be visible to the frontend and persisted.

### NFR-2: Token and cost efficiency

- Retrieve only the minimum relevant source chunks; do not resend the full corpus on every request.
- Deduplicate documents and cache embeddings, normalized sources, and reusable intermediate representations by source version.
- Use compact structured prompts and schemas; request concise explanations by default.
- Limit quiz count, map size, and review-sheet length through explicit parameters.
- Record input/output token counts, model, latency, and estimated cost per run.

### NFR-3: Reliability and recoverability

- Validate every model response against a schema and retry only the failed phase or field when possible.
- Return partial results with warnings when safe; otherwise return a typed error with remediation guidance.
- Use idempotency keys for generation requests that may be retried.
- Preserve source and artefact versions so a run can be reproduced or audited.

### NFR-4: Security and privacy

- Enforce tenant/course/learner authorization in the backend before invoking the agent.
- Treat uploaded course material and learner responses as sensitive data; define retention and deletion behavior.
- Protect answer keys from learner-facing responses until quiz submission or review policy permits release.
- Defend against prompt injection in course materials: source text is data, not an instruction to override system or instructor constraints.

### NFR-5: Interoperability and maintainability

- Keep frontend and backend independent of the model provider and prompt implementation.
- Use stable identifiers, versioned schemas, explicit enums, and backward-compatible API changes.
- Keep rendering decisions out of the agent response except for semantic layout hints.
- Provide structured logs, metrics, health checks, and trace/request IDs without logging secrets.

### NFR-6: Accessibility and usability

- Return semantic headings, ordered content, plain-language explanations, and machine-readable graph data.
- Support concise output by default and allow the frontend to request expansion for difficult concepts.
- Ensure user-visible warnings distinguish verified, generated, and uncertain content.

## 6. Acceptance criteria for the hackathon demo

1. A course with a syllabus and chapter can produce a concept map, critical-review sheet, and quiz whose claims link to source locations.
2. A human teammate can inspect and approve the quiz answer key before it is marked verified.
3. The learner can answer the quiz, close or restart the application, and receive previously missed items in a later session.
4. The retry set is derived from persisted backend records, not current chat context.
5. Unsupported or ambiguous questions are flagged instead of silently graded as correct.
6. The frontend can render all outputs using documented JSON schemas without depending on LLM prompts.
7. An invalid, missing, revoked, or rate-limited API key produces a typed error and no model call.
8. A run exposes citations, warnings, verification state, model metadata, and request ID for debugging and audit.

## 7. Decisions to resolve later

- Exact source citation format: page/section/character span, depending on parser support.
- Whether evaluation is deterministic in the backend or delegated to the agent for open-ended answers.
- Retry scheduling policy after the initial missed-item behavior.
- Supported document types, maximum sizes, languages, and retention period.
- Model/provider selection, fallback behavior, and target latency/cost budgets.
- Whether instructors approve complete artefacts, only quiz answer keys, or both.
