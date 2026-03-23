"""
One-shot API smoke test. Run: python smoke_api.py
Uses a live NSE symbol via yfinance (RELIANCE); skips holding tests if Yahoo is unreachable.
"""
import os
import sys
import uuid

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

import django

django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

User = get_user_model()

# Must resolve via Yahoo as RELIANCE.NS (no synthetic seed rows).
TEST_SYMBOL = 'RELIANCE'


def ok(name, cond, detail=''):
    status = 'PASS' if cond else 'FAIL'
    extra = f' — {detail}' if detail else ''
    print(f'[{status}] {name}{extra}')
    return cond


def main():
    client = APIClient()
    failures = 0

    r = client.get('/api/stocks/')
    failures += not ok('GET /api/stocks/', r.status_code == 200, f'status={r.status_code}')
    if r.status_code == 200:
        body = r.json()
        failures += not ok('stocks list shape', 'results' in body or isinstance(body, list), str(body)[:120])

    r = client.get(f'/api/stocks/{TEST_SYMBOL}/')
    live_ok = r.status_code == 200
    failures += not ok(f'GET /api/stocks/{TEST_SYMBOL}/ (yfinance)', live_ok, f'status={r.status_code}')

    if live_ok:
        r = client.get(f'/api/stocks/{TEST_SYMBOL}/forecast/')
        failures += not ok('GET forecast', r.status_code == 200, f'status={r.status_code}')

        r = client.get(f'/api/stocks/{TEST_SYMBOL}/sentiment/')
        failures += not ok('GET sentiment', r.status_code == 200, f'status={r.status_code}')
    else:
        print('[SKIP] forecast/sentiment — Yahoo unavailable for RELIANCE')

    r = client.get('/api/stocks/NOPE999ZZZINVALID/')
    failures += not ok('GET invalid symbol 404', r.status_code == 404, f'status={r.status_code}')

    r = client.get('/api/portfolio/')
    failures += not ok('GET /api/portfolio/ unauthenticated 401', r.status_code == 401, f'status={r.status_code}')

    email = f'smoke_{uuid.uuid4().hex[:8]}@test.local'
    username = f'smoke_{uuid.uuid4().hex[:10]}'
    r = client.post(
        '/api/auth/register/',
        {'username': username, 'email': email, 'password': 'SmokeTest123!'},
        format='json',
    )
    failures += not ok('POST register', r.status_code == 201, f'status={r.status_code} {r.content[:200]}')
    access = refresh = None
    if r.status_code == 201:
        data = r.json()
        access = data.get('access')
        refresh = data.get('refresh')
        failures += not ok('register returns access+refresh', bool(access and refresh))

    r = client.post(
        '/api/auth/login/',
        {'email': email, 'password': 'SmokeTest123!'},
        format='json',
    )
    failures += not ok('POST login', r.status_code == 200, f'status={r.status_code}')
    if r.status_code == 200:
        data = r.json()
        access = data.get('access') or access
        refresh = data.get('refresh') or refresh

    if refresh:
        r = client.post('/api/auth/refresh/', {'refresh': refresh}, format='json')
        failures += not ok('POST token refresh', r.status_code == 200, f'status={r.status_code}')
        if r.status_code == 200:
            access = r.json().get('access') or access

    client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}' if access else '')

    r = client.get('/api/auth/profile/')
    failures += not ok('GET profile (JWT)', r.status_code == 200, f'status={r.status_code}')

    r = client.post(
        '/api/auth/set-mpin/',
        {'password': 'SmokeTest123!', 'mpin': '1234'},
        format='json',
    )
    failures += not ok('POST set-mpin', r.status_code == 200, f'status={r.status_code}')

    r = client.post('/api/auth/verify-mpin/', {'mpin': '1234'}, format='json')
    mpin_token = None
    failures += not ok('POST verify-mpin', r.status_code == 200, f'status={r.status_code}')
    if r.status_code == 200:
        mpin_token = (r.json().get('data') or {}).get('mpin_token')

    r = client.get('/api/portfolio/')
    failures += not ok('GET portfolio (auth)', r.status_code == 200, f'status={r.status_code}')

    if live_ok and access and mpin_token:
        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        r = client.post(
            '/api/portfolio/add/',
            {
                'symbol': TEST_SYMBOL,
                'quantity': 1,
                'purchase_price': 1.0,
                'purchase_date': '2024-01-15',
            },
            format='json',
        )
        failures += not ok(
            'POST portfolio/add without MPin header 403',
            r.status_code == 403,
            f'status={r.status_code}',
        )

        client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
        r = client.post(
            '/api/portfolio/add/',
            {
                'symbol': TEST_SYMBOL,
                'quantity': 1,
                'purchase_price': 1.0,
                'purchase_date': '2024-01-15',
            },
            HTTP_X_MPIN_TOKEN=mpin_token,
            format='json',
        )
        ok_add = r.status_code in (201, 400)
        failures += not ok(
            'POST portfolio/add with MPin',
            ok_add,
            f'status={r.status_code} (400 if duplicate holding)',
        )
        holding_id = None
        if r.status_code == 201:
            holding_id = r.json().get('data', {}).get('id')
        elif r.status_code == 400:
            r2 = client.get('/api/portfolio/')
            if r2.status_code == 200:
                rows = r2.json().get('data') or []
                for h in rows:
                    if (h.get('stock') or {}).get('symbol') == TEST_SYMBOL:
                        holding_id = h.get('id')
                        break

        r = client.get('/api/portfolio/')
        failures += not ok('GET portfolio with holding', r.status_code == 200, f'status={r.status_code}')

        if holding_id and mpin_token:
            client.credentials(HTTP_AUTHORIZATION=f'Bearer {access}')
            r = client.delete(
                f'/api/portfolio/{holding_id}/',
                HTTP_X_MPIN_TOKEN=mpin_token,
            )
            failures += not ok('DELETE holding', r.status_code == 204, f'status={r.status_code}')
    elif not live_ok:
        print('[SKIP] portfolio add/delete — need live Yahoo symbol in DB')

    client.credentials()
    sid = str(uuid.uuid4())
    r = client.post(
        '/api/chat/',
        {'query': 'What is diversification?', 'session_id': sid},
        format='json',
    )
    failures += not ok('POST /api/chat/', r.status_code == 200, f'status={r.status_code}')
    if r.status_code == 200:
        failures += not ok('chat has response text', bool((r.json().get('data') or {}).get('response')))

    r = client.get('/api/chat/history/', {'session_id': sid})
    failures += not ok('GET chat history', r.status_code == 200, f'status={r.status_code}')

    User.objects.filter(email=email).delete()
    User.objects.filter(username=username).delete()

    print('\nSummary:', 'all OK' if failures == 0 else f'{failures} check(s) failed')
    sys.exit(0 if failures == 0 else 1)


if __name__ == '__main__':
    main()
