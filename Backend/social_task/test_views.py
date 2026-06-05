from datetime import timedelta

from django.utils import timezone
from rest_framework import status
from rest_framework.authtoken.models import Token
from rest_framework.test import APITestCase

from friendship.models import Friendship, Status as FriendshipStatus
from social_task.models import (
    SocialTask, SocialTaskParticipant, SocialTaskStatus, ParticipantStatus,
)
from social_task.services import create_social_task
from user.models import User


class Base(APITestCase):
    def setUp(self):
        self.alice = User.objects.create_user(
            username='alice', email='alice@example.com', password='pass'
        )
        self.bob = User.objects.create_user(
            username='bob', email='bob@example.com', password='pass'
        )
        self.charlie = User.objects.create_user(
            username='charlie', email='charlie@example.com', password='pass'
        )
        self.token_alice = Token.objects.create(user=self.alice)
        self.token_bob = Token.objects.create(user=self.bob)
        self.token_charlie = Token.objects.create(user=self.charlie)
        self.now = timezone.now()

        Friendship.objects.create(
            sender=self.alice, receiver=self.bob, status=FriendshipStatus.ACCEPTED
        )

    def auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION=f'Token {token.key}')

    def auth_alice(self):
        self.auth(self.token_alice)

    def auth_bob(self):
        self.auth(self.token_bob)

    def auth_charlie(self):
        self.auth(self.token_charlie)


# ---------------------------------------------------------------------------
# POST /social-task/
# ---------------------------------------------------------------------------

