
from __future__ import annotations

from typing import Generator, List

from decouple import config
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from ..ai_provider import BaseAIProvider, ChatMessage

_ROLE_MAP = {
    "user": HumanMessage,
    "assistant": AIMessage,
    "system": SystemMessage,
}


def _to_langchain_messages(messages: List[ChatMessage]):
    lc_messages = []
    for msg in messages:
        cls = _ROLE_MAP.get(msg.role, HumanMessage)
        lc_messages.append(cls(content=msg.content))
    return lc_messages


class GeminiProvider(BaseAIProvider):

    def __init__(self) -> None:
        api_key = config("GEMINI_API_KEY")
        model_name = config("GEMINI_MODEL", default="gemini-2.0-flash")

        self._llm = ChatGoogleGenerativeAI(
            model=model_name,
            google_api_key=api_key,
            convert_system_message_to_human=True,
        )

    def generate(self, messages: List[ChatMessage]) -> str:
        lc_messages = _to_langchain_messages(messages)
        response: AIMessage = self._llm.invoke(lc_messages)
        return response.content

    def stream(self, messages: List[ChatMessage]) -> Generator[str, None, None]:
        lc_messages = _to_langchain_messages(messages)
        for chunk in self._llm.stream(lc_messages):
            if chunk.content:
                yield chunk.content
