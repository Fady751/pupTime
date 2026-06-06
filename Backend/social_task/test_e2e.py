"""
End-to-end tests for the social_task feature.
Uses LiveServerTestCase + requests — every call is a real HTTP request
against a live Django server, exactly like Postman.
"""
import requests
from datetime import datetime, timedelta, timezone

from django.test import LiveServerTestCase
from rest_framework.authtoken.models import Token

from friendship.models import Friendship, Status as FriendshipStatus
from social_task.models import SocialTask
from user.models import User


def _future(days=1):
    return (datetime.now(tz=timezone.utc) + timedelta(days=days)).isoformat()


class SocialTaskE2E(LiveServerTestCase):
    """
    14 scenarios covering the full social task lifecycle.
    Each test is a self-contained story.
    """

    def setUp(self):
        self.alice = User.objects.create_user('alice', 'alice@e2e.com', 'password123')
        self.bob   = User.objects.create_user('bob',   'bob@e2e.com',   'password123')
        self.charlie = User.objects.create_user('charlie', 'charlie@e2e.com', 'password123')

        self.tok_alice   = Token.objects.create(user=self.alice).key
        self.tok_bob     = Token.objects.create(user=self.bob).key
        self.tok_charlie = Token.objects.create(user=self.charlie).key

        Friendship.objects.create(
            sender=self.alice, receiver=self.bob, status=FriendshipStatus.ACCEPTED
        )

    # ------------------------------------------------------------------
    # HTTP helpers
    # ------------------------------------------------------------------

    def _h(self, token):
        return {'Authorization': f'Token {token}'}

    def GET(self, path, token):
        return requests.get(f'{self.live_server_url}{path}', headers=self._h(token))

    def POST(self, path, token, body=None):
        return requests.post(f'{self.live_server_url}{path}', json=body or {}, headers=self._h(token))

    def PATCH(self, path, token, body):
        return requests.patch(f'{self.live_server_url}{path}', json=body, headers=self._h(token))

    def DELETE(self, path, token):
        return requests.delete(f'{self.live_server_url}{path}', headers=self._h(token))

    # ------------------------------------------------------------------
    # Scenarios
    # ------------------------------------------------------------------

    def test_01_happy_path_invite_accept_confirm(self):
        """Alice creates task → invites Bob → Bob accepts → confirmed → both get personal tasks."""

        # --- create ---
        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'Gym session',
            'duration_minutes': 60,
            'scheduled_at': _future(1),
            'participant_ids': [self.bob.id],
        })
        self.assertEqual(r.status_code, 201, r.text)
        task_id = r.json()['id']
        self.assertEqual(r.json()['status'], 'draft')

        # --- invite appears in Bob's inbox ---
        r = self.GET('/social-task/invites/', self.tok_bob)
        self.assertEqual(r.status_code, 200)
        self.assertIn(task_id, [t['id'] for t in r.json()['results']])

        # --- Bob accepts ---
        r = self.POST(f'/social-task/{task_id}/accept/', self.tok_bob)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()['status'], 'confirmed')

        # --- detail shows confirmed + my_tasks for each user ---
        r = self.GET(f'/social-task/{task_id}/', self.tok_alice)
        self.assertEqual(r.json()['status'], 'confirmed')
        self.assertEqual(len(r.json()['my_tasks']), 1, 'alice missing personal task')

        r = self.GET(f'/social-task/{task_id}/', self.tok_bob)
        self.assertEqual(len(r.json()['my_tasks']), 1, 'bob missing personal task')

        # --- invite inbox is now empty ---
        r = self.GET('/social-task/invites/', self.tok_bob)
        self.assertEqual(len(r.json()['results']), 0)

    def test_02_sub_tasks_in_create_body(self):
        """Create with 2 timed sub-tasks → Bob accepts → 2 personal tasks each."""

        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'Project',
            'duration_minutes': 120,
            'participant_ids': [self.bob.id],
            'sub_tasks': [
                {'title': 'Design', 'duration_minutes': 60, 'scheduled_at': _future(1)},
                {'title': 'Build',  'duration_minutes': 60, 'scheduled_at': _future(2)},
            ],
        })
        self.assertEqual(r.status_code, 201, r.text)
        task_id = r.json()['id']
        self.assertEqual(len(r.json()['sub_tasks']), 2)

        self.POST(f'/social-task/{task_id}/accept/', self.tok_bob)

        r = self.GET(f'/social-task/{task_id}/', self.tok_alice)
        self.assertEqual(len(r.json()['my_tasks']), 2, 'alice should have 2 personal tasks')

        r = self.GET(f'/social-task/{task_id}/', self.tok_bob)
        self.assertEqual(len(r.json()['my_tasks']), 2, 'bob should have 2 personal tasks')

    def test_03_untimed_sub_task_generates_no_personal_task(self):
        """1 timed sub + 1 untimed sub → 1 personal task per person (not 2)."""

        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'Project',
            'duration_minutes': 120,
            'participant_ids': [self.bob.id],
            'sub_tasks': [
                {'title': 'Timed',   'duration_minutes': 60, 'scheduled_at': _future(1)},
                {'title': 'Untimed', 'duration_minutes': 60},
            ],
        })
        task_id = r.json()['id']
        self.POST(f'/social-task/{task_id}/accept/', self.tok_bob)

        r = self.GET(f'/social-task/{task_id}/', self.tok_alice)
        self.assertEqual(len(r.json()['my_tasks']), 1)

        r = self.GET(f'/social-task/{task_id}/', self.tok_bob)
        self.assertEqual(len(r.json()['my_tasks']), 1)

    def test_04_decline_keeps_task_in_draft(self):
        """Bob declines → participant_status=declined → task stays draft."""

        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'Coffee',
            'duration_minutes': 30,
            'participant_ids': [self.bob.id],
        })
        task_id = r.json()['id']

        r = self.POST(f'/social-task/{task_id}/decline/', self.tok_bob)
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json()['participant_status'], 'declined')

        r = self.GET(f'/social-task/{task_id}/', self.tok_alice)
        self.assertEqual(r.json()['status'], 'draft')

    def test_05_cancel_returns_204_and_hides_from_lists(self):
        """Alice confirms then cancels → 204 → task gone from both users' lists."""

        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'Run',
            'duration_minutes': 45,
            'scheduled_at': _future(1),
            'participant_ids': [self.bob.id],
        })
        task_id = r.json()['id']
        self.POST(f'/social-task/{task_id}/accept/', self.tok_bob)

        r = self.DELETE(f'/social-task/{task_id}/', self.tok_alice)
        self.assertEqual(r.status_code, 204, r.text)

        for tok in [self.tok_alice, self.tok_bob]:
            ids = [t['id'] for t in self.GET('/social-task/', tok).json()['results']]
            self.assertNotIn(task_id, ids)

    def test_06_reschedule_propagates_to_personal_tasks(self):
        """Alice reschedules confirmed task → TaskTemplate start_datetime updated in DB."""
        from django.utils.dateparse import parse_datetime

        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'Meeting',
            'duration_minutes': 30,
            'scheduled_at': _future(1),
            'participant_ids': [self.bob.id],
        })
        task_id = r.json()['id']
        self.POST(f'/social-task/{task_id}/accept/', self.tok_bob)

        new_dt = _future(5)
        r = self.PATCH(f'/social-task/{task_id}/', self.tok_alice, {'scheduled_at': new_dt})
        self.assertEqual(r.status_code, 200, r.text)

        task = SocialTask.objects.get(id=task_id)
        for participant in task.participants.all():
            nt = participant.node_tasks.filter(task__is_deleted=False).first()
            self.assertIsNotNone(nt, f"{participant.user.username} has no personal task after reschedule")
            self.assertEqual(nt.task.start_datetime, parse_datetime(new_dt))

    def test_07_add_sub_task_endpoint_creates_personal_tasks_immediately(self):
        """Confirmed task → POST /sub-tasks/ with scheduled_at → personal task created at once."""

        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'Project',
            'duration_minutes': 120,
            'participant_ids': [self.bob.id],
        })
        task_id = r.json()['id']
        self.POST(f'/social-task/{task_id}/accept/', self.tok_bob)

        r = self.POST(f'/social-task/{task_id}/sub-tasks/', self.tok_alice, {
            'title': 'Kickoff',
            'duration_minutes': 60,
            'scheduled_at': _future(3),
        })
        self.assertEqual(r.status_code, 201, r.text)

        r = self.GET(f'/social-task/{task_id}/', self.tok_alice)
        self.assertEqual(len(r.json()['my_tasks']), 1, 'alice missing personal task for new sub-task')

        r = self.GET(f'/social-task/{task_id}/', self.tok_bob)
        self.assertEqual(len(r.json()['my_tasks']), 1, 'bob missing personal task for new sub-task')

    def test_08_participant_can_view_detail(self):
        """Bob (invitee, not yet accepted) can GET detail."""

        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'Lunch',
            'duration_minutes': 60,
            'participant_ids': [self.bob.id],
        })
        task_id = r.json()['id']

        r = self.GET(f'/social-task/{task_id}/', self.tok_bob)
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.json()['title'], 'Lunch')

    def test_09_non_participant_gets_403(self):
        """Charlie (not involved) gets 403 on detail and 0 results on list."""

        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'Secret meeting',
            'duration_minutes': 30,
            'participant_ids': [self.bob.id],
        })
        task_id = r.json()['id']

        self.assertEqual(self.GET(f'/social-task/{task_id}/', self.tok_charlie).status_code, 403)
        self.assertEqual(len(self.GET('/social-task/', self.tok_charlie).json()['results']), 0)

    def test_10_non_initiator_cannot_cancel(self):
        """Bob tries to DELETE Alice's task → 403."""

        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'Gym',
            'duration_minutes': 60,
            'participant_ids': [self.bob.id],
        })
        task_id = r.json()['id']

        r = self.DELETE(f'/social-task/{task_id}/', self.tok_bob)
        self.assertEqual(r.status_code, 403)

    def test_11_cannot_invite_non_friend(self):
        """Charlie is not Alice's friend → 400 with participant_ids error."""

        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'x',
            'duration_minutes': 10,
            'participant_ids': [self.charlie.id],
        })
        self.assertEqual(r.status_code, 400)
        self.assertIn('participant_ids', r.json())

    def test_12_cannot_nest_sub_task_under_sub_task(self):
        """Depth > 1 returns 400."""

        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'Root',
            'duration_minutes': 60,
            'sub_tasks': [{'title': 'Child', 'duration_minutes': 30}],
        })
        task_id = r.json()['id']
        sub_id = str(SocialTask.objects.filter(parent_id=task_id).first().id)

        r = self.POST(f'/social-task/{sub_id}/sub-tasks/', self.tok_alice, {
            'title': 'Grandchild',
            'duration_minutes': 15,
        })
        self.assertEqual(r.status_code, 400)

    def test_13_unauthenticated_requests_are_rejected(self):
        """No token → 401 on list and create."""

        self.assertEqual(requests.get(f'{self.live_server_url}/social-task/').status_code, 401)
        self.assertEqual(
            requests.post(f'{self.live_server_url}/social-task/', json={}).status_code, 401
        )

    def test_14_confirms_only_when_last_participant_accepts(self):
        """Alice + Bob + Charlie → Bob accepts (still draft) → Charlie accepts → confirmed."""

        Friendship.objects.create(
            sender=self.alice, receiver=self.charlie, status=FriendshipStatus.ACCEPTED
        )

        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'Team meeting',
            'duration_minutes': 60,
            'scheduled_at': _future(1),
            'participant_ids': [self.bob.id, self.charlie.id],
        })
        task_id = r.json()['id']

        # Bob accepts — still draft (Charlie hasn't)
        self.POST(f'/social-task/{task_id}/accept/', self.tok_bob)
        r = self.GET(f'/social-task/{task_id}/', self.tok_alice)
        self.assertEqual(r.json()['status'], 'draft')

        # Charlie accepts — now confirmed
        self.POST(f'/social-task/{task_id}/accept/', self.tok_charlie)
        r = self.GET(f'/social-task/{task_id}/', self.tok_alice)
        self.assertEqual(r.json()['status'], 'confirmed')

        # All 3 have personal tasks
        for tok in [self.tok_alice, self.tok_bob, self.tok_charlie]:
            r = self.GET(f'/social-task/{task_id}/', tok)
            self.assertEqual(len(r.json()['my_tasks']), 1, 'user missing personal task')

    def test_15_invite_friend_after_creation_draft(self):
        """Alice creates task with Bob → invites Charlie via /invite/ → both accept → confirmed."""
        Friendship.objects.create(
            sender=self.alice, receiver=self.charlie, status=FriendshipStatus.ACCEPTED
        )

        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'Camping trip',
            'duration_minutes': 120,
            'scheduled_at': _future(2),
            'participant_ids': [self.bob.id],
        })
        self.assertEqual(r.status_code, 201)
        task_id = r.json()['id']

        r = self.POST(f'/social-task/{task_id}/invite/', self.tok_alice, {
            'participant_ids': [self.charlie.id],
        })
        self.assertEqual(r.status_code, 200, r.text)
        participant_users = [p['user']['username'] for p in r.json()['participants']]
        self.assertIn('charlie', participant_users)

        # Bob accepts — still draft (Charlie pending)
        self.POST(f'/social-task/{task_id}/accept/', self.tok_bob)
        r = self.GET(f'/social-task/{task_id}/', self.tok_alice)
        self.assertEqual(r.json()['status'], 'draft')

        # Charlie accepts — confirmed
        self.POST(f'/social-task/{task_id}/accept/', self.tok_charlie)
        r = self.GET(f'/social-task/{task_id}/', self.tok_alice)
        self.assertEqual(r.json()['status'], 'confirmed')

    def test_16_invite_after_confirmed_creates_personal_tasks_on_accept(self):
        """Solo task (auto-confirmed) → invite Bob → task stays confirmed → Bob accepts → Bob gets personal tasks."""
        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'Study session',
            'duration_minutes': 60,
            'scheduled_at': _future(1),
        })
        self.assertEqual(r.status_code, 201)
        task_id = r.json()['id']
        self.assertEqual(r.json()['status'], 'confirmed')

        r = self.POST(f'/social-task/{task_id}/invite/', self.tok_alice, {
            'participant_ids': [self.bob.id],
        })
        self.assertEqual(r.status_code, 200, r.text)

        # Task stays confirmed
        r = self.GET(f'/social-task/{task_id}/', self.tok_alice)
        self.assertEqual(r.json()['status'], 'confirmed')

        # Bob has no personal tasks yet
        r = self.GET(f'/social-task/{task_id}/', self.tok_bob)
        self.assertEqual(len(r.json()['my_tasks']), 0)

        self.POST(f'/social-task/{task_id}/accept/', self.tok_bob)

        # Bob now has personal task, task still confirmed
        r = self.GET(f'/social-task/{task_id}/', self.tok_bob)
        self.assertEqual(len(r.json()['my_tasks']), 1)
        r = self.GET(f'/social-task/{task_id}/', self.tok_alice)
        self.assertEqual(r.json()['status'], 'confirmed')

    def test_17_invite_non_friend_rejected(self):
        """Inviting a non-friend after creation → 400."""
        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'Private meeting',
            'duration_minutes': 30,
        })
        task_id = r.json()['id']

        r = self.POST(f'/social-task/{task_id}/invite/', self.tok_alice, {
            'participant_ids': [self.charlie.id],
        })
        self.assertEqual(r.status_code, 400)
        self.assertIn('participant_ids', r.json())

    def test_18_invite_by_non_initiator_rejected(self):
        """Non-initiator cannot invite → 403."""
        r = self.POST('/social-task/', self.tok_alice, {
            'title': "Alice's task",
            'duration_minutes': 30,
            'participant_ids': [self.bob.id],
        })
        task_id = r.json()['id']

        Friendship.objects.create(
            sender=self.bob, receiver=self.charlie, status=FriendshipStatus.ACCEPTED
        )
        r = self.POST(f'/social-task/{task_id}/invite/', self.tok_bob, {
            'participant_ids': [self.charlie.id],
        })
        self.assertEqual(r.status_code, 403)

    def test_19_invite_already_participant_rejected(self):
        """Inviting someone already in the task → 400."""
        r = self.POST('/social-task/', self.tok_alice, {
            'title': 'Double invite test',
            'duration_minutes': 30,
            'participant_ids': [self.bob.id],
        })
        task_id = r.json()['id']

        r = self.POST(f'/social-task/{task_id}/invite/', self.tok_alice, {
            'participant_ids': [self.bob.id],
        })
        self.assertEqual(r.status_code, 400)
        self.assertIn('participant_ids', r.json())
