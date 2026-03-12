import json
from unittest.mock import patch

from django.urls import reverse
from rest_framework.test import APITestCase

from .ai_provider import AIProviderRateLimitError
from .models import AIChoice, Conversation, Message
from task.models import TaskTemplate
from user.models import User


class _RateLimitedProvider:
	def stream_with_tools(self, messages, tools):
		raise AIProviderRateLimitError(
			"Gemini quota exceeded. Please try again in about 46 seconds.",
			retry_after_seconds=46,
		)
		yield from ()


class _ChoiceProvider:
	def stream_with_tools(self, messages, tools):
		yield json.dumps(
			{
				"message": "I can schedule that.",
				"choices": [
					{
						"id": "choice_1",
						"actions": [
							{
								"action_name": "create_task",
								"params": {
									"title": "Play lol with Fady",
									"start_datetime": "2026-03-12T10:00:00Z",
									"priority": "medium",
									"emoji": "🎮",
									"reminder_time": 15,
									"duration_minutes": 180,
									"is_recurring": False,
									"timezone": "Africa/Cairo",
								},
							}
						],
					}
				],
			}
		)


class ChatViewTests(APITestCase):
	def setUp(self):
		self.user = User.objects.create_user(
			username="tester",
			email="tester@example.com",
			password="testpass123",
		)
		self.client.force_authenticate(user=self.user)

	@patch("ai_chat.views.get_task_tools", return_value=[])
	@patch("ai_chat.views.get_ai_provider", return_value=_RateLimitedProvider())
	def test_chat_stream_returns_rate_limit_payload(self, _mock_provider, _mock_tools):
		response = self.client.post(reverse("ai-chat"), {"message": "Hello"}, format="json")

		self.assertEqual(response.status_code, 200)

		body = b"".join(response.streaming_content).decode("utf-8")
		self.assertTrue(body.startswith("data: "))

		payload = json.loads(body.removeprefix("data: ").strip())
		self.assertEqual(payload["error_code"], "rate_limited")
		self.assertEqual(payload["retry_after_seconds"], 46)
		self.assertIn("Gemini quota exceeded", payload["error"])

		conversation = Conversation.objects.get(user=self.user)
		messages = list(conversation.messages.order_by("created_at"))
		self.assertEqual(len(messages), 1)
		self.assertEqual(messages[0].role, Message.Role.USER)
		self.assertEqual(messages[0].content, "Hello")

	@patch("ai_chat.views.get_task_tools", return_value=[])
	@patch("ai_chat.views.get_ai_provider", return_value=_ChoiceProvider())
	def test_chat_stream_persists_ai_choices(self, _mock_provider, _mock_tools):
		response = self.client.post(reverse("ai-chat"), {"message": "Schedule a game session"}, format="json")

		self.assertEqual(response.status_code, 200)
		body = b"".join(response.streaming_content).decode("utf-8")
		self.assertIn('"done": true', body)

		conversation = Conversation.objects.get(user=self.user)
		assistant_message = conversation.messages.get(role=Message.Role.ASSISTANT)
		self.assertEqual(assistant_message.content, "I can schedule that.")

		choice = AIChoice.objects.get(message=assistant_message)
		self.assertEqual(choice.choice_id_string, "choice_1")
		self.assertFalse(choice.is_executed)
		self.assertEqual(choice.actions_payload[0]["action_name"], "create_task")

		conversation_response = self.client.get(
			reverse("ai-conversation-detail", kwargs={"pk": conversation.id})
		)
		self.assertEqual(conversation_response.status_code, 200)
		messages = conversation_response.data["messages"]
		assistant_payload = next(item for item in messages if item["role"] == Message.Role.ASSISTANT)
		self.assertEqual(len(assistant_payload["choices"]), 1)
		self.assertEqual(assistant_payload["choices"][0]["id"], str(choice.id))

	def test_approve_choice_executes_actions_once(self):
		conversation = Conversation.objects.create(user=self.user, title="Approval")
		message = Message.objects.create(
			conversation=conversation,
			role=Message.Role.ASSISTANT,
			content="Pick an option",
		)
		choice = AIChoice.objects.create(
			message=message,
			choice_id_string="choice_1",
			actions_payload=[
				{
					"action_name": "create_task",
					"params": {
						"title": "Play lol with Fady",
						"start_datetime": "2026-03-12T10:00:00Z",
						"priority": "medium",
						"emoji": "🎮",
						"reminder_time": 15,
						"duration_minutes": 180,
						"is_recurring": False,
						"timezone": "Africa/Cairo",
					},
				}
			],
		)

		response = self.client.post(
			reverse("ai-approve-choice"),
			{"choice_id": str(choice.id)},
			format="json",
		)

		self.assertEqual(response.status_code, 200)
		choice.refresh_from_db()
		self.assertTrue(choice.is_executed)

		task = TaskTemplate.objects.get(user=self.user, title="Play lol with Fady")
		self.assertEqual(task.duration_minutes, 180)

		conversation_response = self.client.get(
			reverse("ai-conversation-detail", kwargs={"pk": conversation.id})
		)
		self.assertEqual(conversation_response.status_code, 200)
		assistant_payload = next(
			item for item in conversation_response.data["messages"]
			if item["role"] == Message.Role.ASSISTANT
		)
		self.assertEqual(assistant_payload["choices"], [])

		second_response = self.client.post(
			reverse("ai-approve-choice"),
			{"choice_id": str(choice.id)},
			format="json",
		)
		self.assertEqual(second_response.status_code, 400)

	def test_approve_choice_rejects_other_users_choice(self):
		other_user = User.objects.create_user(
			username="other",
			email="other@example.com",
			password="testpass123",
		)
		conversation = Conversation.objects.create(user=other_user, title="Hidden")
		message = Message.objects.create(
			conversation=conversation,
			role=Message.Role.ASSISTANT,
			content="Hidden choice",
		)
		choice = AIChoice.objects.create(
			message=message,
			choice_id_string="choice_1",
			actions_payload=[],
		)

		response = self.client.post(
			reverse("ai-approve-choice"),
			{"choice_id": str(choice.id)},
			format="json",
		)

		self.assertEqual(response.status_code, 404)
		self.assertEqual(TaskTemplate.objects.filter(user=self.user).count(), 0)
