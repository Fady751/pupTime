from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User, InterestCategory, Interest, UserInterest, UserReport
from notification.services import push_warning_notification


@admin.register(UserReport)
class UserReportAdmin(admin.ModelAdmin):
    list_display = ('reported_user', 'reporter', 'reason_snippet', 'status', 'action_taken', 'created_at')
    list_filter = ('status', 'action_taken', 'created_at')
    search_fields = ('reported_user__username', 'reporter__username', 'reason')
    readonly_fields = ('reporter', 'reported_user', 'reason', 'created_at')

    actions = ['dismiss_reports', 'warn_reported_users', 'delete_reported_users']

    def reason_snippet(self, obj):
        return obj.reason[:50] + "..." if len(obj.reason) > 50 else obj.reason
    reason_snippet.short_description = 'Reason'

    @admin.action(description="Dismiss selected reports (no action)")
    def dismiss_reports(self, request, queryset):
        updated = queryset.update(status=UserReport.Status.RESOLVED, action_taken=UserReport.ActionTaken.NONE)
        self.message_user(request, f"Successfully dismissed {updated} report(s).")

    @admin.action(description="Warn reported users (send push notification)")
    def warn_reported_users(self, request, queryset):
        warned_count = 0
        for report in queryset.filter(status=UserReport.Status.PENDING):
            reported_user = report.reported_user
            push_warning_notification(reported_user, reported_user.fcm_token, report.reason)
            report.status = UserReport.Status.RESOLVED
            report.action_taken = UserReport.ActionTaken.WARNED
            report.save(update_fields=['status', 'action_taken'])
            warned_count += 1
        self.message_user(request, f"Successfully sent warning push notifications to {warned_count} user(s).")

    @admin.action(description="Delete reported users literally from database")
    def delete_reported_users(self, request, queryset):
        deleted_count = 0
        for report in list(queryset.filter(status=UserReport.Status.PENDING)):
            reported_user = report.reported_user
            # Since reporter and reported_user have ForeignKey CASCADE, deleting the user will delete the report row automatically.
            reported_user.delete()
            deleted_count += 1
        self.message_user(request, f"Successfully deleted {deleted_count} reported user(s) literally.")

    def save_model(self, request, obj, form, change):
        if obj.action_taken != UserReport.ActionTaken.NONE:
            if obj.action_taken == UserReport.ActionTaken.WARNED and obj.status == UserReport.Status.PENDING:
                push_warning_notification(obj.reported_user, obj.reported_user.fcm_token, obj.reason)
            obj.status = UserReport.Status.RESOLVED
        else:
            obj.status = UserReport.Status.PENDING
        super().save_model(request, obj, form, change)




admin.site.register(User, UserAdmin)
admin.site.register(InterestCategory)
admin.site.register(Interest)
admin.site.register(UserInterest)

