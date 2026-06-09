from datetime import timedelta
from unittest.mock import MagicMock, patch

from django.test import TestCase
from django.utils import timezone

from ai_chat.models import UserMemory
from friendship.models import Friendship, Status
from task.models import TaskOverride, TaskTemplate
from user.models import User


def _make_user(username):
    return User.objects.create_user(
        username=username, email=f"{username}@example.com", password="pw12345678"
    )


def _accept_friendship(a, b):
    Friendship.objects.create(sender=a, receiver=b, status=Status.ACCEPTED)


class LoadParticipantDataTests(TestCase):
    def setUp(self):
        self.user = _make_user("alice")
        self.now = timezone.now()
        self.end = self.now + timedelta(days=7)

    def _load(self):
        from ai_chat.services.schedule_negotiation import _load_participant_data
        return _load_participant_data(self.user, self.now, self.end)

    def test_username_in_result(self):
        data = self._load()
        self.assertEqual(data["username"], "alice")

    def test_no_tasks_returns_empty_schedule(self):
        self.assertEqual(self._load()["schedule"], [])

    def test_task_in_window_appears(self):
        task = TaskTemplate.objects.create(
            user=self.user, title="Meeting",
            start_datetime=self.now + timedelta(hours=2),
            duration_minutes=60,
        )
        TaskOverride.objects.create(
            task=task,
            instance_datetime=self.now + timedelta(hours=2),
            status=TaskOverride.STATUS_PENDING,
        )
        data = self._load()
        self.assertEqual(len(data["schedule"]), 1)
        self.assertIn("Meeting", data["schedule"][0])

    def test_skipped_task_excluded(self):
        task = TaskTemplate.objects.create(
            user=self.user, title="Skipped",
            start_datetime=self.now + timedelta(hours=2),
        )
        TaskOverride.objects.create(
            task=task,
            instance_datetime=self.now + timedelta(hours=2),
            status=TaskOverride.STATUS_SKIPPED,
        )
        self.assertEqual(self._load()["schedule"], [])

    def test_failed_task_excluded(self):
        task = TaskTemplate.objects.create(
            user=self.user, title="Failed",
            start_datetime=self.now + timedelta(hours=2),
        )
        TaskOverride.objects.create(
            task=task,
            instance_datetime=self.now + timedelta(hours=2),
            status=TaskOverride.STATUS_FAILED,
        )
        self.assertEqual(self._load()["schedule"], [])

    def test_memory_included_in_preferences(self):
        UserMemory.objects.create(
            user=self.user, fact_content="prefers mornings",
            category="preference", importance_score=5,
        )
        data = self._load()
        self.assertEqual(len(data["preferences"]), 1)
        self.assertIn("prefers mornings", data["preferences"][0])

    def test_no_memories_returns_empty_preferences(self):
        self.assertEqual(self._load()["preferences"], [])


class NegotiateScheduleTests(TestCase):
    def setUp(self):
        self.initiator = _make_user("alice")
        self.friend = _make_user("bob")
        _accept_friendship(self.initiator, self.friend)

    def _run(self, **kwargs):
        from ai_chat.services.schedule_negotiation import negotiate_schedule
        return negotiate_schedule(self.initiator, [self.friend.id], "Dinner", 60, **kwargs)

    @patch("ai_chat.services.schedule_negotiation.get_ai_provider")
    def test_find_mode_returns_slots(self, mock_get):
        mock_get.return_value.generate.return_value = (
            '{"mode": "find", "slots": ['
            '{"datetime": "2026-06-10T18:00:00Z", "reason": "Both free"}]}'
        )
        result = self._run()
        self.assertEqual(result["mode"], "find")
        self.assertEqual(len(result["slots"]), 1)
        self.assertEqual(result["slots"][0]["datetime"], "2026-06-10T18:00:00Z")

    @patch("ai_chat.services.schedule_negotiation.get_ai_provider")
    def test_validate_mode_possible(self, mock_get):
        mock_get.return_value.generate.return_value = (
            '{"mode": "validate", "possible": true, "reason": "Clear for both"}'
        )
        result = self._run(preferred_datetime="2026-06-10T18:00:00Z")
        self.assertEqual(result["mode"], "validate")
        self.assertTrue(result["possible"])

    @patch("ai_chat.services.schedule_negotiation.get_ai_provider")
    def test_validate_mode_not_possible(self, mock_get):
        mock_get.return_value.generate.return_value = (
            '{"mode": "validate", "possible": false, "reason": "Bob has a task"}'
        )
        result = self._run(preferred_datetime="2026-06-10T14:00:00Z")
        self.assertFalse(result["possible"])
        self.assertIn("Bob", result["reason"])

    @patch("ai_chat.services.schedule_negotiation.get_ai_provider")
    def test_non_friend_id_excluded_from_prompt(self, mock_get):
        mock_get.return_value.generate.return_value = '{"mode": "find", "slots": []}'
        stranger = _make_user("stranger")
        from ai_chat.services.schedule_negotiation import negotiate_schedule
        negotiate_schedule(self.initiator, [stranger.id], "Dinner", 60)
        prompt = mock_get.return_value.generate.call_args[0][0][0].content
        self.assertNotIn("stranger", prompt)

    @patch("ai_chat.services.schedule_negotiation.get_ai_provider")
    def test_friend_included_in_prompt(self, mock_get):
        mock_get.return_value.generate.return_value = '{"mode": "find", "slots": []}'
        self._run()
        prompt = mock_get.return_value.generate.call_args[0][0][0].content
        self.assertIn("bob", prompt)

    @patch("ai_chat.services.schedule_negotiation.get_ai_provider")
    def test_malformed_response_returns_error_mode(self, mock_get):
        mock_get.return_value.generate.return_value = "Sorry, I cannot help."
        result = self._run()
        self.assertEqual(result["mode"], "error")

    @patch("ai_chat.services.schedule_negotiation.get_ai_provider")
    def test_markdown_wrapped_json_is_parsed(self, mock_get):
        mock_get.return_value.generate.return_value = (
            "```json\n"
            '{"mode": "find", "slots": [{"datetime": "2026-06-10T18:00:00Z", "reason": "ok"}]}'
            "\n```"
        )
        result = self._run()
        self.assertEqual(result["mode"], "find")

    @patch("ai_chat.services.schedule_negotiation.get_ai_provider")
    def test_custom_search_window_passed_to_prompt(self, mock_get):
        mock_get.return_value.generate.return_value = '{"mode": "find", "slots": []}'
        from ai_chat.services.schedule_negotiation import negotiate_schedule
        start = timezone.now()
        end = start + timedelta(days=3)
        negotiate_schedule(self.initiator, [self.friend.id], "Dinner", 60,
                           search_start=start, search_end=end)
        prompt = mock_get.return_value.generate.call_args[0][0][0].content
        self.assertIn(end.strftime("%Y-%m-%d"), prompt)


