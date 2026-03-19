import os
import sys

# Add the server directory to the Python path
sys.path.insert(0, os.path.dirname(__file__))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bexchat.settings')

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
