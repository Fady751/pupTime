"""
AI Provider abstraction layer

To switch providers:
  1. Create a new class that inherits from ``BaseAIProvider``.
    2. Register it in ``get_ai_provider()`` and choose it via ``AI_PROVIDER``.
"""

from __future__ import annotations

import abc
from dataclasses import dataclass
from typing import Generator, List

from decouple import config


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
    def stream_with_tools(self, messages: List[ChatMessage], tools: list, user=None) -> Generator[str, None, None]:
        """Yield the final AI response after resolving any tool calls"""
        ...

    def stream_with_tools_and_audio(
        self,
        messages: List[ChatMessage],
        tools: list,
        audio_bytes: bytes,
        audio_mime_type: List[str],
        user=None,
    ) -> Generator[str, None, None]:
        """
        Like stream_with_tools, but the last user message includes audio content.
        Override in providers that support multimodal input (e.g. Gemini).
        """
        raise NotImplementedError(
            f"{self.__class__.__name__} does not support audio input."
        )
    @abc.abstractmethod
    def generate_conversation_title(
        self,
        user_message: str,
        ai_response: str,
        audio_bytes: bytes = None,
        audio_mime_type: str = None,
    ) -> str:
        """Return a custom generated title for the conversation."""
        raise NotImplementedError(
            f"{self.__class__.__name__} does not support conversation title generation."
        )


_provider_instance: BaseAIProvider | None = None


def get_ai_provider() -> BaseAIProvider:
    """Return the active AI provider (singleton)"""
    global _provider_instance
    if _provider_instance is None:
        provider_name = config("AI_PROVIDER", default="gemini").strip().lower()

        if provider_name == "gemini":
            from .providers.gemini import GeminiProvider

            _provider_instance = GeminiProvider()
        elif provider_name == "ollama":
            from .providers.ollama import OllamaProvider

            _provider_instance = OllamaProvider()
        elif provider_name == "lmstudio":
            from .providers.lmstudio import LMStudioProvider

            _provider_instance = LMStudioProvider()
        else:
            raise AIProviderError(
                "Unsupported AI_PROVIDER value. Use 'gemini', 'ollama', or 'lmstudio'."
            )
    return _provider_instance
