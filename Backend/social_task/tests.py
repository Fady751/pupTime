from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from task.models import TaskTemplate
from user.models import User
from social_task.models import (
    SocialTask, SocialTaskParticipant, SocialTaskNodeTask,
    SocialTaskStatus, ParticipantStatus,
)
from social_task.services import (
    create_social_task, add_sub_task, accept_invite,
    decline_invite, cancel_social_task, update_node,
)


class Base(TestCase):
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
        self.now = timezone.now()


# ---------------------------------------------------------------------------
# create_social_task
# ---------------------------------------------------------------------------

class TestCreateSocialTask(Base):

    def test_root_fields(self):
        scheduled = self.now + timedelta(days=1)
        task = create_social_task(
            self.alice,
            {'title': 'Gym', 'duration_minutes': 60, 'scheduled_at': scheduled},
            [], [],
        )
        self.assertIsNone(task.parent)
        self.assertEqual(task.initiator, self.alice)
        self.assertEqual(task.title, 'Gym')
        self.assertEqual(task.duration_minutes, 60)

    def test_initiator_is_accepted_participant(self):
        task = create_social_task(self.alice, {'title': 'x', 'duration_minutes': 10}, [], [])
        p = task.participants.get(user=self.alice)
        self.assertEqual(p.status, ParticipantStatus.ACCEPTED)
        self.assertIsNotNone(p.rsvp_at)

    def test_invited_users_are_invited(self):
        task = create_social_task(
            self.alice, {'title': 'x', 'duration_minutes': 10}, [self.bob.id], []
        )
        p = task.participants.get(user=self.bob)
        self.assertEqual(p.status, ParticipantStatus.INVITED)
        self.assertIsNone(p.rsvp_at)

    def test_sub_tasks_created(self):
        task = create_social_task(
            self.alice,
            {'title': 'Project', 'duration_minutes': 120},
            [],
            [
                {'title': 'Design', 'duration_minutes': 60},
                {'title': 'Build', 'duration_minutes': 60},
            ],
        )
        self.assertEqual(task.sub_tasks.count(), 2)

    def test_auto_confirm_when_no_other_participants(self):
        task = create_social_task(
            self.alice,
            {'title': 'Solo', 'duration_minutes': 30, 'scheduled_at': self.now + timedelta(days=1)},
            [], [],
        )
        task.refresh_from_db()
        self.assertEqual(task.status, SocialTaskStatus.CONFIRMED)

    def test_auto_confirm_creates_personal_task_for_initiator(self):
        scheduled = self.now + timedelta(days=1)
        task = create_social_task(
            self.alice,
            {'title': 'Solo', 'duration_minutes': 30, 'scheduled_at': scheduled},
            [], [],
        )
        p = task.participants.get(user=self.alice)
        self.assertEqual(p.node_tasks.count(), 1)
        self.assertEqual(p.node_tasks.first().task.start_datetime, scheduled)

    def test_draft_when_other_participants(self):
        task = create_social_task(
            self.alice, {'title': 'x', 'duration_minutes': 10}, [self.bob.id], []
        )
        self.assertEqual(task.status, SocialTaskStatus.DRAFT)
        self.assertEqual(task.participants.get(user=self.alice).node_tasks.count(), 0)


# ---------------------------------------------------------------------------
# add_sub_task
# ---------------------------------------------------------------------------

