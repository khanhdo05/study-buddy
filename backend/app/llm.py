import json
import os
import urllib.error
import urllib.request
from typing import Any


class LLMError(RuntimeError):
    pass


class LLMProvider:
    """OpenAI-compatible adapter; the agent itself is provider-agnostic."""

    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("LLM_MODEL", "gpt-4o-mini")
        self.endpoint = os.getenv("LLM_ENDPOINT", "https://api.openai.com/v1/chat/completions")

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    def json(self, system: str, user: str) -> dict[str, Any]:
        if not self.api_key:
            raise LLMError("LLM provider is not configured")
        body = json.dumps({
            "model": self.model,
            "temperature": 0.1,
            "response_format": {"type": "json_object"},
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        }).encode()
        request = urllib.request.Request(self.endpoint, data=body, headers={
            "Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json",
        })
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                result = json.loads(response.read())
        except (urllib.error.URLError, TimeoutError) as exc:
            raise LLMError("LLM request failed") from exc
        try:
            return json.loads(result["choices"][0]["message"]["content"])
        except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
            raise LLMError("LLM returned invalid JSON") from exc
