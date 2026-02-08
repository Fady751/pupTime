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
