from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from .models import User


class UpdateFieldE2ETests(APITestCase):
    """
    E2E tests for updating each individual user field.
    Every test follows: register → login → update field → GET to verify → login to confirm.
    """

    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('register')
        self.login_url = reverse('login')

        # Register a user via the API
        reg = self.client.post(self.register_url, {
            'username': 'testuser',
            'email': 'testuser@example.com',
            'password': 'securepass123',
            'gender': 'male',
            'birth_day': '1995-06-15',
            'google_auth_id': 'google_original_123',
        }, format='json')
        self.assertEqual(reg.status_code, status.HTTP_201_CREATED)
        self.token = reg.data['token']
        self.user_id = reg.data['id']
        self.url = reverse('user-detail', kwargs={'user_id': self.user_id})

        # Register a second user for uniqueness conflict tests
        reg2 = self.client.post(self.register_url, {
            'username': 'otheruser',
            'email': 'other@example.com',
            'password': 'otherpass12345',
        }, format='json')
        self.assertEqual(reg2.status_code, status.HTTP_201_CREATED)
        self.token2 = reg2.data['token']
        self.user_id2 = reg2.data['id']
        self.url2 = reverse('user-detail', kwargs={'user_id': self.user_id2})

    def _auth(self, token):
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)

    def _no_auth(self):
        self.client.credentials()

    def _get_user(self, url):
        return self.client.get(url)

    # ================================================================
    #  USERNAME
    # ================================================================

    def test_update_username_success(self):
        """E2E: update username → GET confirms → login still works."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'username': 'new_username'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['username'], 'new_username')

        # GET confirms
        get = self._get_user(self.url)
        self.assertEqual(get.data['username'], 'new_username')

        # Login still works (email unchanged)
        self._no_auth()
        login = self.client.post(self.login_url, {
            'email': 'testuser@example.com',
            'password': 'securepass123',
        }, format='json')
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    def test_update_username_to_taken_fails(self):
        """E2E: updating username to one taken by another user fails."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'username': 'otheruser'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', resp.data)

        # Original username unchanged
        get = self._get_user(self.url)
        self.assertEqual(get.data['username'], 'testuser')

    def test_update_username_case_insensitive_conflict(self):
        """E2E: updating username to taken name with different case fails."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'username': 'OtherUser'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_username_to_same_value(self):
        """E2E: submitting the same username succeeds (no-op)."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'username': 'testuser'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['username'], 'testuser')

    def test_update_username_empty_fails(self):
        """E2E: updating username to empty string fails."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'username': ''}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_username_then_other_takes_old(self):
        """E2E: user changes username → other user takes the freed username."""
        self._auth(self.token)
        self.client.patch(self.url, {'username': 'renamed_user'}, format='json')

        self._auth(self.token2)
        resp = self.client.patch(self.url2, {'username': 'testuser'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['username'], 'testuser')

    # ================================================================
    #  EMAIL
    # ================================================================

    def test_update_email_success(self):
        """E2E: update email → GET confirms → login with new email works → old email fails."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'email': 'newemail@example.com'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['email'], 'newemail@example.com')

        # GET confirms
        get = self._get_user(self.url)
        self.assertEqual(get.data['email'], 'newemail@example.com')

        # Login with new email
        self._no_auth()
        login = self.client.post(self.login_url, {
            'email': 'newemail@example.com',
            'password': 'securepass123',
        }, format='json')
        self.assertEqual(login.status_code, status.HTTP_200_OK)

        # Old email fails
        login_old = self.client.post(self.login_url, {
            'email': 'testuser@example.com',
            'password': 'securepass123',
        }, format='json')
        self.assertEqual(login_old.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_email_to_taken_fails(self):
        """E2E: updating email to one taken by another user fails."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'email': 'other@example.com'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', resp.data)

        # Original email unchanged
        get = self._get_user(self.url)
        self.assertEqual(get.data['email'], 'testuser@example.com')

    def test_update_email_case_insensitive_conflict(self):
        """E2E: updating email to taken email with different case fails."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'email': 'OTHER@EXAMPLE.COM'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_email_to_same_value(self):
        """E2E: submitting the same email succeeds (no-op)."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'email': 'testuser@example.com'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_update_email_normalized_to_lowercase(self):
        """E2E: email is stored lowercase regardless of input casing."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'email': 'UPPER@EXAMPLE.COM'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        get = self._get_user(self.url)
        self.assertEqual(get.data['email'], 'upper@example.com')

    def test_update_email_invalid_format_fails(self):
        """E2E: updating email to invalid format fails."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'email': 'notanemail'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_email_then_other_takes_old(self):
        """E2E: user changes email → other user takes the freed email."""
        self._auth(self.token)
        self.client.patch(self.url, {'email': 'moved@example.com'}, format='json')

        self._auth(self.token2)
        resp = self.client.patch(self.url2, {'email': 'testuser@example.com'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Both can login
        self._no_auth()
        login1 = self.client.post(self.login_url, {
            'email': 'moved@example.com', 'password': 'securepass123',
        }, format='json')
        self.assertEqual(login1.status_code, status.HTTP_200_OK)

        login2 = self.client.post(self.login_url, {
            'email': 'testuser@example.com', 'password': 'otherpass12345',
        }, format='json')
        self.assertEqual(login2.status_code, status.HTTP_200_OK)

    # ================================================================
    #  PASSWORD
    # ================================================================

    def test_update_password_success(self):
        """E2E: update password → login with new password → old password fails."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'password': 'brandnewpass99'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # New password works
        self._no_auth()
        login = self.client.post(self.login_url, {
            'email': 'testuser@example.com',
            'password': 'brandnewpass99',
        }, format='json')
        self.assertEqual(login.status_code, status.HTTP_200_OK)

        # Old password fails
        login_old = self.client.post(self.login_url, {
            'email': 'testuser@example.com',
            'password': 'securepass123',
        }, format='json')
        self.assertEqual(login_old.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_update_password_too_short_fails(self):
        """E2E: updating password to less than 8 chars fails."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'password': 'short'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Old password still works
        self._no_auth()
        login = self.client.post(self.login_url, {
            'email': 'testuser@example.com',
            'password': 'securepass123',
        }, format='json')
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    def test_update_password_not_in_response(self):
        """E2E: password is never returned in the response body."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'password': 'newpassword99'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertNotIn('password', resp.data)

    def test_update_password_multiple_times(self):
        """E2E: changing password multiple times, only latest works."""
        self._auth(self.token)
        self.client.patch(self.url, {'password': 'firstchange1'}, format='json')
        self.client.patch(self.url, {'password': 'secondchange2'}, format='json')
        self.client.patch(self.url, {'password': 'thirdchange33'}, format='json')

        self._no_auth()
        # Only the latest password works
        for pwd, expected in [
            ('securepass123', status.HTTP_401_UNAUTHORIZED),
            ('firstchange1', status.HTTP_401_UNAUTHORIZED),
            ('secondchange2', status.HTTP_401_UNAUTHORIZED),
            ('thirdchange33', status.HTTP_200_OK),
        ]:
            resp = self.client.post(self.login_url, {
                'email': 'testuser@example.com', 'password': pwd,
            }, format='json')
            self.assertEqual(resp.status_code, expected, f'Password "{pwd}" gave unexpected status')

    # ================================================================
    #  GENDER
    # ================================================================

    def test_update_gender_success(self):
        """E2E: update gender → GET confirms → other fields unchanged."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'gender': 'female'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['gender'], 'female')

        get = self._get_user(self.url)
        self.assertEqual(get.data['gender'], 'female')
        self.assertEqual(get.data['username'], 'testuser')
        self.assertEqual(get.data['email'], 'testuser@example.com')

    def test_update_gender_to_null(self):
        """E2E: clearing gender to null succeeds."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'gender': None}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        get = self._get_user(self.url)
        self.assertIsNone(get.data['gender'])

    def test_update_gender_to_empty_string(self):
        """E2E: setting gender to empty string succeeds."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'gender': ''}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    def test_update_gender_multiple_times(self):
        """E2E: changing gender multiple times, final value is correct."""
        self._auth(self.token)
        for g in ['female', 'other', 'non-binary', 'male']:
            self.client.patch(self.url, {'gender': g}, format='json')

        get = self._get_user(self.url)
        self.assertEqual(get.data['gender'], 'male')

    # ================================================================
    #  BIRTH_DAY
    # ================================================================

    def test_update_birth_day_success(self):
        """E2E: update birth_day → GET confirms."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'birth_day': '2000-12-25'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['birth_day'], '2000-12-25')

        get = self._get_user(self.url)
        self.assertEqual(get.data['birth_day'], '2000-12-25')

    def test_update_birth_day_to_null(self):
        """E2E: clearing birth_day to null succeeds."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'birth_day': None}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        get = self._get_user(self.url)
        self.assertIsNone(get.data['birth_day'])

    def test_update_birth_day_invalid_format_fails(self):
        """E2E: updating birth_day with invalid date format fails."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'birth_day': 'not-a-date'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    def test_update_birth_day_invalid_date_fails(self):
        """E2E: updating birth_day with impossible date fails."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'birth_day': '2000-13-45'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

    # ================================================================
    #  GOOGLE_AUTH_ID
    # ================================================================

    def test_update_google_auth_id_success(self):
        """E2E: update google_auth_id → GET confirms."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'google_auth_id': 'new_google_456'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        get = self._get_user(self.url)
        self.assertEqual(get.data['google_auth_id'], 'new_google_456')

    def test_update_google_auth_id_to_null(self):
        """E2E: clearing google_auth_id to null succeeds."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'google_auth_id': None}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        get = self._get_user(self.url)
        self.assertIsNone(get.data['google_auth_id'])

    def test_update_google_auth_id_to_empty_string(self):
        """E2E: setting google_auth_id to empty string succeeds."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'google_auth_id': ''}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

    # ================================================================
    #  READ-ONLY FIELDS (streak_cnt, joined_on, id)
    # ================================================================

    def test_update_streak_cnt_ignored(self):
        """E2E: attempting to update streak_cnt is silently ignored."""
        self._auth(self.token)
        get_before = self._get_user(self.url)
        original_streak = get_before.data['streak_cnt']

        resp = self.client.patch(self.url, {'streak_cnt': 999}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        get_after = self._get_user(self.url)
        self.assertEqual(get_after.data['streak_cnt'], original_streak)

    def test_update_joined_on_ignored(self):
        """E2E: attempting to update joined_on is silently ignored."""
        self._auth(self.token)
        get_before = self._get_user(self.url)
        original_joined = get_before.data['joined_on']

        resp = self.client.patch(self.url, {'joined_on': '2000-01-01T00:00:00Z'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        get_after = self._get_user(self.url)
        self.assertEqual(get_after.data['joined_on'], original_joined)

    def test_update_id_ignored(self):
        """E2E: attempting to update id is silently ignored."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {'id': 99999}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        get = self._get_user(self.url)
        self.assertEqual(get.data['id'], self.user_id)

    # ================================================================
    #  MULTIPLE FIELDS AT ONCE
    # ================================================================

    def test_update_all_writable_fields_at_once(self):
        """E2E: update username + email + password + gender + birth_day + google_auth_id in one request."""
        self._auth(self.token)
        data = {
            'username': 'allinone',
            'email': 'allinone@example.com',
            'password': 'allinonepass1',
            'gender': 'other',
            'birth_day': '1990-01-01',
            'google_auth_id': 'google_allinone',
        }
        resp = self.client.patch(self.url, data, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['username'], 'allinone')
        self.assertEqual(resp.data['email'], 'allinone@example.com')
        self.assertEqual(resp.data['gender'], 'other')
        self.assertEqual(resp.data['birth_day'], '1990-01-01')
        self.assertEqual(resp.data['google_auth_id'], 'google_allinone')
        self.assertNotIn('password', resp.data)

        # GET confirms all changes
        get = self._get_user(self.url)
        self.assertEqual(get.data['username'], 'allinone')
        self.assertEqual(get.data['email'], 'allinone@example.com')
        self.assertEqual(get.data['gender'], 'other')
        self.assertEqual(get.data['birth_day'], '1990-01-01')
        self.assertEqual(get.data['google_auth_id'], 'google_allinone')

        # Login with new credentials
        self._no_auth()
        login = self.client.post(self.login_url, {
            'email': 'allinone@example.com',
            'password': 'allinonepass1',
        }, format='json')
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    def test_update_email_and_username_together(self):
        """E2E: update email + username simultaneously → GET confirms both."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {
            'username': 'combo_user',
            'email': 'combo@example.com',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        get = self._get_user(self.url)
        self.assertEqual(get.data['username'], 'combo_user')
        self.assertEqual(get.data['email'], 'combo@example.com')

    def test_update_with_one_valid_one_invalid_field_fails_entirely(self):
        """E2E: if one field is invalid, no fields are updated (atomicity)."""
        self._auth(self.token)
        resp = self.client.patch(self.url, {
            'gender': 'female',           # valid
            'email': 'other@example.com',  # taken → invalid
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_400_BAD_REQUEST)

        # Gender should NOT have changed
        get = self._get_user(self.url)
        self.assertEqual(get.data['gender'], 'male')
        self.assertEqual(get.data['email'], 'testuser@example.com')

    # ================================================================
    #  AUTHORIZATION CHECKS PER FIELD
    # ================================================================

    def test_other_user_cannot_update_any_field(self):
        """E2E: user B cannot update any of user A's fields."""
        self._auth(self.token2)
        fields_to_try = [
            {'username': 'hacked'},
            {'email': 'hacked@example.com'},
            {'password': 'hackedpass99'},
            {'gender': 'hacked'},
            {'birth_day': '1900-01-01'},
            {'google_auth_id': 'hacked_google'},
        ]
        for field_data in fields_to_try:
            resp = self.client.patch(self.url, field_data, format='json')
            self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN,
                             f'Expected 403 when updating {field_data}')

        # Verify nothing changed
        self._auth(self.token)
        get = self._get_user(self.url)
        self.assertEqual(get.data['username'], 'testuser')
        self.assertEqual(get.data['email'], 'testuser@example.com')
        self.assertEqual(get.data['gender'], 'male')
        self.assertEqual(get.data['birth_day'], '1995-06-15')
