"""Django settings for Octara Hub.

The project intentionally keeps the runtime simple for local development:
- API server on localhost:8010
- SPA dev server on localhost:5174
- JWT auth for API calls
- SSE endpoint for realtime updates

Environment values are loaded through python-decouple.
Important: DEBUG must be a boolean-like value (True/False, 1/0), not free text.
"""

import os
from pathlib import Path
from datetime import timedelta

from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent

def parse_bool(value, default=False):
    """Safe boolean parsing for env vars with controlled fallback."""
    if isinstance(value, bool):
        return value
    if value is None:
        return default
    normalized = str(value).strip().lower()
    if normalized in {'1', 'true', 'yes', 'on'}:
        return True
    if normalized in {'0', 'false', 'no', 'off'}:
        return False
    return default

# Core runtime flags.
SECRET_KEY = config('SECRET_KEY', default='django-insecure-change-me')
DEBUG = parse_bool(config('DEBUG', default='True'), default=True)
ALLOWED_HOSTS = config('ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Third party
    'rest_framework',
    'corsheaders',
    'django_filters',
    # Local apps
    'apps.authentication',
    'apps.workspaces',
    'apps.messaging',
    'apps.dm',
    'apps.files',
    'apps.notifications',
    'apps.search',
    'apps.calls',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'octara_hub.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'octara_hub.wsgi.application'

USE_SQLITE = parse_bool(config('USE_SQLITE', default='True'), default=True)
if USE_SQLITE:
    # Native local mode (zero external dependencies).
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    # Deploy mode (Compose/production database).
    DATABASES = {
        'default': {
            'ENGINE': config('DB_ENGINE', default='django.db.backends.postgresql'),
            'NAME': config('DB_NAME', default='octara_hub'),
            'USER': config('DB_USER', default='octara_hub'),
            'PASSWORD': config('DB_PASSWORD', default='octara_hub'),
            'HOST': config('DB_HOST', default='db'),
            'PORT': config('DB_PORT', default='5432'),
            'CONN_MAX_AGE': config('DB_CONN_MAX_AGE', default=60, cast=int),
        }
    }

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# CORS
# Frontend origin for browser API calls.
CORS_ALLOWED_ORIGINS = [
    config('FRONTEND_URL', default='http://localhost:5174'),
]
CORS_ALLOW_CREDENTIALS = True

# Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
    'DEFAULT_FILTER_BACKENDS': (
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
}

# JWT
# Access/refresh durations are configured in minutes via env.
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=config('JWT_ACCESS_TOKEN_LIFETIME', default=30, cast=int)),
    'REFRESH_TOKEN_LIFETIME': timedelta(minutes=config('JWT_REFRESH_TOKEN_LIFETIME', default=10080, cast=int)),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': False,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# File Storage
STORAGE_ROOT = Path(config('STORAGE_ROOT', default=str(BASE_DIR / 'storage')))
# 0 means "no app-level max upload size" (unlimited by Octara Hub).
MAX_UPLOAD_SIZE = config('MAX_UPLOAD_SIZE', default=0, cast=int)
# Stream uploads directly to temporary files instead of buffering in memory.
FILE_UPLOAD_MAX_MEMORY_SIZE = 0

# App settings
APP_NAME = config('APP_NAME', default='Octara Hub')
FRONTEND_URL = config('FRONTEND_URL', default='http://localhost:5174')
DEFAULT_LOCALE = config('DEFAULT_LOCALE', default='en')

# Email
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = config('EMAIL_HOST', default='')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = True
