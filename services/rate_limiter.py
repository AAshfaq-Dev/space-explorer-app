# Simple rate limiting
import os

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


def create_limiter(app):
    """Create rate limiter for the Flask app"""
    storage_uri = os.environ.get("REDIS_URL", "memory://")

    limiter = Limiter(
        app=app,  # Explicitly use app= keyword
        key_func=get_remote_address,
        storage_uri=storage_uri,
        default_limits=["1000 per hour", "100 per minute"],
    )

    return limiter
