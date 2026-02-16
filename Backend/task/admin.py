from django.contrib import admin

from .models import Task, TaskRepetition


class TaskRepetitionInline(admin.TabularInline):
    model = TaskRepetition
    extra = 0


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'status', 'priority', 'start_time')
    list_filter = ('status', 'priority')
    search_fields = ('title',)
    inlines = [TaskRepetitionInline]


@admin.register(TaskRepetition)
class TaskRepetitionAdmin(admin.ModelAdmin):
    list_display = ('task', 'frequency', 'time')
    list_filter = ('frequency',)
