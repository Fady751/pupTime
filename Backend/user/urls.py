from django.urls import path
from .views import RegisterView, LoginView, UserDetailView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('register', RegisterView.as_view(), name='register_no_slash'),
    path('login/', LoginView.as_view(), name='login'),
    path('login', LoginView.as_view(), name='login_no_slash'),
    path('<int:user_id>/', UserDetailView.as_view(), name='user-detail'),
    path('<int:user_id>', UserDetailView.as_view(), name='user-detail_no_slash'),
]