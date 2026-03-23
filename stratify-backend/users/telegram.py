"""Optional Telegram notifications (no-op if token unset)."""
import logging

from decouple import config

logger = logging.getLogger(__name__)


def send_telegram_message_optional(text: str) -> None:
    token = config('TELEGRAM_BOT_TOKEN', default='')
    chat_id = config('TELEGRAM_CHAT_ID', default='')
    if not token or not chat_id:
        return
    try:
        import requests

        url = f'https://api.telegram.org/bot{token}/sendMessage'
        requests.post(url, json={'chat_id': chat_id, 'text': text[:4000]}, timeout=10)
    except Exception as exc:  # noqa: BLE001
        logger.warning('Telegram send failed: %s', exc)
