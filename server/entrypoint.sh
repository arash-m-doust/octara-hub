#!/bin/sh
set -e

# Schema must be current before app starts serving traffic.
python manage.py migrate --noinput
python manage.py collectstatic --noinput

# SSE bus is in-memory in current implementation; keep one worker
# to avoid cross-worker event loss until external pub/sub is introduced.
exec gunicorn octara_hub.wsgi:application --bind 0.0.0.0:8010 --workers 1 --timeout 120
