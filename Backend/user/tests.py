from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from rest_framework.authtoken.models import Token
from .models import User


class UserModelTests(TestCase):
    """Test cases for the User model."""

    def test_create_user(self):
        """Test creating a user is successful."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.assertEqual(user.username, 'testuser')
        self.assertEqual(user.email, 'test@example.com')
        self.assertTrue(user.check_password('testpass123'))
        self.assertEqual(user.streak_cnt, 0)

    def test_create_user_with_extra_fields(self):
        """Test creating a user with extra fields."""
        user = User.objects.create_user(
            username='testuser2',
            email='test2@example.com',
            password='testpass123',
            gender='male',
            google_auth_id='google123'
        )
        self.assertEqual(user.gender, 'male')
        self.assertEqual(user.google_auth_id, 'google123')

    def test_user_str_representation(self):
        """Test user string representation."""
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.assertEqual(str(user), 'testuser')


class RegisterViewTests(APITestCase):
    """Test cases for the Register endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('register')

    def test_register_user_success(self):
        """Test successful user registration."""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'securepass123'
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('token', response.data)
        self.assertEqual(response.data['username'], 'newuser')
        self.assertEqual(response.data['email'], 'newuser@example.com')
        self.assertTrue(User.objects.filter(email='newuser@example.com').exists())

    def test_register_user_duplicate_email(self):
        """Test registration with duplicate email fails."""
        User.objects.create_user(
            username='existinguser',
            email='existing@example.com',
            password='testpass123'
        )
        data = {
            'username': 'newuser',
            'email': 'existing@example.com',
            'password': 'securepass123'
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_register_user_duplicate_email_case_insensitive(self):
        """Test registration with duplicate email (different case) fails."""
        User.objects.create_user(
            username='existinguser',
            email='existing@example.com',
            password='testpass123'
        )
        data = {
            'username': 'newuser',
            'email': 'EXISTING@EXAMPLE.COM',
            'password': 'securepass123'
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_register_user_duplicate_username(self):
        """Test registration with duplicate username fails."""
        User.objects.create_user(
            username='existinguser',
            email='existing@example.com',
            password='testpass123'
        )
        data = {
            'username': 'existinguser',
            'email': 'new@example.com',
            'password': 'securepass123'
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_register_user_missing_email(self):
        """Test registration without email fails."""
        data = {
            'username': 'newuser',
            'password': 'securepass123'
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_user_missing_password(self):
        """Test registration without password fails."""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com'
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_user_missing_username(self):
        """Test registration without username fails."""
        data = {
            'email': 'newuser@example.com',
            'password': 'securepass123'
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_user_invalid_email(self):
        """Test registration with invalid email format fails."""
        data = {
            'username': 'newuser',
            'email': 'invalidemail',
            'password': 'securepass123'
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_user_short_password(self):
        """Test registration with short password fails."""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'short'
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_user_with_optional_fields(self):
        """Test registration with optional fields."""
        data = {
            'username': 'newuser',
            'email': 'newuser@example.com',
            'password': 'securepass123',
            'gender': 'female',
            'birth_day': '1990-05-15'
        }
        response = self.client.post(self.register_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = User.objects.get(email='newuser@example.com')
        self.assertEqual(user.gender, 'female')


class LoginViewTests(APITestCase):
    """Test cases for the Login endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.login_url = reverse('login')
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )

    def test_login_success(self):
        """Test successful login."""
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)
        self.assertIn('user_id', response.data)
        self.assertIn('username', response.data)
        self.assertIn('email', response.data)
        self.assertEqual(response.data['username'], 'testuser')

    def test_login_case_insensitive_email(self):
        """Test login with different email case."""
        data = {
            'email': 'TEST@EXAMPLE.COM',
            'password': 'testpass123'
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)

    def test_login_invalid_password(self):
        """Test login with wrong password."""
        data = {
            'email': 'test@example.com',
            'password': 'wrongpassword'
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertIn('error', response.data)

    def test_login_nonexistent_user(self):
        """Test login with non-existent email."""
        data = {
            'email': 'nonexistent@example.com',
            'password': 'testpass123'
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_missing_email(self):
        """Test login without email fails."""
        data = {
            'password': 'testpass123'
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_missing_password(self):
        """Test login without password fails."""
        data = {
            'email': 'test@example.com'
        }
        response = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_empty_credentials(self):
        """Test login with empty data fails."""
        response = self.client.post(self.login_url, {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_login_returns_same_token(self):
        """Test that login returns the same token for subsequent logins."""
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }
        response1 = self.client.post(self.login_url, data, format='json')
        response2 = self.client.post(self.login_url, data, format='json')
        self.assertEqual(response1.data['token'], response2.data['token'])


class UserSerializerTests(TestCase):
    """Test cases for the UserSerializer."""

    def test_email_normalized_to_lowercase(self):
        """Test that email is normalized to lowercase on registration."""
        from .serializers import UserSerializer
        data = {
            'username': 'testuser',
            'email': 'TEST@EXAMPLE.COM',
            'password': 'securepass123'
        }
        serializer = UserSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        user = serializer.save()
        self.assertEqual(user.email, 'test@example.com')

    def test_password_is_hashed(self):
        """Test that password is properly hashed."""
        from .serializers import UserSerializer
        data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'securepass123'
        }
        serializer = UserSerializer(data=data)
        self.assertTrue(serializer.is_valid())
        user = serializer.save()
        self.assertNotEqual(user.password, 'securepass123')
        self.assertTrue(user.check_password('securepass123'))

    def test_password_not_in_response(self):
        """Test that password is not included in serialized output."""
        from .serializers import UserSerializer
        user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        serializer = UserSerializer(user)
        self.assertNotIn('password', serializer.data)


class GetUserViewTests(APITestCase):
    """Test cases for the GET user by ID endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            gender='male',
        )
        self.token = Token.objects.create(user=self.user)
        self.user2 = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123',
        )
        Token.objects.create(user=self.user2)

    def test_get_own_user_success(self):
        """Test retrieving own user details."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': self.user.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'testuser')
        self.assertEqual(response.data['email'], 'test@example.com')
        self.assertEqual(response.data['gender'], 'male')
        self.assertNotIn('password', response.data)

    def test_get_other_user_success(self):
        """Test retrieving another user's details (allowed for read)."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': self.user2.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['username'], 'otheruser')

    def test_get_user_not_found(self):
        """Test retrieving a non-existent user returns 404."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': 99999})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_get_user_unauthenticated(self):
        """Test retrieving user without auth token returns 401."""
        url = reverse('user-detail', kwargs={'user_id': self.user.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_user_invalid_token(self):
        """Test retrieving user with invalid token returns 401."""
        self.client.credentials(HTTP_AUTHORIZATION='Token invalidtoken123')
        url = reverse('user-detail', kwargs={'user_id': self.user.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_get_user_returns_all_fields(self):
        """Test that response includes all expected fields."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': self.user.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        expected_fields = ['id', 'username', 'email', 'gender', 'birth_day', 'streak_cnt', 'joined_on']
        for field in expected_fields:
            self.assertIn(field, response.data)

    def test_get_deleted_user_returns_404(self):
        """Test that getting a user after deletion returns 404."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        deleted_user_id = self.user2.id
        self.user2.delete()
        url = reverse('user-detail', kwargs={'user_id': deleted_user_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class UpdateUserViewTests(APITestCase):
    """Test cases for the PUT/PATCH update user endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
            gender='male',
        )
        self.token = Token.objects.create(user=self.user)
        self.user2 = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123',
            gender='female',
        )
        self.token2 = Token.objects.create(user=self.user2)
        self.url = reverse('user-detail', kwargs={'user_id': self.user.id})

    # ---- PATCH (partial update) tests ----

    def test_patch_update_email_success(self):
        """Test partial update of email."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'email': 'newemail@example.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'newemail@example.com')

    def test_patch_update_username_success(self):
        """Test partial update of username."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'username': 'newusername'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'newusername')

    def test_patch_update_gender_success(self):
        """Test partial update of gender."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'gender': 'female'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.gender, 'female')

    def test_patch_update_birth_day_success(self):
        """Test partial update of birth_day."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'birth_day': '1995-06-15'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(str(self.user.birth_day), '1995-06-15')

    def test_patch_update_password_success(self):
        """Test partial update of password hashes correctly."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'password': 'newsecurepass123'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('newsecurepass123'))
        self.assertFalse(self.user.check_password('testpass123'))

    def test_patch_update_multiple_fields(self):
        """Test partial update of multiple fields at once."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        data = {'username': 'updateduser', 'gender': 'other'}
        response = self.client.patch(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'updateduser')
        self.assertEqual(self.user.gender, 'other')

    def test_patch_email_to_existing_email_fails(self):
        """Test updating email to one already taken by another user fails."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'email': 'other@example.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_patch_email_to_existing_email_case_insensitive_fails(self):
        """Test updating email to taken email with different case fails."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'email': 'OTHER@EXAMPLE.COM'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_patch_username_to_existing_username_fails(self):
        """Test updating username to one already taken fails."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'username': 'otheruser'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_patch_username_to_existing_username_case_insensitive_fails(self):
        """Test updating username to taken username with different case fails."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'username': 'OtherUser'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_patch_keep_own_email_unchanged(self):
        """Test submitting same email as current does not fail."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'email': 'test@example.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_patch_keep_own_username_unchanged(self):
        """Test submitting same username as current does not fail."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'username': 'testuser'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_patch_short_password_fails(self):
        """Test updating with a too-short password fails."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'password': 'short'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_invalid_email_format_fails(self):
        """Test updating with invalid email format fails."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'email': 'notanemail'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_patch_other_user_forbidden(self):
        """Test updating another user's profile returns 403."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': self.user2.id})
        response = self.client.patch(url, {'username': 'hacked'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.user2.refresh_from_db()
        self.assertEqual(self.user2.username, 'otheruser')

    def test_patch_nonexistent_user_returns_404(self):
        """Test updating a non-existent user returns 404."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': 99999})
        response = self.client.patch(url, {'username': 'ghost'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_patch_unauthenticated_returns_401(self):
        """Test updating user without auth returns 401."""
        response = self.client.patch(self.url, {'username': 'nope'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_patch_email_normalized_to_lowercase(self):
        """Test that email is normalized to lowercase on update."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'email': 'UPPER@EXAMPLE.COM'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'upper@example.com')

    # ---- Email/Username swap scenarios ----

    def test_user_changes_email_then_other_takes_old_email(self):
        """Test: user1 changes email, then user2 takes user1's old email."""
        # user1 changes email from test@example.com -> newemail@example.com
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'email': 'newemail@example.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'newemail@example.com')

        # user2 now takes the old email: test@example.com
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token2.key)
        url2 = reverse('user-detail', kwargs={'user_id': self.user2.id})
        response = self.client.patch(url2, {'email': 'test@example.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user2.refresh_from_db()
        self.assertEqual(self.user2.email, 'test@example.com')

    def test_user_changes_username_then_other_takes_old_username(self):
        """Test: user1 changes username, then user2 takes user1's old username."""
        # user1 changes username from testuser -> newname
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'username': 'newname'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'newname')

        # user2 now takes the old username: testuser
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token2.key)
        url2 = reverse('user-detail', kwargs={'user_id': self.user2.id})
        response = self.client.patch(url2, {'username': 'testuser'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user2.refresh_from_db()
        self.assertEqual(self.user2.username, 'testuser')

    def test_two_users_swap_emails(self):
        """Test: user1 and user2 swap their emails."""
        # user1 changes to a temp email first
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'email': 'temp@example.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # user2 takes user1's original email
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token2.key)
        url2 = reverse('user-detail', kwargs={'user_id': self.user2.id})
        response = self.client.patch(url2, {'email': 'test@example.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # user1 takes user2's original email
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'email': 'other@example.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.user2.refresh_from_db()
        self.assertEqual(self.user.email, 'other@example.com')
        self.assertEqual(self.user2.email, 'test@example.com')

    def test_two_users_swap_usernames(self):
        """Test: user1 and user2 swap their usernames."""
        # user1 changes to a temp username first
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'username': 'tempname'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # user2 takes user1's original username
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token2.key)
        url2 = reverse('user-detail', kwargs={'user_id': self.user2.id})
        response = self.client.patch(url2, {'username': 'testuser'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # user1 takes user2's original username
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'username': 'otheruser'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        self.user.refresh_from_db()
        self.user2.refresh_from_db()
        self.assertEqual(self.user.username, 'otheruser')
        self.assertEqual(self.user2.username, 'testuser')

    def test_cannot_take_email_still_in_use(self):
        """Test: user1 can't take user2's email while user2 still has it."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        response = self.client.patch(self.url, {'email': 'other@example.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.user.refresh_from_db()
        self.assertEqual(self.user.email, 'test@example.com')

    # ---- PUT (full update) tests ----

    def test_put_update_success(self):
        """Test full update of user profile via PUT."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        data = {
            'username': 'fullyupdated',
            'email': 'fullyupdated@example.com',
            'gender': 'other',
        }
        response = self.client.put(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, 'fullyupdated')
        self.assertEqual(self.user.email, 'fullyupdated@example.com')

    def test_put_other_user_forbidden(self):
        """Test full update of another user's profile returns 403."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': self.user2.id})
        data = {'username': 'hacked', 'email': 'hacked@example.com'}
        response = self.client.put(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_put_unauthenticated_returns_401(self):
        """Test full update without auth returns 401."""
        data = {'username': 'nope', 'email': 'nope@example.com'}
        response = self.client.put(self.url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    # ---- Update after password change ----

    def test_login_with_new_password_after_update(self):
        """Test user can login with new password after updating it."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        self.client.patch(self.url, {'password': 'brandnewpass123'}, format='json')

        # Login with new password
        self.client.credentials()  # clear auth
        login_url = reverse('login')
        response = self.client.post(login_url, {
            'email': 'test@example.com',
            'password': 'brandnewpass123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('token', response.data)

    def test_login_with_old_password_after_update_fails(self):
        """Test user cannot login with old password after updating it."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        self.client.patch(self.url, {'password': 'brandnewpass123'}, format='json')

        self.client.credentials()
        login_url = reverse('login')
        response = self.client.post(login_url, {
            'email': 'test@example.com',
            'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_with_new_email_after_update(self):
        """Test user can login with new email after updating it."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        self.client.patch(self.url, {'email': 'changed@example.com'}, format='json')

        self.client.credentials()
        login_url = reverse('login')
        response = self.client.post(login_url, {
            'email': 'changed@example.com',
            'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_login_with_old_email_after_update_fails(self):
        """Test user cannot login with old email after updating it."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        self.client.patch(self.url, {'email': 'changed@example.com'}, format='json')

        self.client.credentials()
        login_url = reverse('login')
        response = self.client.post(login_url, {
            'email': 'test@example.com',
            'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class DeleteUserViewTests(APITestCase):
    """Test cases for the DELETE user endpoint."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123',
        )
        self.token = Token.objects.create(user=self.user)
        self.user2 = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123',
        )
        self.token2 = Token.objects.create(user=self.user2)

    def test_delete_own_user_success(self):
        """Test deleting own account succeeds."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': self.user.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(User.objects.filter(pk=self.user.id).exists())

    def test_delete_other_user_forbidden(self):
        """Test deleting another user's account returns 403."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': self.user2.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertTrue(User.objects.filter(pk=self.user2.id).exists())

    def test_delete_unauthenticated_returns_401(self):
        """Test deleting without auth returns 401."""
        url = reverse('user-detail', kwargs={'user_id': self.user.id})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_delete_nonexistent_user_returns_404(self):
        """Test deleting a non-existent user returns 404."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': 99999})
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_delete_user_token_is_also_deleted(self):
        """Test that token is deleted along with the user."""
        token_key = self.token.key
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': self.user.id})
        self.client.delete(url)
        self.assertFalse(Token.objects.filter(key=token_key).exists())

    def test_deleted_user_cannot_login(self):
        """Test that a deleted user can no longer log in."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': self.user.id})
        self.client.delete(url)

        self.client.credentials()
        login_url = reverse('login')
        response = self.client.post(login_url, {
            'email': 'test@example.com',
            'password': 'testpass123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_register_with_deleted_user_email(self):
        """Test that a new user can register with a deleted user's email."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': self.user.id})
        self.client.delete(url)

        self.client.credentials()
        register_url = reverse('register')
        response = self.client.post(register_url, {
            'username': 'brandnewuser',
            'email': 'test@example.com',
            'password': 'securepass123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['email'], 'test@example.com')

    def test_register_with_deleted_user_username(self):
        """Test that a new user can register with a deleted user's username."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': self.user.id})
        self.client.delete(url)

        self.client.credentials()
        register_url = reverse('register')
        response = self.client.post(register_url, {
            'username': 'testuser',
            'email': 'fresh@example.com',
            'password': 'securepass123',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['username'], 'testuser')

    def test_other_user_takes_deleted_user_email(self):
        """Test: user1 deletes account, then user2 updates to user1's old email."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': self.user.id})
        self.client.delete(url)

        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token2.key)
        url2 = reverse('user-detail', kwargs={'user_id': self.user2.id})
        response = self.client.patch(url2, {'email': 'test@example.com'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user2.refresh_from_db()
        self.assertEqual(self.user2.email, 'test@example.com')

    def test_other_user_takes_deleted_user_username(self):
        """Test: user1 deletes account, then user2 updates to user1's old username."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': self.user.id})
        self.client.delete(url)

        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token2.key)
        url2 = reverse('user-detail', kwargs={'user_id': self.user2.id})
        response = self.client.patch(url2, {'username': 'testuser'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user2.refresh_from_db()
        self.assertEqual(self.user2.username, 'testuser')

    def test_delete_then_get_returns_404(self):
        """Test getting a deleted user returns 404."""
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token.key)
        url = reverse('user-detail', kwargs={'user_id': self.user.id})
        self.client.delete(url)

        # user2 tries to get deleted user
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + self.token2.key)
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class UserE2ETests(APITestCase):
    """
    End-to-end tests that simulate real user flows across
    the full lifecycle: register → login → get → update → delete.
    """

    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('register')
        self.login_url = reverse('login')

    def _user_url(self, user_id):
        return reverse('user-detail', kwargs={'user_id': user_id})

    # ---- Flow 1: Full single-user lifecycle ----

    def test_full_lifecycle_register_login_get_update_delete(self):
        """E2E: register → login → get profile → update profile → delete account."""
        # 1. Register
        reg = self.client.post(self.register_url, {
            'username': 'alice',
            'email': 'alice@example.com',
            'password': 'alicepass123',
            'gender': 'female',
            'birth_day': '1998-03-20',
        }, format='json')
        self.assertEqual(reg.status_code, status.HTTP_201_CREATED)
        token = reg.data['token']
        user_id = reg.data['id']

        # 2. Login with same credentials
        login = self.client.post(self.login_url, {
            'email': 'alice@example.com',
            'password': 'alicepass123',
        }, format='json')
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertEqual(login.data['token'], token)
        self.assertEqual(login.data['user_id'], user_id)

        # 3. Get own profile
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)
        get_resp = self.client.get(self._user_url(user_id))
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(get_resp.data['username'], 'alice')
        self.assertEqual(get_resp.data['email'], 'alice@example.com')
        self.assertEqual(get_resp.data['gender'], 'female')
        self.assertEqual(get_resp.data['birth_day'], '1998-03-20')

        # 4. Update profile
        patch_resp = self.client.patch(self._user_url(user_id), {
            'username': 'alice_updated',
            'gender': 'other',
        }, format='json')
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(patch_resp.data['username'], 'alice_updated')
        self.assertEqual(patch_resp.data['gender'], 'other')

        # 5. Verify update persisted
        get_resp2 = self.client.get(self._user_url(user_id))
        self.assertEqual(get_resp2.data['username'], 'alice_updated')
        self.assertEqual(get_resp2.data['gender'], 'other')
        self.assertEqual(get_resp2.data['email'], 'alice@example.com')  # unchanged

        # 6. Delete account
        del_resp = self.client.delete(self._user_url(user_id))
        self.assertEqual(del_resp.status_code, status.HTTP_204_NO_CONTENT)

        # 7. Confirm user is gone
        self.assertFalse(User.objects.filter(pk=user_id).exists())

    # ---- Flow 2: Two users interacting ----

    def test_two_users_register_and_view_each_other(self):
        """E2E: two users register and view each other's profiles."""
        # Register user A
        reg_a = self.client.post(self.register_url, {
            'username': 'userA',
            'email': 'a@example.com',
            'password': 'passwordA123',
        }, format='json')
        self.assertEqual(reg_a.status_code, status.HTTP_201_CREATED)
        token_a = reg_a.data['token']
        id_a = reg_a.data['id']

        # Register user B
        reg_b = self.client.post(self.register_url, {
            'username': 'userB',
            'email': 'b@example.com',
            'password': 'passwordB123',
        }, format='json')
        self.assertEqual(reg_b.status_code, status.HTTP_201_CREATED)
        token_b = reg_b.data['token']
        id_b = reg_b.data['id']

        # A views B's profile
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token_a)
        resp = self.client.get(self._user_url(id_b))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['username'], 'userB')

        # B views A's profile
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token_b)
        resp = self.client.get(self._user_url(id_a))
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertEqual(resp.data['username'], 'userA')

        # A cannot update B
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token_a)
        resp = self.client.patch(self._user_url(id_b), {'username': 'hacked'}, format='json')
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

        # A cannot delete B
        resp = self.client.delete(self._user_url(id_b))
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)

    # ---- Flow 3: Update email then login with new email ----

    def test_update_email_login_flow(self):
        """E2E: register → update email → login with new email → old email fails."""
        # Register
        reg = self.client.post(self.register_url, {
            'username': 'bob',
            'email': 'bob@old.com',
            'password': 'bobpass12345',
        }, format='json')
        token = reg.data['token']
        user_id = reg.data['id']

        # Update email
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)
        self.client.patch(self._user_url(user_id), {'email': 'bob@new.com'}, format='json')

        # Login with new email works
        self.client.credentials()
        resp = self.client.post(self.login_url, {
            'email': 'bob@new.com',
            'password': 'bobpass12345',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Login with old email fails
        resp = self.client.post(self.login_url, {
            'email': 'bob@old.com',
            'password': 'bobpass12345',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    # ---- Flow 4: Update password then login with new password ----

    def test_update_password_login_flow(self):
        """E2E: register → update password → login with new password → old password fails."""
        reg = self.client.post(self.register_url, {
            'username': 'carol',
            'email': 'carol@example.com',
            'password': 'carolpass123',
        }, format='json')
        token = reg.data['token']
        user_id = reg.data['id']

        # Update password
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)
        self.client.patch(self._user_url(user_id), {'password': 'newcarolpass456'}, format='json')

        # Login with new password
        self.client.credentials()
        resp = self.client.post(self.login_url, {
            'email': 'carol@example.com',
            'password': 'newcarolpass456',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # Old password rejected
        resp = self.client.post(self.login_url, {
            'email': 'carol@example.com',
            'password': 'carolpass123',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    # ---- Flow 5: Delete then re-register with same credentials ----

    def test_delete_and_reregister_same_credentials(self):
        """E2E: register → delete → re-register with same email & username."""
        # Register
        reg = self.client.post(self.register_url, {
            'username': 'phoenix',
            'email': 'phoenix@example.com',
            'password': 'phoenixpass123',
        }, format='json')
        token = reg.data['token']
        user_id = reg.data['id']

        # Delete
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)
        self.client.delete(self._user_url(user_id))

        # Re-register with same credentials
        self.client.credentials()
        reg2 = self.client.post(self.register_url, {
            'username': 'phoenix',
            'email': 'phoenix@example.com',
            'password': 'phoenixpass123',
        }, format='json')
        self.assertEqual(reg2.status_code, status.HTTP_201_CREATED)
        self.assertNotEqual(reg2.data['id'], user_id)  # new user, new ID

        # Login works
        login = self.client.post(self.login_url, {
            'email': 'phoenix@example.com',
            'password': 'phoenixpass123',
        }, format='json')
        self.assertEqual(login.status_code, status.HTTP_200_OK)

    # ---- Flow 6: User A deletes, user B takes A's email & username ----

    def test_deleted_user_credentials_taken_by_another(self):
        """E2E: user A deletes → user B updates to A's old email & username."""
        # Register A and B
        reg_a = self.client.post(self.register_url, {
            'username': 'dave',
            'email': 'dave@example.com',
            'password': 'davepass12345',
        }, format='json')
        token_a = reg_a.data['token']
        id_a = reg_a.data['id']

        reg_b = self.client.post(self.register_url, {
            'username': 'eve',
            'email': 'eve@example.com',
            'password': 'evepass123456',
        }, format='json')
        token_b = reg_b.data['token']
        id_b = reg_b.data['id']

        # A deletes account
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token_a)
        self.client.delete(self._user_url(id_a))

        # B takes A's old email and username
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token_b)
        resp = self.client.patch(self._user_url(id_b), {
            'username': 'dave',
            'email': 'dave@example.com',
        }, format='json')
        self.assertEqual(resp.status_code, status.HTTP_200_OK)

        # B logs in with A's old email
        self.client.credentials()
        login = self.client.post(self.login_url, {
            'email': 'dave@example.com',
            'password': 'evepass123456',
        }, format='json')
        self.assertEqual(login.status_code, status.HTTP_200_OK)
        self.assertEqual(login.data['user_id'], id_b)

    # ---- Flow 7: Email swap between two users ----

    def test_two_users_swap_emails_e2e(self):
        """E2E: two users swap their emails through a temp email."""
        reg_a = self.client.post(self.register_url, {
            'username': 'frank',
            'email': 'frank@example.com',
            'password': 'frankpass1234',
        }, format='json')
        token_a = reg_a.data['token']
        id_a = reg_a.data['id']

        reg_b = self.client.post(self.register_url, {
            'username': 'grace',
            'email': 'grace@example.com',
            'password': 'gracepass1234',
        }, format='json')
        token_b = reg_b.data['token']
        id_b = reg_b.data['id']

        # A moves to temp email
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token_a)
        self.client.patch(self._user_url(id_a), {'email': 'temp@example.com'}, format='json')

        # B takes A's old email
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token_b)
        self.client.patch(self._user_url(id_b), {'email': 'frank@example.com'}, format='json')

        # A takes B's old email
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token_a)
        self.client.patch(self._user_url(id_a), {'email': 'grace@example.com'}, format='json')

        # Verify: A logs in with B's old email
        self.client.credentials()
        login_a = self.client.post(self.login_url, {
            'email': 'grace@example.com',
            'password': 'frankpass1234',
        }, format='json')
        self.assertEqual(login_a.status_code, status.HTTP_200_OK)
        self.assertEqual(login_a.data['user_id'], id_a)

        # Verify: B logs in with A's old email
        login_b = self.client.post(self.login_url, {
            'email': 'frank@example.com',
            'password': 'gracepass1234',
        }, format='json')
        self.assertEqual(login_b.status_code, status.HTTP_200_OK)
        self.assertEqual(login_b.data['user_id'], id_b)

    # ---- Flow 8: Unauthenticated user blocked from protected routes ----

    def test_unauthenticated_blocked_from_all_protected_routes(self):
        """E2E: unauthenticated requests to get/update/delete all return 401."""
        # Register a user to get a valid ID
        reg = self.client.post(self.register_url, {
            'username': 'heidi',
            'email': 'heidi@example.com',
            'password': 'heidipass1234',
        }, format='json')
        user_id = reg.data['id']
        url = self._user_url(user_id)

        # Clear auth
        self.client.credentials()

        self.assertEqual(self.client.get(url).status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.patch(url, {'username': 'x'}, format='json').status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.put(url, {'username': 'x', 'email': 'x@x.com'}, format='json').status_code, status.HTTP_401_UNAUTHORIZED)
        self.assertEqual(self.client.delete(url).status_code, status.HTTP_401_UNAUTHORIZED)

    # ---- Flow 9: Multiple updates then verify final state ----

    def test_multiple_sequential_updates(self):
        """E2E: register → multiple updates → verify final state is correct."""
        reg = self.client.post(self.register_url, {
            'username': 'ivan',
            'email': 'ivan@example.com',
            'password': 'ivanpass12345',
            'gender': 'male',
        }, format='json')
        token = reg.data['token']
        user_id = reg.data['id']
        url = self._user_url(user_id)

        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)

        # Update 1: change username
        self.client.patch(url, {'username': 'ivan_v2'}, format='json')
        # Update 2: change email
        self.client.patch(url, {'email': 'ivan_v2@example.com'}, format='json')
        # Update 3: change gender
        self.client.patch(url, {'gender': 'other'}, format='json')
        # Update 4: change birth_day
        self.client.patch(url, {'birth_day': '2000-01-01'}, format='json')
        # Update 5: change password
        self.client.patch(url, {'password': 'finalpassword99'}, format='json')

        # Verify final state via GET
        get_resp = self.client.get(url)
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(get_resp.data['username'], 'ivan_v2')
        self.assertEqual(get_resp.data['email'], 'ivan_v2@example.com')
        self.assertEqual(get_resp.data['gender'], 'other')
        self.assertEqual(get_resp.data['birth_day'], '2000-01-01')

        # Verify login with latest credentials
        self.client.credentials()
        login = self.client.post(self.login_url, {
            'email': 'ivan_v2@example.com',
            'password': 'finalpassword99',
        }, format='json')
        self.assertEqual(login.status_code, status.HTTP_200_OK)

        # All old credentials fail
        for old_email in ['ivan@example.com']:
            resp = self.client.post(self.login_url, {
                'email': old_email,
                'password': 'finalpassword99',
            }, format='json')
            self.assertEqual(resp.status_code, status.HTTP_401_UNAUTHORIZED)

    # ---- Flow 10: Register duplicate after update frees credentials ----

    def test_register_with_freed_email_after_update(self):
        """E2E: user updates email → new user registers with the freed email."""
        # Register original user
        reg = self.client.post(self.register_url, {
            'username': 'judy',
            'email': 'judy@example.com',
            'password': 'judypass12345',
        }, format='json')
        token = reg.data['token']
        user_id = reg.data['id']

        # Update email to free up the old one
        self.client.credentials(HTTP_AUTHORIZATION='Token ' + token)
        self.client.patch(self._user_url(user_id), {'email': 'judy_new@example.com'}, format='json')

        # New user registers with the freed email
        self.client.credentials()
        reg2 = self.client.post(self.register_url, {
            'username': 'judy2',
            'email': 'judy@example.com',
            'password': 'judy2pass1234',
        }, format='json')
        self.assertEqual(reg2.status_code, status.HTTP_201_CREATED)

        # Both users can log in
        login1 = self.client.post(self.login_url, {
            'email': 'judy_new@example.com',
            'password': 'judypass12345',
        }, format='json')
        self.assertEqual(login1.status_code, status.HTTP_200_OK)

        login2 = self.client.post(self.login_url, {
            'email': 'judy@example.com',
            'password': 'judy2pass1234',
        }, format='json')
        self.assertEqual(login2.status_code, status.HTTP_200_OK)
        self.assertNotEqual(login1.data['user_id'], login2.data['user_id'])
