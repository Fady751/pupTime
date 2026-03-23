import json
import logging
import uuid
from datetime import timedelta
from typing import Any, Dict, List, Optional, Tuple

from django.db import transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import ValidationError

from .ai_provider import AIProviderRateLimitError, ChatMessage, get_ai_provider
from .Tools.task_tools import get_task_tools
from .models import AIChoice, Conversation, Message
from .serializers import MessageSerializer
from task.models import TaskTemplate, TaskOverride
from task.serializers import TaskSerializer
from task.views import _parse_iso

logger = logging.getLogger(__name__)

class ChatService:
    @staticmethod
    def get_or_create_conversation(user, conversation_id: Optional[str] = None, user_text: str = "") -> Conversation:
        if conversation_id:
            try:
                return Conversation.objects.get(pk=conversation_id, user=user)
            except Conversation.DoesNotExist:
                raise ValidationError({'detail': 'Conversation not found.'}, code=status.HTTP_404_NOT_FOUND)
        
        title = user_text[:80]
        return Conversation.objects.create(user=user, title=title)

    @staticmethod
    def save_user_message(conversation: Conversation, content: str) -> Message:
        return Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            content=content,
        )

    @staticmethod
    def prepare_chat_messages(conversation: Conversation) -> List[ChatMessage]:
        history = list(
            conversation.messages.order_by('created_at').values_list('role', 'content')
        )
        current_time = timezone.now().isoformat()
        
        system_prompt = ChatMessage(
            role='system',
            content=(
                f"You are 'PUP', a helpful personal task manager assistant. "
                f"The current date and time is {current_time}. "
                f"Use `get_today_tasks` as your first action if the user asks about today or wants to change a task for today. "
                f"Use `get_tasks` to look up tasks if you need IDs — NEVER ask the user for an ID, fetch it yourself using tools. "
                f"Use `find_free_time` to check for gaps or resolve scheduling conflicts. \n"
                f"Before proposing a NEW task, ALWAYS check for potential conflicts by calling `get_tasks` (or `get_today_tasks` if for today) for the requested time range. If a conflict is found, inform the user and ask how to proceed. \n"
                f"Fetch user interests and timezone with `get_user_preferences`. "
                f"When proposing task changes, YOU MUST use the `respond_to_user` tool with `choices`. "
                f"Distinguish between PERMANENT changes and SINGLE-DAY changes: \n"
                f"1. FOR PERMANENT / BULK CHANGES — keywords: 'all', 'every', 'always', 'from now on', 'all future', 'all overrides', 'all tasks': "
                f"Use `update_TaskTemplate` with the `Master Task ID`. If you don't have it, call `get_tasks` to find it. NEVER ask the user for the ID. \n"
                f"2. FOR SINGLE-DAY / ONE-TIME CHANGES — keywords: 'today only', 'just this time', 'this one', 'this instance': "
                f"Use `update_TaskOverride` with the `Occurrence ID`. If you don't have it, call `get_today_tasks` or `get_tasks` to find it. NEVER ask the user for the ID. \n"
                f"3. FOR NEW TASKS: Use `create_TaskTemplate`. You MUST include 'emoji', 'priority', and 'timezone' inside the 'params' object. Provide an EXACT ISO 8601 `start_datetime` for the FIRST instance. If the task is recurring, set `is_recurring` to `true` and provide an `rrule`. If the user wants it to start 'today', use today's date. \n"
                f"To update ONLY the time of a task, use `start_time` (e.g. '14:30:00') in `update_TaskTemplate`. \n"
                f"4. DURATION: If the user didn't specify a duration, suggest a reasonable one based on the task type (e.g., Gym = 60 mins, Walk = 30 mins). State your suggestion in the message. \n"
                f"IMPORTANT FOR IDS: \n"
                f"- `Master Task ID` is for `update_TaskTemplate` and `delete_TaskTemplate`. \n"
                f"- `Occurrence ID` is ONLY for `update_TaskOverride`. \n"
                f"- NEVER swap these. NEVER invent an ID. NEVER ask the user for an ID — use tools to find them. \n"
                f"AI CONTEXT: \n"
                f"- You will see 'Executed AI Choice' messages in history if your previous proposal was approved. Use this to confirm the current state without re-asking."
            ),
        )
        return [system_prompt] + [ChatMessage(role=r, content=c) for r, c in history]

    @staticmethod
    def get_ai_response_stream(user, chat_messages: List[ChatMessage]):
        provider = get_ai_provider()
        tools = get_task_tools(user)
        return provider.stream_with_tools(chat_messages, tools)

    @classmethod
    def process_ai_response(cls, conversation: Conversation, full_response: str, user) -> Message:
        parsed = None
        try:
            parsed = json.loads(full_response)
            saved_content = parsed.get('message', full_response) if isinstance(parsed, dict) else full_response
        except (json.JSONDecodeError, TypeError):
            saved_content = full_response

        with transaction.atomic():
            assistant_message = Message.objects.create(
                conversation=conversation,
                role=Message.Role.ASSISTANT,
                content=saved_content,
            )

            if isinstance(parsed, dict):
                raw_choices = [
                    c for c in (parsed.get('choices') or [])
                    if isinstance(c, dict)
                ]
                if raw_choices:
                    choice_objects = []
                    for c in raw_choices:
                        actions_payload = c.get('actions_payload') or c.get('actions') or []
                        choice_id = None

                        if isinstance(actions_payload, list):
                            for action in actions_payload:
                                if not isinstance(action, dict):
                                    continue
                                action_name = action.get('action_name')
                                params = action.get('params') or {}
                                
                                if isinstance(params, str):
                                    try:
                                        params = json.loads(params)
                                    except (json.JSONDecodeError, TypeError):
                                        params = {}
                                
                                # Standardize field names
                                for alias in ['task_name', 'name']:
                                    if alias in params and 'title' not in params:
                                        params['title'] = params.pop(alias)
                                        break
                                
                                task_snapshot, extracted_choice_id = cls.build_task_snapshot(action_name, params, user)
                                if extracted_choice_id:
                                    choice_id = extracted_choice_id
                                
                                if task_snapshot:
                                    action['task_snapshot'] = task_snapshot

                        choice_id_str = str(c.get('choice_id_string') or c.get('id', ''))
                        
                        # Use provided ID if it's a valid UUID
                        provided_id = c.get('id')
                        try:
                            if provided_id and str(uuid.UUID(provided_id)) == provided_id:
                                if choice_id is None:
                                    choice_id = uuid.UUID(provided_id)
                        except (TypeError, ValueError):
                            pass

                        choice_kwargs = {
                            'message': assistant_message,
                            'choice_id_string': choice_id_str,
                            'actions_payload': actions_payload,
                        }
                        if choice_id is not None:
                            choice_kwargs['id'] = choice_id

                        choice_objects.append(AIChoice(**choice_kwargs))
                    AIChoice.objects.bulk_create(choice_objects)
        
        return assistant_message

    @staticmethod
    def build_task_snapshot(action_name: str, params: Dict[str, Any], user) -> Tuple[Optional[Dict[str, Any]], Optional[uuid.UUID]]:
        task_snapshot = None
        choice_id = None
        print("==================================================================")
        print("action_name", action_name)
        print("params", params)
        print("user", user)
        print("==================================================================")
        if action_name == 'create_TaskTemplate':
            if params.get('task_id'):
                try:
                    choice_id = uuid.UUID(str(params['task_id']))
                except (TypeError, ValueError):
                    choice_id = None
            
            preview_overrides = []
            try:
                from dateutil.rrule import rrulestr as _rrulestr
                from task.views import _parse_iso as _pi
                start_dt = _pi(params.get('start_datetime'))
                if start_dt:
                    now = timezone.now()
                    end_preview = now + timedelta(days=30)
                    rrule_str = params.get('rrule')
                    if params.get('is_recurring') and rrule_str:
                        rule = _rrulestr(rrule_str, dtstart=start_dt.replace(microsecond=0))
                        search_start = now if now > start_dt else start_dt
                        instances = rule.between(search_start.replace(microsecond=0), end_preview, inc=True)
                        preview_overrides = [
                            {'date': dt.isoformat(), 'status': 'PENDING'}
                            for dt in instances
                        ]
                    else:
                        if start_dt >= now and start_dt <= end_preview:
                            preview_overrides = [{'date': start_dt.isoformat(), 'status': 'PENDING'}]
                        else:
                            preview_overrides = []
            except Exception:
                preview_overrides = []

            task_snapshot = {
                'id': str(choice_id) if choice_id else params.get('task_id'),
                'title': params.get('title'),
                'emoji': params.get('emoji', '📝'),
                'priority': params.get('priority', 'none'),
                'start_datetime': params.get('start_datetime'),
                'duration_minutes': params.get('duration_minutes'),
                'reminder_time': params.get('reminder_time'),
                'is_recurring': params.get('is_recurring', False),
                'rrule': params.get('rrule'),
                'timezone': params.get('timezone', 'UTC'),
                'overrides': preview_overrides,
            }

        elif action_name in ('update_TaskTemplate', 'delete_TaskTemplate'):
            task_id = (
                params.get('task_id')
                or params.get('master_task_id')
                or params.get('id')
            )
            if task_id:
                try:
                    from task.models import TaskTemplate
                    from task.serializers import TaskSerializer
                    from .views import ApproveAIChoiceView # Import inside to avoid circular if needed or move context helper
                    
                    task = TaskTemplate.objects.get(
                        pk=task_id, user=user, is_deleted=False
                    )
                    # We need the context from ApproveAIChoiceView._one_month_serializer_context()
                    # To avoid circular import, we can redefine it or pass it.
                    # Since it's static and simple:
                    now = timezone.now()
                    context = {
                        'start_date': now,
                        'end_date': now + timedelta(days=30),
                    }

                    task_snapshot = TaskSerializer(task, context=context).data

                    if action_name == 'update_TaskTemplate':
                        for k, v in params.items():
                            if k in task_snapshot and k not in ('id', 'master_task_id', 'task_id'):
                                task_snapshot[k] = v
                        
                        if 'rrule' in params or 'start_time' in params or 'start_datetime' in params:
                            try:
                                import datetime as _dt
                                from dateutil.rrule import rrulestr as _rrulestr
                                from task.views import _parse_iso as _pi
                                
                                if 'start_time' in params and task_snapshot.get('start_datetime'):
                                    try:
                                        _new_time = _dt.time.fromisoformat(params['start_time'])
                                        _orig_dt = _pi(task_snapshot['start_datetime'])
                                        _new_dt = _orig_dt.replace(hour=_new_time.hour, minute=_new_time.minute, second=_new_time.second)
                                        task_snapshot['start_datetime'] = _new_dt.isoformat()
                                    except Exception:
                                        pass
                                        
                                start_dt = _pi(task_snapshot.get('start_datetime'))
                                if start_dt:
                                    now = timezone.now()
                                    end_preview = now + timedelta(days=30)
                                    rrule_str = task_snapshot.get('rrule')
                                    if task_snapshot.get('is_recurring') and rrule_str:
                                        rule = _rrulestr(rrule_str, dtstart=start_dt.replace(microsecond=0))
                                        search_start = now if now > start_dt else start_dt
                                        instances = rule.between(search_start.replace(microsecond=0), end_preview, inc=True)
                                        task_snapshot['overrides'] = [
                                            {'date': dt.isoformat(), 'status': 'PENDING'}
                                            for dt in instances
                                        ]
                                    else:
                                        if start_dt >= now and start_dt <= end_preview:
                                            task_snapshot['overrides'] = [{'date': start_dt.isoformat(), 'status': 'PENDING'}]
                                        else:
                                            task_snapshot['overrides'] = []
                            except Exception:
                                pass
                except Exception:
                    task_snapshot = None

        elif action_name == 'update_TaskOverride':
            instance_id = (
                params.get('instance_id')
                or params.get('occurrence_id')
                or params.get('id')
            )
            new_datetime = params.get('new_datetime') or params.get('start_datetime')
            requested_status = params.get('status')

            if instance_id:
                try:
                    from task.models import TaskOverride
                    from task.serializers import TaskSerializer
                    now = timezone.now()
                    context = {
                        'start_date': now - timedelta(days=1),
                        'end_date': now + timedelta(days=30),
                    }
                    override = TaskOverride.objects.get(
                        pk=instance_id, task__user=user, is_deleted=False
                    )
                    task_snapshot = TaskSerializer(
                        override.task,
                        context=context
                    ).data

                    if isinstance(requested_status, str):
                        requested_status = requested_status.upper()
                        if requested_status == 'DONE':
                            requested_status = TaskOverride.STATUS_COMPLETED

                    if task_snapshot and new_datetime:
                        parsed_dt = _parse_iso(new_datetime)
                        if parsed_dt:
                            new_status = requested_status or TaskOverride.STATUS_PENDING
                            old_dt = override.instance_datetime
                            updated_overrides = []
                            found_new = False

                            for ov in task_snapshot.get('overrides', []):
                                ov_dt = _parse_iso(ov.get('instance_datetime'))
                                if ov_dt == old_dt:
                                    ov['status'] = TaskOverride.STATUS_RESCHEDULED
                                    ov['new_datetime'] = parsed_dt.isoformat()
                                if ov_dt == parsed_dt:
                                    ov['status'] = new_status
                                    found_new = True
                                updated_overrides.append(ov)

                            if not found_new:
                                updated_overrides.append({
                                    'instance_datetime': parsed_dt.isoformat(),
                                    'status': new_status,
                                })

                            task_snapshot['overrides'] = updated_overrides
                    elif task_snapshot and requested_status:
                        old_dt = override.instance_datetime
                        updated_overrides = []
                        for ov in task_snapshot.get('overrides', []):
                            ov_dt = _parse_iso(ov.get('instance_datetime'))
                            if ov_dt == old_dt:
                                ov['status'] = requested_status
                            updated_overrides.append(ov)
                        task_snapshot['overrides'] = updated_overrides
                except Exception:
                    task_snapshot = None
                    
        if task_snapshot is not None:
            if 'overrides' in task_snapshot:
                cleaned_overrides = []
                for ov in task_snapshot['overrides']:
                    if 'date' in ov:
                        cleaned = {'date': ov['date'], 'status': ov.get('status')}
                    else:
                        cleaned = {'date': ov.get('instance_datetime'), 'status': ov.get('status')}
                    if ov.get('status') == 'RESCHEDULED' and ov.get('new_datetime'):
                        cleaned['new_datetime'] = ov.get('new_datetime')
                    cleaned_overrides.append(cleaned)
                task_snapshot['overrides'] = cleaned_overrides
        
        return task_snapshot, choice_id
