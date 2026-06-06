from django.contrib import admin
from .models import SocialTask, SocialTaskParticipant, SocialTaskNodeTask


@admin.register(SocialTask)
class SocialTaskAdmin(admin.ModelAdmin):
    list_display = ['title', 'initiator', 'status', 'scheduled_at', 'parent', 'is_deleted']
    list_filter = ['status', 'is_deleted']
    raw_id_fields = ['parent', 'initiator']


@admin.register(SocialTaskParticipant)
class SocialTaskParticipantAdmin(admin.ModelAdmin):
    list_display = ['social_task', 'user', 'status', 'rsvp_at']
    list_filter = ['status']


@admin.register(SocialTaskNodeTask)
class SocialTaskNodeTaskAdmin(admin.ModelAdmin):
    list_display = ['node', 'participant', 'task']
    raw_id_fields = ['node', 'participant', 'task']
