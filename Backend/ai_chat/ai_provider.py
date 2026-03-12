"""
AI Provider abstraction layer

To switch providers:
  1. Create a new class that inherits from ``BaseAIProvider``.
  2. Update ``get_ai_provider()`` to return an instance of your new class.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass, field
from typing import Generator, List


@dataclass
class ChatMessage:
    role: str  # "user" | "assistant" | "system"
    content: str


class AIProviderError(Exception):
    """Base exception for AI provider failures."""


class AIProviderRateLimitError(AIProviderError):
    """Raised when the AI provider rejects a request due to quota or rate limits."""

    def __init__(self, message: str, retry_after_seconds: int | None = None) -> None:
        super().__init__(message)
        self.retry_after_seconds = retry_after_seconds


class BaseAIProvider(abc.ABC):

    @abc.abstractmethod
    def generate(self, messages: List[ChatMessage]) -> str:
        """Return the complete AI response for the given conversation"""
        ...

    @abc.abstractmethod
    def stream(self, messages: List[ChatMessage]) -> Generator[str, None, None]:
        """Yield incremental text chunks for a streaming response"""
        ...

    @abc.abstractmethod
    def stream_with_tools(self, messages: List[ChatMessage], tools: list) -> Generator[str, None, None]:
        """Yield the final AI response after resolving any tool calls"""
        ...


_provider_instance: BaseAIProvider | None = None


def get_ai_provider() -> BaseAIProvider:
    """Return the active AI provider (singleton)"""
    global _provider_instance
    if _provider_instance is None:
        from .providers.gemini import GeminiProvider

        _provider_instance = GeminiProvider()
    return _provider_instance