class TestAddSubTask(Base):

    def setUp(self):
        super().setUp()
        scheduled = self.now + timedelta(days=1)
        self.confirmed = create_social_task(
            self.alice,
            {'title': 'Project', 'duration_minutes': 120, 'scheduled_at': scheduled},
            [], [],
        )
        self.draft = create_social_task(
            self.alice, {'title': 'Draft', 'duration_minutes': 60}, [self.bob.id], []
        )

    def test_sub_linked_to_root(self):
        sub = add_sub_task(self.confirmed, {'title': 'Phase 1', 'duration_minutes': 30})
        self.assertEqual(sub.parent, self.confirmed)
        self.assertEqual(sub.initiator, self.alice)

    def test_creates_personal_task_when_confirmed_and_scheduled(self):
        scheduled = self.now + timedelta(days=2)
        add_sub_task(self.confirmed, {
            'title': 'Phase 1', 'duration_minutes': 30, 'scheduled_at': scheduled
        })
        p = self.confirmed.participants.get(user=self.alice)
        self.assertEqual(p.node_tasks.count(), 2)  # root + sub

    def test_no_personal_task_when_no_scheduled_at(self):
        add_sub_task(self.confirmed, {'title': 'Phase 1', 'duration_minutes': 30})
        p = self.confirmed.participants.get(user=self.alice)
        self.assertEqual(p.node_tasks.count(), 1)  # only root

    def test_no_personal_task_when_root_is_draft(self):
        add_sub_task(self.draft, {
            'title': 'Phase 1', 'duration_minutes': 30,
            'scheduled_at': self.now + timedelta(days=2),
        })
        p = self.draft.participants.get(user=self.alice)
        self.assertEqual(p.node_tasks.count(), 0)


# ---------------------------------------------------------------------------
# accept_invite
# ---------------------------------------------------------------------------

class TestAcceptInvite(Base):

    def setUp(self):
        super().setUp()
        self.task = create_social_task(
            self.alice,
            {'title': 'Gym', 'duration_minutes': 60, 'scheduled_at': self.now + timedelta(days=1)},
            [self.bob.id], [],
        )

    def test_accept_sets_status_and_rsvp_at(self):
        p = accept_invite(self.task, self.bob)
        self.assertEqual(p.status, ParticipantStatus.ACCEPTED)
        self.assertIsNotNone(p.rsvp_at)

    def test_accept_confirms_root(self):
        accept_invite(self.task, self.bob)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, SocialTaskStatus.CONFIRMED)

    def test_accept_creates_personal_tasks_for_all(self):
        accept_invite(self.task, self.bob)
        for user in [self.alice, self.bob]:
            p = self.task.participants.get(user=user)
            self.assertEqual(p.node_tasks.count(), 1)
            self.assertEqual(p.node_tasks.first().task.user, user)

    def test_no_confirm_while_another_still_invited(self):
        task = create_social_task(
            self.alice,
            {'title': 'x', 'duration_minutes': 10, 'scheduled_at': self.now + timedelta(days=1)},
            [self.bob.id, self.charlie.id], [],
        )
        accept_invite(task, self.bob)
        task.refresh_from_db()
        self.assertEqual(task.status, SocialTaskStatus.DRAFT)

    def test_confirms_when_last_accepts(self):
        task = create_social_task(
            self.alice,
            {'title': 'x', 'duration_minutes': 10, 'scheduled_at': self.now + timedelta(days=1)},
            [self.bob.id, self.charlie.id], [],
        )
        accept_invite(task, self.bob)
        accept_invite(task, self.charlie)
        task.refresh_from_db()
        self.assertEqual(task.status, SocialTaskStatus.CONFIRMED)

    def test_raises_if_not_invited(self):
        with self.assertRaises(SocialTaskParticipant.DoesNotExist):
            accept_invite(self.task, self.charlie)


# ---------------------------------------------------------------------------
# decline_invite
# ---------------------------------------------------------------------------

class TestDeclineInvite(Base):

    def setUp(self):
        super().setUp()
        self.task = create_social_task(
            self.alice, {'title': 'x', 'duration_minutes': 10}, [self.bob.id], []
        )

    def test_decline_sets_status_and_rsvp_at(self):
        p = decline_invite(self.task, self.bob)
        self.assertEqual(p.status, ParticipantStatus.DECLINED)
        self.assertIsNotNone(p.rsvp_at)

    def test_decline_does_not_confirm(self):
        decline_invite(self.task, self.bob)
        self.task.refresh_from_db()
        self.assertNotEqual(self.task.status, SocialTaskStatus.CONFIRMED)

    def test_raises_if_not_invited(self):
        with self.assertRaises(SocialTaskParticipant.DoesNotExist):
            decline_invite(self.task, self.charlie)


