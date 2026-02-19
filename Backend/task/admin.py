from django.contrib import admin

from .models import Task, TaskRepetition, TaskHistory


class TaskRepetitionInline(admin.TabularInline):
    model = TaskRepetition
    extra = 0


class TaskHistoryInline(admin.TabularInline):
    model = TaskHistory
    extra = 0
    readonly_fields = ('completion_time',)


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'user', 'priority', 'start_time', 'get_completion_count')
    list_filter = ('priority', 'user')
    search_fields = ('title', 'user__username')
    inlines = [TaskRepetitionInline, TaskHistoryInline]

    def get_completion_count(self, obj):
        return obj.history.count()
    get_completion_count.short_description = 'Completions'


@admin.register(TaskRepetition)
class TaskRepetitionAdmin(admin.ModelAdmin):
    list_display = ('task', 'frequency', 'time')
    list_filter = ('frequency',)


@admin.register(TaskHistory)
class TaskHistoryAdmin(admin.ModelAdmin):
    list_display = ('task', 'completion_time')
    list_filter = ('completion_time', 'task__user')
    search_fields = ('task__title', 'task__user__username')
    readonly_fields = ('completion_time',)
