import uuid
from django.db import models
from django.conf import settings


class Conversation(models.Model):
    """A chat conversation between a user and the AI assistant"""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='conversations',
    )
    title = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.title or 'Untitled'} ({self.id})"


class Message(models.Model):

    class Role(models.TextChoices):
        USER = 'user', 'User'
        ASSISTANT = 'assistant', 'Assistant'
        SYSTEM = 'system', 'System'

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages',
    )
    role = models.CharField(max_length=10, choices=Role.choices)
    content = models.TextField(blank=True, default='')

    voice_s3_key = models.CharField(
        max_length=512, blank=True, null=True,
        help_text="S3 object key for the voice recording.",
    )
    voice_duration_seconds = models.FloatField(
        null=True, blank=True,
        help_text="Duration of the voice message in seconds.",
    )
    voice_mime_type = models.CharField(
        max_length=50, blank=True, null=True,
        help_text="MIME type of the uploaded voice file (e.g. audio/webm, audio/m4a).",
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        prefix = "🎤 " if self.voice_s3_key else ""
        return f"{prefix}[{self.role}] {self.content[:50]}"


class AIChoice(models.Model):

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='choices',
        help_text="The AI message that proposed this choice."
    )
    choice_id_string = models.CharField(max_length=50, help_text="e.g., 'choice_1'")
    actions_payload = models.JSONField(help_text="The raw actions array proposed by the AI.")
    results_payload = models.JSONField(null=True, blank=True, help_text="The results of the executed actions.")
    is_executed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Choice {self.choice_id_string} for Message {self.message.id} (Executed: {self.is_executed})"

