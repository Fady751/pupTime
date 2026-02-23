from django.contrib import admin

from .models import TaskTemplate, TaskOverride


class TaskOverrideInline(admin.TabularInline):
    model = TaskOverride
    extra = 0
    readonly_fields = ('created_at', 'updated_at')


@admin.register(TaskTemplate)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'priority', 'start_datetime', 'is_recurring', 'is_deleted')
    list_filter = ('priority', 'is_recurring', 'is_deleted', 'user')
    search_fields = ('title', 'user__username')
    inlines = [TaskOverrideInline]


@admin.register(TaskOverride)
class TaskOverrideAdmin(admin.ModelAdmin):
    list_display = ('task', 'instance_datetime', 'status', 'is_deleted')
    list_filter = ('status', 'is_deleted', 'task__user')
    search_fields = ('task__title', 'task__user__username')
    readonly_fields = ('created_at', 'updated_at')
