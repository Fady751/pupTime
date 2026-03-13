from __future__ import annotations

import json
import logging
from typing import Generator, List

from decouple import config
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
from langchain_ollama import ChatOllama

from ..ai_provider import AIProviderError, BaseAIProvider, ChatMessage

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


def _raise_provider_error(error: Exception) -> None:
    raise AIProviderError("The AI provider request failed.") from error


class OllamaProvider(BaseAIProvider):
    def __init__(self) -> None:
        model_name = config("OLLAMA_MODEL", default="mistral:7b-instruct")
        base_url = config("OLLAMA_BASE_URL", default="http://localhost:11434")
        temperature = float(config("OLLAMA_TEMPERATURE", default="0.2"))

        self._llm = ChatOllama(
            model=model_name,
            base_url=base_url,
            temperature=temperature,
        )

    def generate(self, messages: List[ChatMessage]) -> str:
        lc_messages = _to_langchain_messages(messages)
        try:
            response: AIMessage = self._llm.invoke(lc_messages)
        except Exception as error:
            _raise_provider_error(error)
        return response.content

    def stream(self, messages: List[ChatMessage]) -> Generator[str, None, None]:
        lc_messages = _to_langchain_messages(messages)
        try:
            for chunk in self._llm.stream(lc_messages):
                if chunk.content:
                    yield chunk.content
        except Exception as error:
            _raise_provider_error(error)

    def stream_with_tools(self, messages: List[ChatMessage], tools: list) -> Generator[str, None, None]:
        from ..Tools.task_schemas import CreateTaskSchema, DeleteTaskSchema, UpdateTaskSchema

        logger = logging.getLogger(__name__)

        param_validators = {
            "create_task": CreateTaskSchema,
            "update_task": UpdateTaskSchema,
            "delete_task": DeleteTaskSchema,
        }

        lc_messages = _to_langchain_messages(messages)
        llm_with_tools = self._llm.bind_tools(tools)

        max_tool_rounds = 5
        rounds = 0

        while rounds < max_tool_rounds:
            try:
                response = llm_with_tools.invoke(lc_messages)
            except Exception as error:
                _raise_provider_error(error)

            if response.tool_calls:
                tool_map = {t.name: t for t in tools}
                tool_results = []
                respond_to_user_args = None

                for tool_call in response.tool_calls:
                    if tool_call["name"] == "respond_to_user":
                        args = tool_call["args"]
                        if "message" in args:
                            msg_val = args["message"]
                            if isinstance(msg_val, list) and len(msg_val) > 0:
                                first_item = msg_val[0]
                                if isinstance(first_item, dict) and "text" in first_item:
                                    args["message"] = first_item["text"]
                        respond_to_user_args = args
                        continue

                    tool = tool_map.get(tool_call["name"])
                    if tool:
                        try:
                            result = tool.invoke(tool_call["args"])
                        except Exception as exc:
                            result = f"Error executing tool: {exc}"

                        tool_results.append(
                            ToolMessage(content=str(result), tool_call_id=tool_call["id"])
                        )

                if respond_to_user_args is not None:
                    for choice in respond_to_user_args.get("choices", []):
                        for action in choice.get("actions", []):
                            validator = param_validators.get(action.get("action_name"))
                            if validator:
                                try:
                                    validator(**action.get("params", {}))
                                except Exception as exc:
                                    logger.warning(
                                        "AI produced invalid params for %s: %s",
                                        action.get("action_name"),
                                        exc,
                                    )

                    yield json.dumps(respond_to_user_args)
                    return

                if tool_results:
                    lc_messages += [response] + tool_results
                rounds += 1
            else:
                fallback_response = {
                    "message": response.content,
                    "choices": [],
                }
                yield json.dumps(fallback_response)
                break
