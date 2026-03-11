
from __future__ import annotations

from typing import Generator, List

from decouple import config
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

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

    def stream_with_tools(self, messages: List[ChatMessage], tools: list) -> Generator[str, None, None]:
        lc_messages = _to_langchain_messages(messages)
        llm_with_tools = self._llm.bind_tools(tools)

        MAX_TOOL_ROUNDS = 5
        rounds = 0
        
        while rounds < MAX_TOOL_ROUNDS:
            response = llm_with_tools.invoke(lc_messages)
            if response.tool_calls:
                tool_map = {t.name: t for t in tools}
                tool_results = []

                for tool_call in response.tool_calls:
                    tool = tool_map.get(tool_call["name"])
                    if tool:
                        result = tool.invoke(tool_call["args"])
                        tool_results.append(
                            ToolMessage(content=str(result), tool_call_id=tool_call["id"])
                        )
                lc_messages += [response] + tool_results
                rounds += 1
            else:
                for chunk in llm_with_tools.stream(lc_messages):
                    content = chunk.content
                    if content:
                        yield content if isinstance(content, str) else str(content)
                break