class GetFriendsToolTests(TestCase):
    def setUp(self):
        self.user = _make_user("alice")
        self.bob = _make_user("bob")
        self.carol = _make_user("carol")

    def _tools(self):
        from ai_chat.Tools.task_tools import get_task_tools
        return {t.name: t for t in get_task_tools(self.user)}

    def test_get_friends_in_tool_list(self):
        self.assertIn("get_friends", self._tools())

    def test_returns_accepted_sender_side(self):
        _accept_friendship(self.user, self.bob)
        result = self._tools()["get_friends"].invoke({})
        self.assertIn("bob", result)

    def test_returns_accepted_receiver_side(self):
        _accept_friendship(self.carol, self.user)
        result = self._tools()["get_friends"].invoke({})
        self.assertIn("carol", result)

    def test_excludes_pending_friendship(self):
        Friendship.objects.create(sender=self.user, receiver=self.bob, status=Status.PENDING)
        result = self._tools()["get_friends"].invoke({})
        self.assertNotIn("bob", result)

    def test_no_friends_returns_helpful_message(self):
        result = self._tools()["get_friends"].invoke({})
        self.assertIn("no", result.lower())

    def test_returns_friend_id(self):
        _accept_friendship(self.user, self.bob)
        result = self._tools()["get_friends"].invoke({})
        self.assertIn(str(self.bob.id), result)


class RequestCollaborativeScheduleToolTests(TestCase):
    def setUp(self):
        self.user = _make_user("alice")
        self.bob = _make_user("bob")
        _accept_friendship(self.user, self.bob)

    def _tool(self):
        from ai_chat.Tools.task_tools import get_task_tools
        tools = {t.name: t for t in get_task_tools(self.user)}
        return tools["request_collaborative_schedule"]

    def test_tool_in_list(self):
        from ai_chat.Tools.task_tools import get_task_tools
        self.assertIn(
            "request_collaborative_schedule",
            {t.name for t in get_task_tools(self.user)},
        )

    @patch("ai_chat.services.schedule_negotiation.get_ai_provider")
    def test_find_mode_returns_formatted_string(self, mock_get):
        mock_get.return_value.generate.return_value = (
            '{"mode": "find", "slots": ['
            '{"datetime": "2026-06-10T18:00:00Z", "reason": "Both free"}]}'
        )
        result = self._tool().invoke({
            "friend_ids": [self.bob.id],
            "duration_minutes": 60,
            "title": "Dinner",
        })
        self.assertIsInstance(result, str)
        self.assertIn("2026-06-10", result)

    @patch("ai_chat.services.schedule_negotiation.get_ai_provider")
    def test_validate_possible_returns_yes(self, mock_get):
        mock_get.return_value.generate.return_value = (
            '{"mode": "validate", "possible": true, "reason": "All clear"}'
        )
        result = self._tool().invoke({
            "friend_ids": [self.bob.id],
            "duration_minutes": 60,
            "title": "Dinner",
            "preferred_datetime": "2026-06-10T18:00:00Z",
        })
        self.assertIn("Yes", result)

    @patch("ai_chat.services.schedule_negotiation.get_ai_provider")
    def test_validate_not_possible_returns_no(self, mock_get):
        mock_get.return_value.generate.return_value = (
            '{"mode": "validate", "possible": false, "reason": "Bob is busy"}'
        )
        result = self._tool().invoke({
            "friend_ids": [self.bob.id],
            "duration_minutes": 60,
            "title": "Dinner",
            "preferred_datetime": "2026-06-10T14:00:00Z",
        })
        self.assertIn("No", result)

    @patch("ai_chat.services.schedule_negotiation.get_ai_provider")
    def test_no_slots_found_returns_message(self, mock_get):
        mock_get.return_value.generate.return_value = '{"mode": "find", "slots": []}'
        result = self._tool().invoke({
            "friend_ids": [self.bob.id],
            "duration_minutes": 60,
            "title": "Dinner",
        })
        self.assertIn("No suitable", result)