# ---------------------------------------------------------------------------
# cancel_social_task
# ---------------------------------------------------------------------------

class TestCancelSocialTask(Base):

    def setUp(self):
        super().setUp()
        scheduled = self.now + timedelta(days=1)
        self.task = create_social_task(
            self.alice,
            {'title': 'Project', 'duration_minutes': 120, 'scheduled_at': scheduled},
            [],
            [{'title': 'Phase 1', 'duration_minutes': 60,
              'scheduled_at': scheduled + timedelta(hours=1)}],
        )

    def test_sets_cancelled_and_is_deleted(self):
        cancel_social_task(self.task)
        self.task.refresh_from_db()
        self.assertEqual(self.task.status, SocialTaskStatus.CANCELLED)
        self.assertTrue(self.task.is_deleted)

    def test_soft_deletes_sub_tasks(self):
        cancel_social_task(self.task)
        sub = self.task.sub_tasks.first()
        sub.refresh_from_db()
        self.assertTrue(sub.is_deleted)

    def test_soft_deletes_personal_task_templates(self):
        p = self.task.participants.get(user=self.alice)
        task_ids = list(p.node_tasks.values_list('task_id', flat=True))
        self.assertGreater(len(task_ids), 0)

        cancel_social_task(self.task)

        self.assertEqual(
            TaskTemplate.objects.filter(id__in=task_ids, is_deleted=True).count(),
            len(task_ids),
        )


# ---------------------------------------------------------------------------
# update_node
# ---------------------------------------------------------------------------

class TestUpdateNode(Base):

    def setUp(self):
        super().setUp()
        self.scheduled = self.now + timedelta(days=1)
        self.task = create_social_task(
            self.alice,
            {'title': 'Gym', 'duration_minutes': 60, 'scheduled_at': self.scheduled},
            [], [],
        )
        self.p = self.task.participants.get(user=self.alice)

    def test_updates_title_and_duration(self):
        update_node(self.task, {'title': 'Yoga', 'duration_minutes': 45})
        self.task.refresh_from_db()
        self.assertEqual(self.task.title, 'Yoga')
        self.assertEqual(self.task.duration_minutes, 45)

    def test_reschedule_propagates_to_personal_task(self):
        new_dt = self.now + timedelta(days=3)
        update_node(self.task, {'scheduled_at': new_dt})
        tt = self.p.node_tasks.first().task
        tt.refresh_from_db()
        self.assertEqual(tt.start_datetime, new_dt)

    def test_duration_change_propagates_to_personal_task(self):
        update_node(self.task, {'duration_minutes': 90})
        tt = self.p.node_tasks.first().task
        tt.refresh_from_db()
        self.assertEqual(tt.duration_minutes, 90)

    def test_adding_scheduled_at_creates_personal_task(self):
        task = create_social_task(
            self.alice, {'title': 'Container', 'duration_minutes': 60}, [], []
        )
        p = task.participants.get(user=self.alice)
        self.assertEqual(p.node_tasks.count(), 0)

        update_node(task, {'scheduled_at': self.now + timedelta(days=2)})
        self.assertEqual(p.node_tasks.count(), 1)

    def test_removing_scheduled_at_soft_deletes_personal_task(self):
        nt = self.p.node_tasks.first()
        update_node(self.task, {'scheduled_at': None})
        nt.task.refresh_from_db()
        self.assertTrue(nt.task.is_deleted)

    def test_no_changes_when_root_is_draft(self):
        task = create_social_task(
            self.alice,
            {'title': 'x', 'duration_minutes': 30, 'scheduled_at': self.now + timedelta(days=1)},
            [self.bob.id], [],
        )
        p = task.participants.get(user=self.alice)
        update_node(task, {'scheduled_at': self.now + timedelta(days=5)})
        self.assertEqual(p.node_tasks.count(), 0)
