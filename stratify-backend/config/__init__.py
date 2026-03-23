try:
    from .celery import app as celery_app
except ImportError:  # e.g. before `pip install -r requirements.txt`
    celery_app = None

__all__ = ('celery_app',)
