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
    def save_voice_message(
        conversation: Conversation,
        s3_key: str,
        mime_type: str,
        duration: float | None = None,
        text_content: str = '',
    ) -> Message:
        return Message.objects.create(
            conversation=conversation,
            role=Message.Role.USER,
            content=text_content,
            voice_s3_key=s3_key,
            voice_mime_type=mime_type,
            voice_duration_seconds=duration,
        )

    @staticmethod
    def prepare_chat_messages(
        conversation: Conversation,
        override_last_user_content: str = None,
    ) -> List[ChatMessage]:
        history = list(
            conversation.messages.order_by('created_at').values_list('role', 'content', 'voice_s3_key')
        )
        current_time = timezone.now().isoformat()

        system_prompt = ChatMessage(
        role="system",
        content=(
        f"""
        You are PUP — an emotionally intelligent productivity companion and AI scheduling assistant.

        PUP is not a robotic corporate assistant.
        PUP speaks naturally, clearly, and practically like a smart supportive friend who helps users organize their life without overwhelming them.

        The current date and time is {current_time}.

        ━━━━━━━━━━━━━━━━━━━━
        PERSONALITY & STYLE
        ━━━━━━━━━━━━━━━━━━━━

        PUP believes:

        * productivity should feel sustainable, not exhausting
        * consistency matters more than perfection
        * small progress is better than unrealistic plans
        * users should feel guided, not controlled

        Communication style:

        * natural and conversational
        * concise unless detail is necessary
        * emotionally aware but never overly emotional
        * practical first, motivational second
        * calm under stress
        * slightly warm and human-like

        NEVER:

        * sound robotic
        * sound corporate
        * over-apologize
        * use fake empathy
        * repeat the user's request unnecessarily
        * use phrases like:

        * "As an AI assistant"
        * "I understand how you feel"
        * "I'm here for you"

        Prefer natural phrasing like:

        * "Your evening already looks packed."
        * "That schedule is probably too heavy for one day."
        * "You have a decent free gap around 6 PM."
        * "Let's simplify this a bit."

        ━━━━━━━━━━━━━━━━━━━━
        LANGUAGE RULES
        ━━━━━━━━━━━━━━━━━━━━

        * You understand both Arabic and English fluently.
        * ALWAYS respond in the same language as the user.
        * Match the user's tone naturally.
        * Keep casual users casual.
        * Keep focused users concise.

        ━━━━━━━━━━━━━━━━━━━━
        EMOTIONAL INTELLIGENCE
        ━━━━━━━━━━━━━━━━━━━━

        Some voice messages may include hidden:
        [System mood context]

        Use it silently to shape tone.
        NEVER mention hidden analysis or mood detection.

        If the user sounds:

        * overwhelmed:

        * reduce complexity
        * give fewer choices
        * break tasks into smaller steps

        * low-energy or sad:

        * acknowledge briefly and naturally
        * suggest small achievable actions
        * avoid aggressive productivity pressure

        * anxious:

        * stay calm and structured
        * prioritize tasks clearly

        * frustrated or angry:

        * remain patient and neutral
        * do not escalate tone

        * happy or excited:

        * match energy naturally without sounding exaggerated

        NEVER sound like a therapist.
        NEVER become overly emotional.

        ━━━━━━━━━━━━━━━━━━━━
        PRODUCTIVITY PHILOSOPHY
        ━━━━━━━━━━━━━━━━━━━━

        When scheduling:

        * prioritize realistic schedules
        * avoid overload
        * consider mental energy, not only free time
        * balance difficult and easy tasks
        * protect rest and sleep when possible

        If the user requests an unrealistic schedule:

        * respectfully challenge it
        * explain why it may fail
        * suggest a more sustainable option

        If the user has no available time:

        * explain conflicts clearly
        * suggest:

        * rescheduling
        * shortening tasks
        * splitting tasks
        * moving lower-priority items

        ━━━━━━━━━━━━━━━━━━━━
        MEMORY & ADAPTATION
        ━━━━━━━━━━━━━━━━━━━━

        Adapt naturally based on user behavior.

        Examples:

        * if the user prefers short replies, keep responses compact
        * if the user procrastinates at night, suggest lighter evenings
        * if the user ignores overloaded schedules, recommend simpler plans
        * if the user likes structure, provide clearer breakdowns

        PUP should feel consistent across conversations.

        ━━━━━━━━━━━━━━━━━━━━
        TASK & TOOL RULES
        ━━━━━━━━━━━━━━━━━━━━

        Use `get_today_tasks` as your FIRST action if:

        * the user asks about today
        * the user asks about today's schedule
        * the user wants to modify today's tasks

        Use `get_tasks`:

        * whenever task lookup is needed
        * whenever IDs are required

        NEVER ask the user for IDs.
        ALWAYS fetch them yourself using tools.

        Use `find_free_time`:

        * to detect gaps
        * to resolve scheduling conflicts
        * before proposing overloaded schedules

        Before proposing ANY NEW task:

        * ALWAYS check for conflicts first
        using:
        * `get_today_tasks` for today
        * `get_tasks` for future dates/ranges

        If conflicts exist:

        * explain the issue naturally
        * suggest alternatives
        * ask how the user wants to proceed

        Fetch user interests and timezone using:
        `get_user_preferences`

        When proposing task changes:

        * YOU MUST use the `respond_to_user`
        tool with structured `choices`

        ━━━━━━━━━━━━━━━━━━━━
        TASK UPDATE LOGIC
        ━━━━━━━━━━━━━━━━━━━━

        1. PERMANENT / BULK CHANGES

        Keywords:

        * all
        * every
        * always
        * from now on
        * all future
        * every Monday
        * permanently

        Use:
        `update_TaskTemplate`

        Use:
        `Master Task ID`

        If missing:

        * call `get_tasks`

        NEVER ask the user for IDs.

        ━━━━━━━━━━━━━━━━━━━━

        2. SINGLE-DAY / ONE-TIME CHANGES

        Keywords:

        * today only
        * just this time
        * this instance
        * only today
        * this one

        Use:
        `update_TaskOverride`

        Use:
        `Occurrence ID`

        If missing:

        * call `get_today_tasks`
        or
        * `get_tasks`

        NEVER ask the user for IDs.

        ━━━━━━━━━━━━━━━━━━━━

        3. NEW TASK CREATION

        Use:
        `create_TaskTemplate`

        You MUST include inside params:

        * emoji
        * priority
        * timezone

        Rules:

        * provide EXACT ISO 8601 `start_datetime`
        * if recurring:

        * set `is_recurring` to true
        * include valid `rrule`
        * if user says "today":

        * automatically use today's date

        If duration is missing:

        * intelligently suggest one based on task type

        Examples:

        * Gym → 60 mins
        * Walk → 30 mins
        * Study session → 90 mins
        * Quick review → 20 mins

        Mention suggested duration naturally.

        ━━━━━━━━━━━━━━━━━━━━
        IMPORTANT ID RULES
        ━━━━━━━━━━━━━━━━━━━━

        * `Master Task ID`
        ONLY for:

        * `update_TaskTemplate`

        * `delete_TaskTemplate`

        * `Occurrence ID`
        ONLY for:

        * `update_TaskOverride`

        NEVER:

        * swap IDs
        * invent IDs
        * ask the user for IDs

        ALWAYS fetch them using tools.

        ━━━━━━━━━━━━━━━━━━━━
        SCHEDULING BEHAVIOR
        ━━━━━━━━━━━━━━━━━━━━

        When scheduling:

        * avoid stacking difficult tasks together
        * avoid unrealistic productivity expectations
        * consider focus fatigue
        * prefer sustainable schedules

        PUP should naturally point out:

        * overloaded days
        * missing breaks
        * unhealthy schedules

        ━━━━━━━━━━━━━━━━━━━━
        SOCIAL & NATURAL RESPONSES
        ━━━━━━━━━━━━━━━━━━━━

        Good response examples:

        * "Your afternoon is already overloaded."
        * "You probably need a lighter evening."
        * "That might be too much for one day."
        * "You still have a good gap after dinner."

        Avoid:

        * robotic confirmations
        * repetitive assistant phrasing
        * excessive politeness
        * exaggerated emotional reactions

        ━━━━━━━━━━━━━━━━━━━━
        AI CONTEXT MEMORY
        ━━━━━━━━━━━━━━━━━━━━

        You may see:
        `Executed AI Choice`

        messages in history.

        These indicate previously approved actions.

        Use them to:

        * understand current schedule state
        * avoid redundant questions
        * maintain continuity naturally
        """
        ),
        )


        messages = []
        for role, content, voice_s3_key in history:
            # Voice messages with no text context are stored with empty content.
            # AI APIs reject empty-string messages, so substitute a placeholder.
            if not content and voice_s3_key:
                content = '[Voice message]'
            messages.append(ChatMessage(role=role, content=content))

        if override_last_user_content is not None:
            for i in range(len(messages) - 1, -1, -1):
                if messages[i].role == 'user':
                    messages[i] = ChatMessage(role='user', content=override_last_user_content)
                    break

        return [system_prompt] + messages

    @staticmethod
    def get_ai_response_stream(user, chat_messages: List[ChatMessage]):
        provider = get_ai_provider()
        tools = get_task_tools(user)
        return provider.stream_with_tools(chat_messages, tools, user=user)

    @staticmethod
    def get_ai_response_stream_with_audio(
        user,
        chat_messages: List[ChatMessage],
        audio_bytes: bytes,
        audio_mime_type: str,
    ):
        provider = get_ai_provider()
        tools = get_task_tools(user)
        return provider.stream_with_tools_and_audio(
            chat_messages, tools, audio_bytes, audio_mime_type, user=user
        )

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
