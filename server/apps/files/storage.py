import hashlib
import os
import uuid
from datetime import datetime
from pathlib import Path
from django.conf import settings


def get_channel_upload_path(workspace_id, channel_id, filename):
    now = datetime.now()
    safe_name = f"{uuid.uuid4().hex[:12]}_{filename}"
    return Path(
        settings.STORAGE_ROOT,
        'workspaces', str(workspace_id),
        'channels', str(channel_id),
        str(now.year), f'{now.month:02d}',
        safe_name,
    )


def get_dm_upload_path(user_id, thread_id, filename):
    now = datetime.now()
    safe_name = f"{uuid.uuid4().hex[:12]}_{filename}"
    return Path(
        settings.STORAGE_ROOT,
        'users', str(user_id),
        'dm', str(thread_id),
        str(now.year), f'{now.month:02d}',
        safe_name,
    )


def get_avatar_path(user_id, filename):
    ext = filename.rsplit('.', 1)[-1] if '.' in filename else 'png'
    return Path(
        settings.STORAGE_ROOT,
        'avatars',
        f'{user_id}_{uuid.uuid4().hex[:8]}.{ext}',
    )


def save_uploaded_file(file_obj, dest_path):
    """Save an uploaded file and return its checksum."""
    dest_path = Path(dest_path)
    dest_path.parent.mkdir(parents=True, exist_ok=True)

    hasher = hashlib.sha256()
    with open(dest_path, 'wb') as dest:
        for chunk in file_obj.chunks():
            dest.write(chunk)
            hasher.update(chunk)

    return hasher.hexdigest()


def delete_file(path):
    """Delete a file from storage."""
    try:
        os.remove(path)
    except OSError:
        pass
