import json
import os
import ssl
import urllib.error
import urllib.request
from typing import Any

import certifi


class LLMError(RuntimeError):
    pass


class LLMProvider:
    """OpenAI-compatible adapter; the agent itself is provider-agnostic."""

    def __init__(self):
        self.api_key = os.getenv("OPENROUTER_API_KEY") or os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("LLM_MODEL", "qwen/qwen3.8-27b:free")
        self.endpoint = os.getenv("LLM_ENDPOINT", "https://openrouter.ai/api/v1/chat/completions")

    @property
    def configured(self) -> bool:
        return bool(self.api_key)

    def json(self, system: str, user: str) -> dict[str, Any]:
        if not self.api_key:
            raise LLMError("LLM provider is not configured")
        body = json.dumps({
            "model": self.model,
            "temperature": 0.1,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}],
        }).encode()
        request = urllib.request.Request(self.endpoint, data=body, headers={
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": os.getenv("OPENROUTER_SITE_URL", "http://localhost:5173"),
            "X-OpenRouter-Title": os.getenv("OPENROUTER_APP_NAME", "Study Buddy"),
        })
        try:
            ssl_context = ssl.create_default_context(cafile=certifi.where())
            with urllib.request.urlopen(request, timeout=60, context=ssl_context) as response:
                result = json.loads(response.read())
        except urllib.error.HTTPError as exc:
            raise LLMError(f"LLM provider rejected the request (HTTP {exc.code})") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            raise LLMError("LLM request failed") from exc
        try:
            content = result["choices"][0]["message"]["content"]
            if not isinstance(content, str):
                raise TypeError("message content is not text")
            cleaned = content.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            return json.loads(cleaned)
        except (KeyError, IndexError, TypeError, json.JSONDecodeError) as exc:
            raise LLMError("LLM returned invalid JSON") from exc
