"""Minimal Gemini calls — short system prompt to reduce tokens."""
import logging

from django.conf import settings

logger = logging.getLogger(__name__)

SYSTEM = (
    'You are a concise finance assistant. Answer in at most 3 short sentences. '
    'No disclaimers unless asked. Focus on stocks, indices, risk, portfolio concepts.'
)


def generate_reply(user_query: str) -> str:
    if not settings.GEMINI_API_KEY:
        return (
            'AI is offline (set GEMINI_API_KEY). Meanwhile: Indian large caps include '
            'RELIANCE, TCS, HDFCBANK — check fundamentals before investing.'
        )

    try:
        import google.generativeai as genai

        genai.configure(api_key=settings.GEMINI_API_KEY)
    except Exception as exc:  # noqa: BLE001
        logger.exception('Gemini configure failed: %s', exc)
        return 'AI service unavailable. Try again later.'

    prompt = f'{SYSTEM}\n\nUser: {user_query.strip()[:2000]}'

    for model_name in ('gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-pro'):
        try:
            model = genai.GenerativeModel(model_name)
            resp = model.generate_content(prompt)
            text = (getattr(resp, 'text', None) or '').strip()
            if text:
                return text
        except Exception as exc:  # noqa: BLE001
            logger.debug('Gemini model %s failed: %s', model_name, exc)
            continue

    return 'Could not generate a response. Try rephrasing your question.'
