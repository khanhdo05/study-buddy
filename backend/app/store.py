import hashlib
import json
import sqlite3
import threading
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


def now() -> str:
    return datetime.now(UTC).isoformat()


class Store:
    def __init__(self, path: str):
        Path(path).parent.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(path, check_same_thread=False)
        self.db.row_factory = sqlite3.Row
        self.lock = threading.RLock()
        self.db.executescript("""
            CREATE TABLE IF NOT EXISTS sources (
              source_id TEXT NOT NULL, version TEXT NOT NULL, course_id TEXT NOT NULL,
              title TEXT NOT NULL, text TEXT NOT NULL, fingerprint TEXT NOT NULL,
              metadata TEXT NOT NULL, created_at TEXT NOT NULL,
              PRIMARY KEY (source_id, version)
            );
            CREATE TABLE IF NOT EXISTS runs (
              run_id TEXT PRIMARY KEY, course_id TEXT NOT NULL, learner_id TEXT,
              scope TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS quizzes (
              quiz_id TEXT PRIMARY KEY, run_id TEXT NOT NULL, course_id TEXT NOT NULL,
              learner_id TEXT, payload TEXT NOT NULL, verified INTEGER NOT NULL DEFAULT 0,
              created_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS attempts (
              id INTEGER PRIMARY KEY AUTOINCREMENT, quiz_id TEXT NOT NULL,
              question_id TEXT NOT NULL, course_id TEXT NOT NULL, learner_id TEXT,
              concept_id TEXT NOT NULL, response TEXT, correct INTEGER,
              created_at TEXT NOT NULL
            );
        """)
        self.db.commit()

    def add_run(self, run_id: str, request: Any) -> None:
        with self.lock:
            for source in request.sources:
                fingerprint = hashlib.sha256(source.text.encode()).hexdigest()
                self.db.execute(
                    "INSERT OR REPLACE INTO sources VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (source.source_id, source.version, request.course_id, source.title,
                     source.text, fingerprint, json.dumps(source.metadata), now()),
                )
            self.db.execute(
                "INSERT INTO runs VALUES (?, ?, ?, ?, ?, ?)",
                (run_id, request.course_id, request.learner_id, request.scope.model_dump_json(), "created", now()),
            )
            self.db.commit()

    def run(self, run_id: str) -> sqlite3.Row | None:
        return self.db.execute("SELECT * FROM runs WHERE run_id = ?", (run_id,)).fetchone()

    def sources(self, course_id: str) -> list[sqlite3.Row]:
        return self.db.execute("SELECT * FROM sources WHERE course_id = ? ORDER BY title", (course_id,)).fetchall()

    def save_quiz(self, quiz_id: str, run: sqlite3.Row, payload: dict[str, Any]) -> None:
        with self.lock:
            self.db.execute(
                "INSERT INTO quizzes VALUES (?, ?, ?, ?, ?, 0, ?)",
                (quiz_id, run["run_id"], run["course_id"], run["learner_id"], json.dumps(payload), now()),
            )
            self.db.commit()

    def quiz(self, quiz_id: str) -> sqlite3.Row | None:
        return self.db.execute("SELECT * FROM quizzes WHERE quiz_id = ?", (quiz_id,)).fetchone()

    def verify_quiz(self, quiz_id: str) -> bool:
        with self.lock:
            cursor = self.db.execute("UPDATE quizzes SET verified = 1 WHERE quiz_id = ?", (quiz_id,))
            self.db.commit()
            return cursor.rowcount == 1

    def attempts(self, course_id: str, learner_id: str) -> list[sqlite3.Row]:
        return self.db.execute(
            "SELECT * FROM attempts WHERE course_id = ? AND learner_id = ? ORDER BY created_at DESC",
            (course_id, learner_id),
        ).fetchall()

    def add_attempts(self, quiz: sqlite3.Row, responses: dict[str, str]) -> list[dict[str, Any]]:
        payload = json.loads(quiz["payload"])
        results = []
        with self.lock:
            for question in payload.get("questions", []):
                qid = question["question_id"]
                response = responses.get(qid)
                correct = response is not None and response == question["correct_answer"]
                self.db.execute(
                    "INSERT INTO attempts (quiz_id, question_id, course_id, learner_id, concept_id, response, correct, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (quiz["quiz_id"], qid, quiz["course_id"], quiz["learner_id"], question["concept_id"], response, int(correct), now()),
                )
                results.append({"question_id": qid, "concept_id": question["concept_id"], "correct": correct})
            self.db.commit()
        return results

    def close(self) -> None:
        self.db.close()
