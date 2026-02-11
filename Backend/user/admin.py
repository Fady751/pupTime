from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import User, InterestCategory, Interest, UserInterest


admin.site.register(User, UserAdmin)
admin.site.register(InterestCategory)
admin.site.register(Interest)
admin.site.register(UserInterest)
