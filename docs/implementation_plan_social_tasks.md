# Implementation Plan: Social Tasks / Group Events (Independent Django App)

This document outlines the architecture for building the "Social Task" feature as an independent Django app (`social_task`). Based on requirements, a "Social Task" acts as a collaborative event (a "Big Task") that is broken down into a single layer of subtasks. Friends can be invited to collaborate and complete these subtasks together.

## 1. App Initialization

Create a new Django app named `social_task`:
```bash
python manage.py startapp social_task
```
Add `'social_task'` to `INSTALLED_APPS` in your `settings.py`.

## 2. Database Model Design (`social_task/models.py`)

Because a "Group Task" behaves very differently from a personal recurring habit (which the core `task` app handles), we will create dedicated, lightweight models for this in the `social_task` app.

### `GroupEvent` (The "Big Task")
The overarching collaborative event.
```python
import uuid
from django.db import models
from user.models import User

class GroupEvent(models.Model):
    VISIBILITY_FRIENDS = 'friends'
    VISIBILITY_PUBLIC = 'public'
    VISIBILITY_CHOICES = [
        (VISIBILITY_FRIENDS, 'Friends Only'),
        (VISIBILITY_PUBLIC, 'Public'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='owned_group_events')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    visibility = models.CharField(max_length=10, choices=VISIBILITY_CHOICES, default=VISIBILITY_FRIENDS)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.title
```

### `EventCollaborator`
Tracks which users have been added to the Group Event and their invitation status.
```python
class EventCollaborator(models.Model):
    STATUS_PENDING = 'pending'
    STATUS_ACCEPTED = 'accepted'
    STATUS_DECLINED = 'declined'
    STATUS_CHOICES = [
        (STATUS_PENDING, 'Pending'),
        (STATUS_ACCEPTED, 'Accepted'),
        (STATUS_DECLINED, 'Declined'),
    ]

    event = models.ForeignKey(GroupEvent, on_delete=models.CASCADE, related_name='collaborators')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='group_event_collaborations')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)
    invited_at = models.DateTimeField(auto_now_add=True)
    responded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ('event', 'user')

    def __str__(self):
        return f"{self.user.username} in {self.event.title} ({self.status})"
```

### `EventSubTask` (The 1-Layer Subtasks)
The individual tasks that make up the Big Task.
```python
class EventSubTask(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event = models.ForeignKey(GroupEvent, on_delete=models.CASCADE, related_name='subtasks')
    title = models.CharField(max_length=255)
    
    # Can be assigned to a specific collaborator, or left blank for anyone to claim
    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_subtasks')
    
    is_completed = models.BooleanField(default=False)
    completed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='completed_subtasks')
    completed_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.title} ({'Done' if self.is_completed else 'Pending'})"
```

## 3. API & Serialization (`social_task/serializers.py`)

1.  **`EventSubTaskSerializer`**: Serializes the subtasks.
2.  **`EventCollaboratorSerializer`**: Serializes the users participating. During creation (sending an invite), validate that the invited user is a `Status.ACCEPTED` friend of the `request.user` (the owner).
3.  **`GroupEventSerializer`**: 
    *   Nests `EventCollaboratorSerializer` (filtering to show only `status='accepted'` in the active list).
    *   Nests `EventSubTaskSerializer` (to show the 1-layer tasks and their completion status).
    *   Can include a computed field for `progress_percentage` (e.g., 2/4 subtasks done = 50%).

## 4. ViewSets & Endpoints (`social_task/views.py`)

### `GroupEventViewSet` (`/social_tasks/events/`)
*   **Queryset**: Users should see `GroupEvent`s where they are the `owner` OR where they exist in the `EventCollaborator` table with `status='accepted'`.
*   **Permissions**: 
    *   Only the `owner` can delete the `GroupEvent` or edit its main title/description.
    *   Both `owner` and `accepted` collaborators can add new `EventSubTask`s to the event.

