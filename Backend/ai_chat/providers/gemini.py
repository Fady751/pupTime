
from __future__ import annotations

import os
import re
from typing import Generator, List

from decouple import config
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from ..ai_provider import AIProviderError, AIProviderRateLimitError, BaseAIProvider, ChatMessage

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


def _extract_retry_after_seconds(error_message: str) -> int | None:
    patterns = [
        r"Please retry in (?P<seconds>\d+(?:\.\d+)?)s",
        r"'retryDelay': '(?P<seconds>\d+)s'",
    ]
    for pattern in patterns:
        match = re.search(pattern, error_message)
        if match:
            return max(1, round(float(match.group("seconds"))))
    return None


def _raise_provider_error(error: Exception) -> None:
    error_message = str(error)
    if "RESOURCE_EXHAUSTED" in error_message or "429" in error_message or "quota" in error_message.lower():
        retry_after_seconds = _extract_retry_after_seconds(error_message)
        user_message = "Gemini quota exceeded. Please try again shortly or check your Gemini plan and billing details."
        if retry_after_seconds is not None:
            user_message = f"Gemini quota exceeded. Please try again in about {retry_after_seconds} seconds."
        raise AIProviderRateLimitError(user_message, retry_after_seconds=retry_after_seconds) from error
    raise AIProviderError("The AI provider request failed.") from error


class GeminiProvider(BaseAIProvider):

    def __init__(self) -> None:
        project = config("LLM_GCP_PROJECT")
        location = config("LLM_GCP_REGION")
        model_name = config("GEMINI_MODEL", default="gemini-2.5-flash")
        credentials_path = config("LLM_GCP_CREDENTIALS", default=None)

        if credentials_path:
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = credentials_path

        self._llm = ChatVertexAI(
            model_name=model_name,
            project=project,
            location=location,
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
        import json
        import logging
        from ..Tools.task_schemas import CreateTaskTemplateSchema, UpdateTaskTemplateSchema, DeleteTaskTemplateSchema, UpdateTaskOverrideSchema

        logger = logging.getLogger(__name__)

        PARAM_VALIDATORS = {
            "create_TaskTemplate": CreateTaskTemplateSchema,
            "update_TaskTemplate": UpdateTaskTemplateSchema,
            "delete_TaskTemplate": DeleteTaskTemplateSchema,
            "update_TaskOverride": UpdateTaskOverrideSchema,
        }

        lc_messages = _to_langchain_messages(messages)
        tool_defs = []
        for t in tools:
            if hasattr(t, "args_schema") and t.args_schema:
                params_schema = t.args_schema.model_json_schema()
            else:
                params_schema = {"type": "object", "properties": {}}
            
            def strip_additional_properties(schema):
                if isinstance(schema, dict):
                    schema.pop("additionalProperties", None)
                    schema.pop("title", None)
                    for value in schema.values():
                        strip_additional_properties(value)
                elif isinstance(schema, list):
                    for item in schema:
                        strip_additional_properties(item)

            strip_additional_properties(params_schema)

            tool_defs.append({
                "name": t.name,
                "description": t.description,
                "parameters": params_schema
            })

        llm_with_tools = self._llm.bind_tools(tool_defs)

        MAX_TOOL_ROUNDS = 5
        rounds = 0

        while rounds < MAX_TOOL_ROUNDS:
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
                        except Exception as e:
                            result = f"Error executing tool: {e}"

                        tool_results.append(
                            ToolMessage(content=str(result), tool_call_id=tool_call["id"])
                        )

                if respond_to_user_args is not None:
                    for choice in respond_to_user_args.get("choices", []):
                        for action in choice.get("actions", []):
                            validator = PARAM_VALIDATORS.get(action.get("action_name"))
                            if validator:
                                try:
                                    params_to_validate = action.get("params", {})
                                    for alias in ['task_name', 'name']:
                                        if alias in params_to_validate and 'title' not in params_to_validate:
                                            params_to_validate['title'] = params_to_validate.pop(alias)
                                    validator(**params_to_validate)
                                except Exception as e:
                                    logger.warning("AI produced invalid params for %s: %s", action.get("action_name"), e)

                    yield json.dumps(respond_to_user_args)
                    return

                if tool_results:
                    lc_messages += [response] + tool_results
                rounds += 1
            else:
                content = response.content
                if isinstance(content, list):
                    text_parts = []
                    for part in content:
                        if isinstance(part, str):
                            text_parts.append(part)
                        elif isinstance(part, dict) and "text" in part:
                            text_parts.append(part["text"])
                    yield "".join(text_parts)
                else:
                    yield str(content)
                break

