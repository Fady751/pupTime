
from __future__ import annotations

import base64
import os
import re
from typing import Generator, List

from decouple import config
from langchain_google_vertexai import ChatVertexAI
from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

from ..ai_provider import AIProviderError, AIProviderRateLimitError, BaseAIProvider, ChatMessage
from ..ai_logger import (
    log_ai_request, log_tool_call, log_tool_result, log_tool_error,
    log_respond_to_user, log_validation_warning, log_ai_final_text,
    log_rate_limit, log_max_rounds_reached,
)

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


def _build_tool_defs(tools: list) -> list:
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
    return tool_defs


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

    # ── Core tool-calling loop (shared by text and audio) ───────────────────

    def _run_tool_loop(
        self,
        lc_messages: list,
        tools: list,
        user=None,
    ) -> Generator[str, None, None]:
        """
        Invoke the LLM with tools bound, handle tool calls in a loop,
        and yield the final response. Shared by stream_with_tools and
        stream_with_tools_and_audio.
        """
        import json
        import logging
        from ..Tools.task_schemas import (
            CreateTaskTemplateSchema, UpdateTaskTemplateSchema,
            DeleteTaskTemplateSchema, UpdateTaskOverrideSchema,
        )

        logger = logging.getLogger(__name__)

        PARAM_VALIDATORS = {
            "create_TaskTemplate": CreateTaskTemplateSchema,
            "update_TaskTemplate": UpdateTaskTemplateSchema,
            "delete_TaskTemplate": DeleteTaskTemplateSchema,
            "update_TaskOverride": UpdateTaskOverrideSchema,
        }

        tool_defs = _build_tool_defs(tools)
        llm_with_tools = self._llm.bind_tools(tool_defs)

        MAX_TOOL_ROUNDS = 5
        rounds = 0

        while rounds < MAX_TOOL_ROUNDS:
            try:
                response = llm_with_tools.invoke(lc_messages)
            except Exception as error:
                try:
                    _raise_provider_error(error)
                except AIProviderRateLimitError as rle:
                    log_rate_limit(rle.retry_after_seconds, user=user)
                    raise
                except Exception:
                    raise

            if response.tool_calls:
                tool_map = {t.name: t for t in tools}
                tool_results = []
                respond_to_user_args = None

                for call_idx, tool_call in enumerate(response.tool_calls):
                    tool_name = tool_call["name"]
                    tool_args = tool_call["args"]

                    if tool_name == "respond_to_user":
                        if "message" in tool_args:
                            msg_val = tool_args["message"]
                            if isinstance(msg_val, list) and len(msg_val) > 0:
                                first_item = msg_val[0]
                                if isinstance(first_item, dict) and "text" in first_item:
                                    tool_args["message"] = first_item["text"]
                        respond_to_user_args = tool_args
                        log_respond_to_user(tool_args, user=user)
                        continue

                    log_tool_call(tool_name, tool_args, call_idx, user=user)

                    tool = tool_map.get(tool_name)
                    if tool:
                        try:
                            result = tool.invoke(tool_args)
                            log_tool_result(tool_name, str(result), user=user)
                        except Exception as e:
                            result = f"Error executing tool: {e}"
                            log_tool_error(tool_name, str(e), user=user)

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
                                    log_validation_warning(action.get("action_name", "?"), str(e), user=user)

                    yield json.dumps(respond_to_user_args)
                    return

                if tool_results:
                    lc_messages += [response] + tool_results
                rounds += 1

                if rounds >= MAX_TOOL_ROUNDS:
                    log_max_rounds_reached(rounds, user=user)
            else:
                content = response.content
                if isinstance(content, list):
                    text_parts = []
                    for part in content:
                        if isinstance(part, str):
                            text_parts.append(part)
                        elif isinstance(part, dict) and "text" in part:
                            text_parts.append(part["text"])
                    final_text = "".join(text_parts)
                else:
                    final_text = str(content)

                log_ai_final_text(final_text, user=user)
                yield final_text
                break

    # ── Public methods ──────────────────────────────────────────────────────

    def stream_with_tools(self, messages: List[ChatMessage], tools: list, user=None) -> Generator[str, None, None]:
        lc_messages = _to_langchain_messages(messages)

        # Log the start of this AI request
        user_text = ""
        for m in reversed(messages):
            if m.role == "user":
                user_text = m.content
                break
        log_ai_request(user_text, round_num=1, user=user)

        yield from self._run_tool_loop(lc_messages, tools, user=user)

    def stream_with_tools_and_audio(
        self,
        messages: List[ChatMessage],
        tools: list,
        audio_bytes: bytes,
        audio_mime_type: str,
        user=None,
    ) -> Generator[str, None, None]:
        """
        Same as stream_with_tools, but the last user message is multimodal:
        it includes the audio content alongside any text for Gemini's native
        audio understanding.
        """
        # Build all messages EXCEPT the last user message
        lc_messages = []
        last_user_text = ""
        history = list(messages)

        # Find last user message
        last_user_idx = None
        for i in range(len(history) - 1, -1, -1):
            if history[i].role == "user":
                last_user_idx = i
                last_user_text = history[i].content
                break

        # Convert messages, replacing the last user message with multimodal
        for i, msg in enumerate(history):
            if i == last_user_idx:
                text_instruction = last_user_text or "Listen to this voice message and respond appropriately."
                audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

                lc_messages.append(HumanMessage(content=[
                    {"type": "text", "text": text_instruction},
                    {
                        "type": "audio",
                        "source_type": "base64",
                        "data": audio_b64,
                        "mime_type": audio_mime_type,
                    },
                ]))
            else:
                cls = _ROLE_MAP.get(msg.role, HumanMessage)
                # Gemini throws `400 Unable to submit request` if any message part is empty.
                text_content = msg.content.strip() if msg.content else ""
                if not text_content:
                    text_content = "(Voice message without text)"
                lc_messages.append(cls(content=text_content))

        log_ai_request(f"[VOICE] {last_user_text or '(audio only)'}", round_num=1, user=user)

        yield from self._run_tool_loop(lc_messages, tools, user=user)
    def generate_conversation_title(
        self,
        user_message: str,
        ai_response: str,
        audio_bytes: bytes = None,
        audio_mime_type: str = None,
    ) -> str:
        prompt_instruction = (
            "You are a helpful assistant. Generate a concise, 3-5 word title for a chat conversation "
            "based on the following exchange. Return ONLY the title without quotes or punctuation."
        )

        lc_messages = [SystemMessage(content=prompt_instruction)]

        if audio_bytes and audio_mime_type:
            audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")
            
            user_text = user_message or "(Voice message without text)"
            lc_messages.append(
                HumanMessage(content=[
                    {
                        "type": "text", 
                        "text": f"User: {user_text}\n\nAI: {ai_response}"
                    },
                    {
                        "type": "audio",
                        "source_type": "base64",
                        "data": audio_b64,
                        "mime_type": audio_mime_type,
                    },
                ])
            )
        else:
            lc_messages.append(
                HumanMessage(content=f"User: {user_message}\n\nAI: {ai_response}")
            )
        try:
            response = self._llm.invoke(lc_messages)
            return response.content.strip()
        except Exception as error:
            return "New Chat"

