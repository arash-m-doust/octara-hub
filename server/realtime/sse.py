"""
Server-Sent Events (SSE) realtime layer.

This provides a simple pub/sub mechanism using in-memory queues.
For production with multiple workers, replace with a database-backed
or Redis-backed pub/sub (when available).

For < 50 users on a single process, in-memory queues work fine.
"""
import json
import queue
import threading
import time
from collections import defaultdict

# In-memory pub/sub for single-process deployment
_subscribers = defaultdict(list)  # channel -> [queue, ...]
_lock = threading.Lock()


def subscribe(channel):
    """Subscribe to a channel. Returns a queue that receives events."""
    q = queue.Queue(maxsize=100)
    with _lock:
        _subscribers[channel].append(q)
    return q


def unsubscribe(channel, q):
    """Unsubscribe from a channel."""
    with _lock:
        try:
            _subscribers[channel].remove(q)
        except ValueError:
            pass
        if not _subscribers[channel]:
            del _subscribers[channel]


def publish_event(channel, event_type, data):
    """Publish an event to all subscribers of a channel."""
    event = {
        'type': event_type,
        'data': data,
        'timestamp': time.time(),
    }
    with _lock:
        dead_queues = []
        for q in _subscribers.get(channel, []):
            try:
                q.put_nowait(event)
            except queue.Full:
                dead_queues.append(q)
        for q in dead_queues:
            try:
                _subscribers[channel].remove(q)
            except ValueError:
                pass
