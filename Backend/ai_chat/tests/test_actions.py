import json
import uuid
from unittest.mock import patch

from django.test import TestCase
from rest_framework.exceptions import ValidationError

from ai_chat.services.chat import ChatService
from ai_chat.utils.actions import execute_action
from task.models import TaskTemplate, TaskOverride
from user.models import User


def _action(action_name, params):
    return {"action_name": action_name, "params": params}


class ExecuteActionCreateTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="actor", email="actor@example.com", password="pw12345678"
        )

    def test_create_minimal_defaults_start_and_emoji(self):
        result = execute_action(self.user, _action("create_TaskTemplate", {"title": "Read"}))

        task = TaskTemplate.objects.get(user=self.user, title="Read")
        self.assertEqual(result["action_name"], "create_TaskTemplate")
        self.assertEqual(result["task_id"], str(task.id))
        self.assertIsNotNone(task.start_datetime)
        self.assertEqual(task.emoji, "📝")

    def test_create_maps_task_name_alias_to_title(self):
        execute_action(self.user, _action("create_TaskTemplate", {"task_name": "Gym"}))
        self.assertTrue(TaskTemplate.objects.filter(user=self.user, title="Gym").exists())

    def test_create_maps_name_alias_to_title(self):
        execute_action(self.user, _action("create_TaskTemplate", {"name": "Walk"}))
        self.assertTrue(TaskTemplate.objects.filter(user=self.user, title="Walk").exists())

    def test_create_uses_requested_task_id(self):
        forced_id = uuid.uuid4()
        execute_action(
            self.user,
            _action("create_TaskTemplate", {"title": "Pinned", "task_id": str(forced_id)}),
        )
        self.assertTrue(TaskTemplate.objects.filter(pk=forced_id, user=self.user).exists())

    def test_create_with_rrule_sets_is_recurring(self):
        execute_action(
            self.user,
            _action(
                "create_TaskTemplate",
                {
                    "title": "Standup",
                    "start_datetime": "2026-03-12T09:00:00Z",
                    "rrule": "FREQ=DAILY;COUNT=3",
                },
            ),
        )
        task = TaskTemplate.objects.get(user=self.user, title="Standup")
        self.assertTrue(task.is_recurring)


class ExecuteActionUpdateTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="actor", email="actor@example.com", password="pw12345678"
        )
        self.task = TaskTemplate.objects.create(
            user=self.user,
            title="Original",
            start_datetime="2026-03-12T10:00:00Z",
            emoji="📝",
        )

    def test_update_changes_title(self):
        execute_action(
            self.user,
            _action("update_TaskTemplate", {"task_id": str(self.task.id), "title": "Renamed"}),
        )
        self.task.refresh_from_db()
        self.assertEqual(self.task.title, "Renamed")

    def test_update_requires_task_id(self):
        with self.assertRaises(ValidationError):
            execute_action(self.user, _action("update_TaskTemplate", {"title": "X"}))

    def test_update_missing_task_raises(self):
        with self.assertRaises(ValidationError):
            execute_action(
                self.user,
                _action("update_TaskTemplate", {"task_id": str(uuid.uuid4()), "title": "X"}),
            )

    def test_update_start_time_only_keeps_date(self):
        execute_action(
            self.user,
            _action("update_TaskTemplate", {"task_id": str(self.task.id), "start_time": "14:30"}),
        )
        self.task.refresh_from_db()
        self.assertEqual(self.task.start_datetime.hour, 14)
        self.assertEqual(self.task.start_datetime.minute, 30)
        self.assertEqual(self.task.start_datetime.day, 12)


class ExecuteActionOverrideTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="actor", email="actor@example.com", password="pw12345678"
        )
        self.task = TaskTemplate.objects.create(
            user=self.user, title="Series", start_datetime="2026-03-12T10:00:00Z"
        )
        self.override = TaskOverride.objects.create(
            task=self.task,
            instance_datetime="2026-03-13T10:00:00Z",
            status=TaskOverride.STATUS_PENDING,
        )

    def test_status_done_maps_to_completed(self):
        execute_action(
            self.user,
            _action("update_TaskOverride", {"instance_id": str(self.override.id), "status": "done"}),
        )
        self.override.refresh_from_db()
        self.assertEqual(self.override.status, TaskOverride.STATUS_COMPLETED)

    def test_override_requires_instance_id(self):
        with self.assertRaises(ValidationError):
            execute_action(self.user, _action("update_TaskOverride", {"status": "done"}))

    def test_reschedule_without_new_datetime_raises(self):
        with self.assertRaises(ValidationError):
            execute_action(
                self.user,
                _action(
                    "update_TaskOverride",
                    {"instance_id": str(self.override.id), "status": "RESCHEDULED"},
                ),
            )

    def test_reschedule_sets_new_datetime_and_status(self):
        execute_action(
            self.user,
            _action(
                "update_TaskOverride",
                {"instance_id": str(self.override.id), "new_datetime": "2026-03-14T15:00:00Z"},
            ),
        )
        self.override.refresh_from_db()
        self.assertEqual(self.override.status, TaskOverride.STATUS_RESCHEDULED)
        self.assertIsNotNone(self.override.new_datetime)


class ExecuteActionDeleteTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="actor", email="actor@example.com", password="pw12345678"
        )
        self.task = TaskTemplate.objects.create(
            user=self.user, title="Doomed", start_datetime="2026-03-12T10:00:00Z"
        )

    def test_delete_soft_deletes(self):
        execute_action(self.user, _action("delete_TaskTemplate", {"task_id": str(self.task.id)}))
        self.task.refresh_from_db()
        self.assertTrue(self.task.is_deleted)

    def test_delete_requires_task_id(self):
        with self.assertRaises(ValidationError):
            execute_action(self.user, _action("delete_TaskTemplate", {}))

    def test_delete_missing_task_raises(self):
        with self.assertRaises(ValidationError):
            execute_action(
                self.user, _action("delete_TaskTemplate", {"task_id": str(uuid.uuid4())})
            )


class ExecuteActionValidationTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="actor", email="actor@example.com", password="pw12345678"
        )

    def test_unsupported_action_raises(self):
        with self.assertRaises(ValidationError):
            execute_action(self.user, _action("frobnicate", {"title": "X"}))

    def test_non_dict_action_raises(self):
        with self.assertRaises(ValidationError):
            execute_action(self.user, ["not", "a", "dict"])

    def test_params_as_json_string_is_parsed(self):
        execute_action(
            self.user,
            {"action_name": "create_TaskTemplate", "params": json.dumps({"title": "FromString"})},
        )
        self.assertTrue(TaskTemplate.objects.filter(user=self.user, title="FromString").exists())

    def test_invalid_json_params_raises(self):
        with self.assertRaises(ValidationError):
            execute_action(self.user, {"action_name": "create_TaskTemplate", "params": "{not json"})

    def test_non_object_params_raises(self):
        with self.assertRaises(ValidationError):
            execute_action(self.user, {"action_name": "create_TaskTemplate", "params": "[1, 2]"})


class ProposeTimeValidationTests(TestCase):
    """Advisory validation at propose-time logs but never blocks (was in the provider)."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="actor", email="actor@example.com", password="pw12345678"
        )

    @patch("ai_chat.services.chat.log_validation_warning")
    def test_valid_params_do_not_warn(self, mock_warn):
        ChatService._validate_action_params(
            "create_TaskTemplate",
            {"title": "X", "start_datetime": "2026-03-12T10:00:00Z", "priority": "medium", "emoji": "📝", "timezone": "UTC"},
            self.user,
        )
        mock_warn.assert_not_called()

    @patch("ai_chat.services.chat.log_validation_warning")
    def test_invalid_params_warn(self, mock_warn):
        ChatService._validate_action_params("create_TaskTemplate", {"title": "X"}, self.user)
        mock_warn.assert_called_once()

    @patch("ai_chat.services.chat.log_validation_warning")
    def test_unknown_action_is_skipped(self, mock_warn):
        ChatService._validate_action_params("frobnicate", {"anything": 1}, self.user)
        mock_warn.assert_not_called()
