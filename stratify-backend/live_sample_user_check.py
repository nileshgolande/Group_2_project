"""
Hit the running dev server as a fixed sample user. Run while:
  python manage.py runserver

Usage: python live_sample_user_check.py
"""
from __future__ import annotations

import json
import sys
import uuid

import requests

BASE = 'http://127.0.0.1:8000/api'

SAMPLE = {
    'username': 'sample_stratify',
    'email': 'sample@stratify.demo',
    'password': 'StratifyDemo123!',
}


def ok(name: str, cond: bool, detail: str = '') -> bool:
    s = 'PASS' if cond else 'FAIL'
    print(f'[{s}] {name}' + (f' — {detail}' if detail else ''))
    return cond


def main() -> int:
    s = requests.Session()
    s.headers['Content-Type'] = 'application/json'
    fails = 0

    # Health: stocks (public)
    r = s.get(f'{BASE}/stocks/')
    fails += not ok('GET /stocks/', r.status_code == 200, str(r.status_code))
    payload = r.json() if r.status_code == 200 else {}
    results = payload.get('results') or []
    symbol = (results[0].get('symbol') if results else None)
    if not symbol:
        for cand in ('RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'ICICIBANK'):
            t = s.get(f'{BASE}/stocks/{cand}/')
            if t.status_code == 200:
                symbol = cand
                break
        if not symbol:
            print(
                '[WARN] No stocks in DB. Load some: python manage.py load_nifty200 --limit 10'
            )
            symbol = 'RELIANCE'

    r = s.get(f'{BASE}/stocks/{symbol}/')
    stock_ok = r.status_code == 200
    fails += not ok(f'GET /stocks/{symbol}/', stock_ok, str(r.status_code))

    r = s.get(f'{BASE}/stocks/{symbol}/forecast/')
    fails += not ok('GET forecast', r.status_code == 200, str(r.status_code))

    r = s.get(f'{BASE}/stocks/{symbol}/sentiment/')
    fails += not ok('GET sentiment', r.status_code == 200, str(r.status_code))

    r = s.get(f'{BASE}/portfolio/')
    fails += not ok('portfolio without auth 401', r.status_code == 401, str(r.status_code))

    # Register or login sample user
    r = s.post(f'{BASE}/auth/register/', json=SAMPLE)
    if r.status_code == 201:
        reg = r.json()
        access = reg.get('access')
        refresh = reg.get('refresh')
        fails += not ok('POST register (sample user)', bool(access), 'created')
    elif r.status_code == 400 and 'exists' in (r.text or '').lower():
        r = s.post(
            f'{BASE}/auth/login/',
            json={'email': SAMPLE['email'], 'password': SAMPLE['password']},
        )
        fails += not ok('POST login (sample user)', r.status_code == 200, str(r.status_code))
        body = r.json() if r.status_code == 200 else {}
        access = body.get('access')
        refresh = body.get('refresh')
    else:
        print('Register response:', r.status_code, r.text[:500])
        fails += not ok('POST register', False, str(r.status_code))
        access = refresh = None

    if not access:
        print('\nSummary: cannot continue without JWT')
        return 1

    auth = {'Authorization': f'Bearer {access}'}

    if refresh:
        r = s.post(f'{BASE}/auth/refresh/', json={'refresh': refresh})
        fails += not ok('POST /auth/refresh/', r.status_code == 200, str(r.status_code))
        if r.status_code == 200:
            access = r.json().get('access') or access
            auth = {'Authorization': f'Bearer {access}'}

    r = s.get(f'{BASE}/auth/profile/', headers=auth)
    fails += not ok('GET /auth/profile/', r.status_code == 200, str(r.status_code))

    r = s.post(
        f'{BASE}/auth/set-mpin/',
        headers=auth,
        json={'password': SAMPLE['password'], 'mpin': '4242'},
    )
    fails += not ok('POST /auth/set-mpin/', r.status_code in (200, 400), str(r.status_code))

    r = s.post(f'{BASE}/auth/verify-mpin/', headers=auth, json={'mpin': '4242'})
    mpin_token = None
    if r.status_code == 200:
        mpin_token = (r.json().get('data') or {}).get('mpin_token')
    fails += not ok('POST /auth/verify-mpin/', r.status_code == 200, str(r.status_code))

    r = s.get(f'{BASE}/portfolio/', headers=auth)
    fails += not ok('GET /portfolio/ (auth)', r.status_code == 200, str(r.status_code))

    r = s.post(
        f'{BASE}/portfolio/add/',
        headers={**auth, 'X-MPin-Token': ''},
        json={
            'symbol': symbol,
            'quantity': 1,
            'purchase_price': 1.0,
            'purchase_date': '2024-06-01',
        },
    )
    fails += not ok('POST /portfolio/add/ without MPin 403', r.status_code == 403, str(r.status_code))

    holding_id = None
    if mpin_token and stock_ok:
        r = s.post(
            f'{BASE}/portfolio/add/',
            headers={**auth, 'X-MPin-Token': mpin_token},
            json={
                'symbol': symbol,
                'quantity': 1,
                'purchase_price': 1.0,
                'purchase_date': '2024-06-01',
            },
        )
        fails += not ok('POST /portfolio/add/ with MPin', r.status_code in (201, 400), str(r.status_code))
        if r.status_code == 201:
            holding_id = (r.json().get('data') or {}).get('id')
        elif r.status_code == 400 and 'already' in (r.json().get('error') or '').lower():
            ok('holding already exists (OK)', True)
    elif mpin_token and not stock_ok:
        fails += not ok('POST /portfolio/add/ with MPin', False, 'skipped (no stock in DB)')

    r = s.get(f'{BASE}/portfolio/', headers=auth)
    fails += not ok('GET /portfolio/ after add', r.status_code == 200, str(r.status_code))

    if holding_id and mpin_token:
        r = s.delete(
            f'{BASE}/portfolio/{holding_id}/',
            headers={**auth, 'X-MPin-Token': mpin_token},
        )
        fails += not ok('DELETE /portfolio/{id}/', r.status_code == 204, str(r.status_code))
    elif mpin_token:
        # re-fetch holdings to delete first holding if we skipped create
        r = s.get(f'{BASE}/portfolio/', headers=auth)
        data = r.json().get('data') or []
        if isinstance(data, list) and data:
            hid = data[0].get('id')
            if hid:
                r = s.delete(
                    f'{BASE}/portfolio/{hid}/',
                    headers={**auth, 'X-MPin-Token': mpin_token},
                )
                fails += not ok('DELETE existing holding', r.status_code == 204, str(r.status_code))

    sid = str(uuid.uuid4())
    r = s.post(f'{BASE}/chat/', json={'query': 'What is an index fund?', 'session_id': sid})
    fails += not ok('POST /chat/', r.status_code == 200, str(r.status_code))
    if r.status_code == 200:
        msg = (r.json().get('data') or {}).get('response') or ''
        fails += not ok('chat response non-empty', len(msg) > 0, f'{len(msg)} chars')

    r = s.get(f'{BASE}/chat/history/', params={'session_id': sid})
    fails += not ok('GET /chat/history/', r.status_code == 200, str(r.status_code))

    print('\nSample user:', SAMPLE['email'], '/', SAMPLE['password'])
    print('Summary:', 'all OK' if fails == 0 else f'{fails} check(s) failed')
    return 0 if fails == 0 else 1


if __name__ == '__main__':
    try:
        sys.exit(main())
    except requests.exceptions.ConnectionError:
        print('FAIL: cannot connect to', BASE, '— start server: python manage.py runserver')
        sys.exit(1)
