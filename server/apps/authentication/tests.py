"""Authentication app API tests."""

from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase


class UserDirectoryViewTests(APITestCase):
    def setUp(self):
        self.me = User.objects.create_user(
            username='me-user',
            email='me@example.com',
            password='Password123!@#',
        )
        self.target = User.objects.create_user(
            username='test-01',
            email='test01@example.com',
            password='Password123!@#',
        )
        self.target.profile.display_name = 'Test One'
        self.target.profile.save(update_fields=['display_name'])

    def _extract_results(self, response):
        data = response.data
        return data['results'] if isinstance(data, dict) and 'results' in data else data

    def test_users_directory_lists_users_without_email_and_excludes_self(self):
        self.client.force_authenticate(user=self.me)
        url = reverse('users_directory')

        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = self._extract_results(response)
        usernames = [item['username'] for item in results]
        self.assertIn('test-01', usernames)
        self.assertNotIn('me-user', usernames)
        row = next(item for item in results if item['username'] == 'test-01')
        self.assertNotIn('email', row)
        self.assertIn('profile', row)
        self.assertEqual(row['profile']['display_name'], 'Test One')

    def test_users_directory_supports_query_on_username_and_display_name(self):
        self.client.force_authenticate(user=self.me)
        url = reverse('users_directory')

        response_by_username = self.client.get(url, {'q': 'test-01'})
        response_by_display_name = self.client.get(url, {'q': 'One'})

        self.assertEqual(response_by_username.status_code, status.HTTP_200_OK)
        self.assertEqual(response_by_display_name.status_code, status.HTTP_200_OK)

        usernames_1 = [item['username'] for item in self._extract_results(response_by_username)]
        usernames_2 = [item['username'] for item in self._extract_results(response_by_display_name)]
        self.assertEqual(usernames_1, ['test-01'])
        self.assertEqual(usernames_2, ['test-01'])
