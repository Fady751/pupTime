"""
Tests for POST /ai/chat/voice/upload/

This endpoint is the HTTP half of the AI loop. Its only job is:
  1. Validate and convert the audio file
  2. Run acoustic analysis
  3. Upload to S3
  4. Persist a voice Message in the DB
  5. Return { voice_message_id, conversation_id }

It must NOT call the AI — that is the WebSocket consumer's job.
"""
import io
from unittest.mock import patch

from django.urls import reverse
from rest_framework.test import APITestCase

from ai_chat.models import Conversation, Message
from user.models import User

UPLOAD_URL = 'ai-voice-upload'
FAKE_S3_KEY = 'voice/test/fake.mp3'
FAKE_AUDIO = b'\xff\xfb\x90\x00' * 256  # minimal fake mp3 bytes


def _fake_audio_file(content=FAKE_AUDIO, name='test.mp3', content_type='audio/mp3'):
    f = io.BytesIO(content)
    f.name = name
    f.content_type = content_type
    return f


class VoiceUploadAuthTests(APITestCase):
    def test_unauthenticated_returns_401(self):
        response = self.client.post(reverse(UPLOAD_URL), {}, format='multipart')
        self.assertEqual(response.status_code, 401)


class VoiceUploadValidationTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='uploader', email='uploader@example.com', password='pass123'
        )
        self.client.force_authenticate(user=self.user)

    def test_missing_audio_returns_400(self):
        response = self.client.post(reverse(UPLOAD_URL), {}, format='multipart')
        self.assertEqual(response.status_code, 400)

    def test_unsupported_format_returns_400(self):
        audio = _fake_audio_file(name='test.txt', content_type='text/plain')
        response = self.client.post(reverse(UPLOAD_URL), {'audio': audio}, format='multipart')
        self.assertEqual(response.status_code, 400)

    def test_file_too_large_returns_413(self):
        big_audio = _fake_audio_file(
            content=b'\x00' * (11 * 1024 * 1024),
            name='big.mp3',
            content_type='audio/mp3',
        )
        response = self.client.post(reverse(UPLOAD_URL), {'audio': big_audio}, format='multipart')
        self.assertEqual(response.status_code, 413)


class VoiceUploadSuccessTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='uploader', email='uploader@example.com', password='pass123'
        )
        self.client.force_authenticate(user=self.user)

    def _post_voice(self, extra=None):
        audio = _fake_audio_file()
        payload = {'audio': audio}
        if extra:
            payload.update(extra)
        with (
            patch('subprocess.run'),
            patch('ai_chat.views.upload_voice_file', return_value=FAKE_S3_KEY),
            patch('ai_chat.views.analyze_audio', return_value={}),
            patch('ai_chat.views.classify_mood', return_value={'ai_hint': 'calm'}),
        ):
            return self.client.post(reverse(UPLOAD_URL), payload, format='multipart')

    def test_returns_200_with_ids(self):
        response = self._post_voice()
        self.assertEqual(response.status_code, 200)
        self.assertIn('voice_message_id', response.data)
        self.assertIn('conversation_id', response.data)

    def test_creates_message_in_db(self):
        response = self._post_voice()
        self.assertEqual(response.status_code, 200)
        msg = Message.objects.get(pk=response.data['voice_message_id'])
        self.assertEqual(msg.voice_s3_key, FAKE_S3_KEY)
        self.assertEqual(msg.role, Message.Role.USER)

    def test_does_not_call_ai(self):
        with patch('ai_chat.views.get_ai_provider') as mock_provider:
            self._post_voice()
            mock_provider.assert_not_called()

    def test_stores_acoustic_hint_on_message(self):
        response = self._post_voice()
        self.assertEqual(response.status_code, 200)
        msg = Message.objects.get(pk=response.data['voice_message_id'])
        self.assertEqual(msg.voice_acoustic_hint, 'calm')

    def test_creates_new_conversation_when_none_provided(self):
        response = self._post_voice()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(Conversation.objects.filter(user=self.user).count(), 1)

    def test_uses_existing_conversation_when_id_provided(self):
        existing = Conversation.objects.create(user=self.user, title='Existing')
        response = self._post_voice(extra={'conversation_id': str(existing.id)})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(str(response.data['conversation_id']), str(existing.id))
        self.assertEqual(Conversation.objects.filter(user=self.user).count(), 1)
