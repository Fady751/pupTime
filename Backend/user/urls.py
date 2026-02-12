from django.urls import path
from .views import (
    RegisterView, LoginView, UserDetailView,
    InterestListView, InterestCategoryListView, UserInterestsView,
    GoogleAuthView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('register', RegisterView.as_view(), name='register_no_slash'),
    path('login/', LoginView.as_view(), name='login'),
    path('login', LoginView.as_view(), name='login_no_slash'),
    path('auth/google/', GoogleAuthView.as_view(), name='google-auth'),
    path('auth/google', GoogleAuthView.as_view(), name='google-auth_no_slash'),
    path('interests/', InterestListView.as_view(), name='interest-list'),
    path('interests', InterestListView.as_view(), name='interest-list_no_slash'),
    path('interest-categories/', InterestCategoryListView.as_view(), name='interest-category-list'),
    path('interest-categories', InterestCategoryListView.as_view(), name='interest-category-list_no_slash'),
    path('<int:user_id>/', UserDetailView.as_view(), name='user-detail'),
    path('<int:user_id>', UserDetailView.as_view(), name='user-detail_no_slash'),
    path('<int:user_id>/interests/', UserInterestsView.as_view(), name='user-interests'),
    path('<int:user_id>/interests', UserInterestsView.as_view(), name='user-interests_no_slash'),
]