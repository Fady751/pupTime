import json
from unittest.mock import patch

from django.urls import reverse
from rest_framework.test import APITestCase

from .ai_provider import AIProviderRateLimitError
from .models import Conversation, Message
from user.models import User


class _RateLimitedProvider:
	def stream_with_tools(self, messages, tools):
		raise AIProviderRateLimitError(
			"Gemini quota exceeded. Please try again in about 46 seconds.",
			retry_after_seconds=46,
		)
		yield from ()


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
