"""Seed / refresh 200 US tickers into the Stock table using Yahoo (yfinance).

Universe: US
DB symbol: the Yahoo ticker symbol (e.g. BRK-B, BF-B).
"""

from __future__ import annotations

import time
from decimal import Decimal

import pandas as pd
import yfinance as yf
from django.core.management.base import BaseCommand
from django.utils import timezone

from stocks.ml_rnn import normalized_sparkline, seven_day_trend_pct
from stocks.models import Stock


def _dec(v, default=None):
    if v is None:
        return default
    try:
        return Decimal(str(float(v)))
    except (TypeError, ValueError):
        return default


class Command(BaseCommand):
    help = 'Seed 200 US equities into DB using yfinance (3y daily history).'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=200, help='How many symbols to seed.')
        parser.add_argument('--sleep', type=float, default=0.18, help='Seconds between Yahoo calls.')
        parser.add_argument(
            '--with-info',
            action='store_true',
            help='Fetch ticker.info for metadata (slower; disabled by default).',
        )
        parser.add_argument(
            '--chunk-size',
            type=int,
            default=25,
            help='Batch size for yf.download.',
        )

    def handle(self, *args, **options):
        limit = int(options['limit'])
        delay = float(options['sleep'])
        with_info = bool(options['with_info'])
        chunk_size = max(1, int(options['chunk_size']))

        # Source tickers from Wikipedia (S&P500 list) and take first 200.
        url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
        self.stdout.write('Fetching US tickers (S&P500) from Wikipedia…')
        df = pd.read_html(url)[0]
        raw = df[['Symbol', 'Security']].copy()

        # Yahoo uses '-' instead of '.' for some tickers (e.g. BRK.B -> BRK-B).
        tickers: list[tuple[str, str]] = []
        seen: set[str] = set()
        for _, row in raw.iterrows():
            t = str(row['Symbol'])
            sec = str(row['Security']) if row.get('Security') is not None else t
            t2 = t.replace('.', '-').upper().strip()
            if not t2 or t2 in seen:
                continue
            seen.add(t2)
            tickers.append((t2, sec))
            if len(tickers) >= limit:
                break

        self.stdout.write(f'Seeding {len(tickers)} US symbols…')
        for i in range(0, len(tickers), chunk_size):
            chunk = tickers[i : i + chunk_size]
            symbols = [s for s, _ in chunk]
            if i and delay:
                time.sleep(delay)
            try:
                hist_df = yf.download(
                    tickers=symbols,
                    period='3y',
                    interval='1d',
                    auto_adjust=True,
                    group_by='ticker',
                    threads=True,
                    progress=False,
                )
            except Exception as exc:  # noqa: BLE001
                self.stdout.write(self.style.ERROR(f'Batch download failed ({symbols[:3]}...): {exc}'))
                continue

            for ticker, sec_name in chunk:
                try:
                    if getattr(hist_df, 'empty', True):
                        self.stdout.write(self.style.WARNING(f'No data: {ticker}'))
                        continue
                    if hasattr(hist_df.columns, 'nlevels') and hist_df.columns.nlevels > 1:
                        if ticker not in hist_df.columns.get_level_values(0):
                            self.stdout.write(self.style.WARNING(f'No data: {ticker}'))
                            continue
                        hist = hist_df[ticker]
                    else:
                        hist = hist_df
                    if hist.empty or 'Close' not in hist.columns:
                        self.stdout.write(self.style.WARNING(f'No data: {ticker}'))
                        continue

                    close_s = pd.Series(hist['Close']).dropna()
                    if close_s.empty:
                        self.stdout.write(self.style.WARNING(f'No data: {ticker}'))
                        continue
                    closes = close_s.values.astype(float)
                    lp = float(closes[-1])
                    prev_close = float(closes[-2]) if len(closes) > 1 else lp
                    change_pct = ((lp - prev_close) / prev_close * 100) if prev_close else 0.0

                    tail_52w = closes[-252:] if len(closes) >= 252 else closes
                    high_52w = float(tail_52w.max())
                    low_52w = float(tail_52w.min())

                    t7 = seven_day_trend_pct(closes)
                    spark = normalized_sparkline(closes)

                    info = {}
                    if with_info:
                        try:
                            info = yf.Ticker(ticker).info or {}
                        except Exception:
                            info = {}

                    pe = info.get('trailingPE')
                    pb = info.get('priceToBook')
                    mc = info.get('marketCap')
                    long_name = info.get('longName') or info.get('shortName') or sec_name or ticker
                    sector = (info.get('sector') or 'Uncategorized')[:100]
                    dy = info.get('dividendYield')
                    if dy is not None and dy < 1 and dy > 0:
                        dy = dy * 100

                    _, created = Stock.objects.update_or_create(
                        symbol=ticker,
                        defaults={
                            'universe': 'US',
                            'name': (long_name or ticker)[:255],
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
                            'quote_currency': 'USD',
                            'change_7d_percent': _dec(t7) if t7 is not None else None,
                            'ml_sparkline': spark,
                            'last_price_update': timezone.now(),
                        },
                    )
                    tag = 'Created' if created else 'Updated'
                    self.stdout.write(self.style.SUCCESS(f'{tag}: {ticker}'))
                except Exception as exc:  # noqa: BLE001
                    self.stdout.write(self.style.ERROR(f'{ticker}: {exc}'))

        self.stdout.write(self.style.NOTICE('Run `python manage.py train_universe_ml --universe US` next.'))
        self.stdout.write(self.style.SUCCESS('Done.'))

