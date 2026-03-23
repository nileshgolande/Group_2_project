"""Load / refresh the curated 100-symbol universe: 3y daily history, sparkline, 7d trend, fundamentals."""
from __future__ import annotations

import time
from decimal import Decimal

import yfinance as yf
from django.core.management.base import BaseCommand
from django.utils import timezone

from stocks.ml_rnn import normalized_sparkline, seven_day_trend_pct
from stocks.models import Stock
from stocks.universe import UNIVERSE_PAIRS, quote_currency_for_db_symbol


def _dec(v, default=None):
    if v is None:
        return default
    try:
        return Decimal(str(float(v)))
    except (TypeError, ValueError):
        return default


class Command(BaseCommand):
    help = 'Upsert 100 curated symbols with 3y Yahoo daily data, sparkline, and 7d trend.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--sleep',
            type=float,
            default=0.18,
            help='Seconds between Yahoo calls (rate limits).',
        )

    def handle(self, *args, **options):
        delay = float(options['sleep'])
        self.stdout.write(f'Seeding {len(UNIVERSE_PAIRS)} symbols (3y daily)…')

        for i, (db_symbol, yahoo_ticker) in enumerate(UNIVERSE_PAIRS):
            if i and delay:
                time.sleep(delay)
            try:
                ticker = yf.Ticker(yahoo_ticker)
                hist = ticker.history(period='3y', interval='1d', auto_adjust=True)
                if hist.empty:
                    self.stdout.write(self.style.WARNING(f'No data: {db_symbol} ({yahoo_ticker})'))
                    continue

                closes = hist['Close'].values.astype(float)
                lp = float(closes[-1])
                prev_close = float(closes[-2]) if len(closes) > 1 else lp
                change_pct = ((lp - prev_close) / prev_close * 100) if prev_close else 0.0

                tail_52w = closes[-252:] if len(closes) >= 252 else closes
                high_52w = float(tail_52w.max())
                low_52w = float(tail_52w.min())

                t7 = seven_day_trend_pct(closes)
                spark = normalized_sparkline(closes)

                info = {}
                try:
                    info = ticker.info or {}
                except Exception:
                    pass

                pe = info.get('trailingPE')
                pb = info.get('priceToBook')
                mc = info.get('marketCap')
                long_name = info.get('longName') or info.get('shortName')
                sector = (info.get('sector') or 'Uncategorized')[:100]
                dy = info.get('dividendYield')
                if dy is not None and dy < 1 and dy > 0:
                    dy = dy * 100

                _, created = Stock.objects.update_or_create(
                    symbol=db_symbol,
                    defaults={
                        'name': (long_name or db_symbol)[:255],
                        'sector': sector,
                        'current_price': _dec(lp, Decimal('0')) or Decimal('0'),
                        'change_percent': _dec(change_pct, Decimal('0')) or Decimal('0'),
                        'pe_ratio': _dec(pe) if pe else None,
                        'pb_ratio': _dec(pb) if pb else None,
                        'market_cap': int(mc) if mc else None,
                        'dividend_yield': _dec(dy) if dy else None,
                        'price_52w_high': _dec(high_52w, Decimal('0')) or Decimal('0'),
                        'price_52w_low': _dec(low_52w, Decimal('0')) or Decimal('0'),
                        'description': (info.get('longBusinessSummary') or '')[:5000],
                        'website': (info.get('website') or '')[:200] or None,
                        'quote_currency': quote_currency_for_db_symbol(db_symbol),
                        'change_7d_percent': _dec(t7) if t7 is not None else None,
                        'ml_sparkline': spark,
                        'last_price_update': timezone.now(),
                    },
                )
                tag = 'Created' if created else 'Updated'
                self.stdout.write(self.style.SUCCESS(f'{tag}: {db_symbol}'))
            except Exception as exc:  # noqa: BLE001
                self.stdout.write(self.style.ERROR(f'{db_symbol}: {exc}'))

        self.stdout.write(
            self.style.NOTICE(
                'Run `python manage.py train_universe_ml` to fit the LSTM/MLP and populate RNN signals.'
            )
        )
        self.stdout.write(self.style.SUCCESS('Done.'))