### `EventCollaboratorViewSet` (`/social_tasks/invites/`)
*   **Actions**:
    *   `GET /`: List all pending invites for `request.user` (where `status='pending'`).
    *   `POST /`: Owner invites a friend to a specific `event_id` (creates a record with `status='pending'`).
    *   `PATCH /<id>/accept/`: The invited user accepts the invite (`status='accepted'`, `responded_at=now`).
    *   `PATCH /<id>/decline/`: The invited user declines the invite (`status='declined'`, `responded_at=now`).

### `EventSubTaskViewSet` (`/social_tasks/events/<event_id>/subtasks/`)
*   **Actions**:
    *   `PATCH /<id>/claim/`: A collaborator assigns the subtask to themselves.
    *   `PATCH /<id>/complete/`: A collaborator marks the subtask as `is_completed=True`, setting `completed_by=request.user` and `completed_at=now`.

### `FeedViewSet` (`/social_tasks/feed/`)
*   **GET**: Retrieves a feed of `GroupEvent`s created by friends.
*   **Query Logic**:
    1. Fetch the `request.user`'s active friends from the `friendship` app.
    2. Query `GroupEvent` where `owner__in=friends_list`.
    3. Return the `GroupEvent`s along with their overall progress (e.g., "Hany is hosting 'Weekend Hackathon' - 3/10 tasks completed").

## 5. Phased Execution Plan for Jules

To ensure a smooth implementation, Jules should execute this plan in the following distinct phases. The user will verify each phase before proceeding to the next.

### **Phase 1: App Initialization & Database Models**
*   **Goal**: Lay the database foundation.
*   **Tasks**:
    1. Run `python manage.py startapp social_task` and add it to `INSTALLED_APPS`.
    2. Write the `GroupEvent`, `EventCollaborator`, and `EventSubTask` models exactly as defined above.
    3. Run `python manage.py makemigrations social_task` and `python manage.py migrate`.
    4. Register all three models in `social_task/admin.py` for easy testing via the Django admin panel.

### **Phase 2: Core Event Management & Subtasks**
*   **Goal**: Allow users to create events and add subtasks.
*   **Tasks**:
    1. Build `GroupEventSerializer` and `EventSubTaskSerializer`.
    2. Implement `GroupEventViewSet` (list, retrieve, create, update, destroy). Ensure the `get_queryset` only returns events the user owns or is an accepted collaborator on.
    3. Implement `EventSubTaskViewSet` with actions to create, update, and specifically the custom `@action` methods for `/claim/` and `/complete/`.
    4. Register these viewsets in `social_task/urls.py` and include them in the main `Backend/PUPtime/urls.py`.

### **Phase 3: The Invitation System**
*   **Goal**: Allow owners to invite friends, and friends to accept/decline.
*   **Tasks**:
    1. Build `EventCollaboratorSerializer` ensuring it validates that invited users are active friends of the owner (check against the `friendship` app).
    2. Implement `EventCollaboratorViewSet` (or custom actions on `GroupEventViewSet`) to handle:
       * Sending an invite (creating an `EventCollaborator` with `status='pending'`).
       * Viewing pending invites (`GET /social_tasks/invites/`).
       * Accepting an invite (`PATCH /social_tasks/invites/<id>/accept/`).
       * Declining an invite (`PATCH /social_tasks/invites/<id>/decline/`).

### **Phase 4: Social Feed & Final Polish**
*   **Goal**: Build the feed so friends can see ongoing group events.
*   **Tasks**:
    1. Create the `FeedViewSet` with a `GET` endpoint.
    2. Write the query to fetch the user's friends from the `friendship` app, then return `GroupEvent`s owned by those friends where visibility is public/friends.
    3. Ensure the serialized feed includes the `progress_percentage` computed field.
    4. Run basic unit tests or manual tests to verify privacy (private events do not show in the feed, non-collaborators cannot edit subtasks).
