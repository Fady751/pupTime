from django.urls import path

from . import views

app_name = "test_voice"

urlpatterns = [
    path("", views.index, name="index"),
    path("analyze/", views.analyze_emotion, name="analyze"),
]
