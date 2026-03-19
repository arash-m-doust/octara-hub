#!/usr/bin/env python
"""
cPanel Setup Script for BexChat
Run this once after uploading files to cPanel.
Can be triggered via cPanel's "Python App" → "Run Script" or via SSH if available.

Usage: python setup_cpanel.py
"""
import os
import sys
import subprocess

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'bexchat.settings')

def main():
    # Install dependencies
    print("=== Installing Python dependencies ===")
    subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'], check=True)

    # Run migrations
    print("\n=== Running database migrations ===")
    import django
    django.setup()
    from django.core.management import call_command
    call_command('migrate', '--run-syncdb')

    # Collect static files
    print("\n=== Collecting static files ===")
    call_command('collectstatic', '--noinput')

    print("\n=== Setup complete! ===")
    print("Don't forget to create a superuser:")
    print(f"  {sys.executable} manage.py createsuperuser")

if __name__ == '__main__':
    main()