class TestCreate(Base):

    def test_requires_auth(self):
        resp = self.client.post('/social-task/', {}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_create_simple(self):
        self.auth_alice()
        resp = self.client.post('/social-task/', {
            'title': 'Gym',
            'duration_minutes': 60,
            'scheduled_at': (self.now + timedelta(days=1)).isoformat(),
            'participant_ids': [],
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['title'], 'Gym')
        self.assertEqual(resp.data['status'], SocialTaskStatus.CONFIRMED)

    def test_create_with_friend(self):
        self.auth_alice()
        resp = self.client.post('/social-task/', {
            'title': 'Coffee',
            'duration_minutes': 30,
            'participant_ids': [self.bob.id],
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(resp.data['status'], SocialTaskStatus.DRAFT)

    def test_create_with_sub_tasks(self):
        self.auth_alice()
        resp = self.client.post('/social-task/', {
            'title': 'Project',
            'duration_minutes': 120,
            'sub_tasks': [
                {'title': 'Design', 'duration_minutes': 60},
                {'title': 'Build', 'duration_minutes': 60},
            ],
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(resp.data['sub_tasks']), 2)

    def test_cannot_invite_non_friend(self):
        self.auth_alice()
        resp = self.client.post('/social-task/', {
            'title': 'x',
            'duration_minutes': 10,
            'participant_ids': [self.charlie.id],
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_cannot_invite_self(self):
        self.auth_alice()
        resp = self.client.post('/social-task/', {
            'title': 'x',
            'duration_minutes': 10,
            'participant_ids': [self.alice.id],
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_title_is_rejected(self):
        self.auth_alice()
        resp = self.client.post('/social-task/', {
            'duration_minutes': 30,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_missing_duration_is_rejected(self):
        self.auth_alice()
        resp = self.client.post('/social-task/', {
            'title': 'x',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# GET /social-task/
# ---------------------------------------------------------------------------

class TestList(Base):

    def setUp(self):
        super().setUp()
        self.auth_alice()
        self.task = create_social_task(
            self.alice,
            {'title': 'Gym', 'duration_minutes': 60},
            [self.bob.id], [],
        )

    def test_requires_auth(self):
        self.client.credentials()
        resp = self.client.get('/social-task/')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_alice_sees_her_task(self):
        self.auth_alice()
        resp = self.client.get('/social-task/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [t['id'] for t in resp.data['results']]
        self.assertIn(str(self.task.id), ids)

    def test_bob_sees_task_as_invitee(self):
        self.auth_bob()
        resp = self.client.get('/social-task/')
        ids = [t['id'] for t in resp.data['results']]
        self.assertIn(str(self.task.id), ids)

    def test_charlie_does_not_see_task(self):
        self.auth_charlie()
        resp = self.client.get('/social-task/')
        self.assertEqual(len(resp.data['results']), 0)

    def test_sub_tasks_excluded_from_list(self):
        task_with_sub = create_social_task(
            self.alice, {'title': 'Project', 'duration_minutes': 60}, [],
            [{'title': 'Phase 1', 'duration_minutes': 30}],
        )
        self.auth_alice()
        resp = self.client.get('/social-task/')
        ids = [t['id'] for t in resp.data['results']]
        sub_id = str(task_with_sub.sub_tasks.first().id)
        self.assertNotIn(sub_id, ids)


# ---------------------------------------------------------------------------
# GET /social-task/<id>/
# ---------------------------------------------------------------------------

class TestDetail(Base):

    def setUp(self):
        super().setUp()
        self.task = create_social_task(
            self.alice,
            {'title': 'Gym', 'duration_minutes': 60,
             'scheduled_at': self.now + timedelta(days=1)},
            [self.bob.id], [],
        )

    def test_alice_can_retrieve(self):
        self.auth_alice()
        resp = self.client.get(f'/social-task/{self.task.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['title'], 'Gym')

    def test_bob_can_retrieve_as_participant(self):
        self.auth_bob()
        resp = self.client.get(f'/social-task/{self.task.id}/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_charlie_cannot_retrieve(self):
        self.auth_charlie()
        resp = self.client.get(f'/social-task/{self.task.id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_detail_contains_participants_and_sub_tasks(self):
        self.auth_alice()
        resp = self.client.get(f'/social-task/{self.task.id}/')
        self.assertIn('participants', resp.data)
        self.assertIn('sub_tasks', resp.data)


# ---------------------------------------------------------------------------
# POST /social-task/<id>/accept/
# ---------------------------------------------------------------------------

class TestAccept(Base):

    def setUp(self):
        super().setUp()
        self.task = create_social_task(
            self.alice,
            {'title': 'Gym', 'duration_minutes': 60,
             'scheduled_at': self.now + timedelta(days=1)},
            [self.bob.id], [],
        )

    def test_bob_accepts(self):
        self.auth_bob()
        resp = self.client.post(f'/social-task/{self.task.id}/accept/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, SocialTaskStatus.CONFIRMED)

    def test_non_participant_cannot_accept(self):
        self.auth_charlie()
        resp = self.client.post(f'/social-task/{self.task.id}/accept/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_initiator_cannot_accept_own_task(self):
        self.auth_alice()
        resp = self.client.post(f'/social-task/{self.task.id}/accept/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# POST /social-task/<id>/decline/
# ---------------------------------------------------------------------------

class TestDecline(Base):

    def setUp(self):
        super().setUp()
        self.task = create_social_task(
            self.alice, {'title': 'Gym', 'duration_minutes': 60}, [self.bob.id], []
        )

    def test_bob_declines(self):
        self.auth_bob()
        resp = self.client.post(f'/social-task/{self.task.id}/decline/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        p = self.task.participants.get(user=self.bob)
        self.assertEqual(p.status, ParticipantStatus.DECLINED)

    def test_non_participant_cannot_decline(self):
        self.auth_charlie()
        resp = self.client.post(f'/social-task/{self.task.id}/decline/')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)


# ---------------------------------------------------------------------------
# GET /social-task/invites/
# ---------------------------------------------------------------------------

class TestInvites(Base):

    def setUp(self):
        super().setUp()
        self.task = create_social_task(
            self.alice, {'title': 'Coffee', 'duration_minutes': 30}, [self.bob.id], []
        )

    def test_bob_sees_pending_invite(self):
        self.auth_bob()
        resp = self.client.get('/social-task/invites/')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = [t['id'] for t in resp.data['results']]
        self.assertIn(str(self.task.id), ids)

    def test_alice_has_no_pending_invites(self):
        self.auth_alice()
        resp = self.client.get('/social-task/invites/')
        self.assertEqual(len(resp.data['results']), 0)

    def test_invite_disappears_after_accept(self):
        self.auth_bob()
        self.client.post(f'/social-task/{self.task.id}/accept/')
        resp = self.client.get('/social-task/invites/')
        self.assertEqual(len(resp.data['results']), 0)


# ---------------------------------------------------------------------------
# PATCH /social-task/<id>/
# ---------------------------------------------------------------------------

class TestPatch(Base):

    def setUp(self):
        super().setUp()
        self.task = create_social_task(
            self.alice,
            {'title': 'Gym', 'duration_minutes': 60,
             'scheduled_at': self.now + timedelta(days=1)},
            [], [],
        )

    def test_initiator_can_update_title(self):
        self.auth_alice()
        resp = self.client.patch(f'/social-task/{self.task.id}/', {'title': 'Yoga'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.task.refresh_from_db()
        self.assertEqual(self.task.title, 'Yoga')

    def test_non_initiator_cannot_update(self):
        self.auth_bob()
        resp = self.client.patch(f'/social-task/{self.task.id}/', {'title': 'Hacked'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_reschedule_propagates(self):
        self.auth_alice()
        new_dt = (self.now + timedelta(days=3)).isoformat()
        self.client.patch(f'/social-task/{self.task.id}/', {'scheduled_at': new_dt}, format='json')
        p = self.task.participants.get(user=self.alice)
        tt = p.node_tasks.first().task
        tt.refresh_from_db()
        from django.utils.dateparse import parse_datetime
        self.assertEqual(tt.start_datetime, parse_datetime(new_dt))


# ---------------------------------------------------------------------------
# DELETE /social-task/<id>/
# ---------------------------------------------------------------------------

class TestDelete(Base):

    def setUp(self):
        super().setUp()
        self.task = create_social_task(
            self.alice,
            {'title': 'Gym', 'duration_minutes': 60,
             'scheduled_at': self.now + timedelta(days=1)},
            [], [],
        )

    def test_initiator_can_cancel(self):
        self.auth_alice()
        resp = self.client.delete(f'/social-task/{self.task.id}/')
        self.assertEqual(resp.status_code, status.HTTP_204_NO_CONTENT)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, SocialTaskStatus.CANCELLED)

    def test_non_initiator_cannot_cancel(self):
        Friendship.objects.create(
            sender=self.alice, receiver=self.charlie, status=FriendshipStatus.ACCEPTED
        )
        task = create_social_task(
            self.alice, {'title': 'x', 'duration_minutes': 10}, [self.charlie.id], []
        )
        self.auth_charlie()
        resp = self.client.delete(f'/social-task/{task.id}/')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)


# ---------------------------------------------------------------------------
# POST /social-task/<id>/sub-tasks/
# ---------------------------------------------------------------------------

class TestAddSubTask(Base):

    def setUp(self):
        super().setUp()
        self.task = create_social_task(
            self.alice, {'title': 'Project', 'duration_minutes': 120}, [], []
        )

    def test_initiator_can_add_sub_task(self):
        self.auth_alice()
        resp = self.client.post(f'/social-task/{self.task.id}/sub-tasks/', {
            'title': 'Phase 1',
            'duration_minutes': 60,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_201_CREATED)
        self.assertEqual(self.task.sub_tasks.count(), 1)

    def test_non_initiator_cannot_add_sub_task(self):
        self.auth_bob()
        resp = self.client.post(f'/social-task/{self.task.id}/sub-tasks/', {
            'title': 'Phase 1',
            'duration_minutes': 60,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_add_sub_task_to_sub_task(self):
        sub = SocialTask.objects.create(
            parent=self.task, initiator=self.alice, title='Phase 1', duration_minutes=30
        )
        self.auth_alice()
        resp = self.client.post(f'/social-task/{sub.id}/sub-tasks/', {
            'title': 'Deep', 'duration_minutes': 15,
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
