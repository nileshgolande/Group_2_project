"""Load or refresh Indian equities from yfinance (NSE .NS). Extend NIFTY_NS_SYMBOLS for full Nifty 200."""
from decimal import Decimal

import yfinance as yf
from django.core.management.base import BaseCommand

from stocks.models import Stock

# NSE suffix for yfinance. Strip .NS before storing in DB.
NIFTY_NS_SYMBOLS = [
    'RELIANCE.NS',
    'TCS.NS',
    'HDFCBANK.NS',
    'INFY.NS',
    'ICICIBANK.NS',
    'WIPRO.NS',
    'BAJFINANCE.NS',
    'ITC.NS',
    'MARUTI.NS',
    'SBIN.NS',
    'HINDUNILVR.NS',
    'LT.NS',
    'KOTAKBANK.NS',
    'AXISBANK.NS',
    'SUNPHARMA.NS',
    'TITAN.NS',
    'JSWSTEEL.NS',
    'TECHM.NS',
    'POWERGRID.NS',
    'TATASTEEL.NS',
    'NTPC.NS',
    'BAJAJ-AUTO.NS',
    'BHARTIARTL.NS',
    'ULTRACEMCO.NS',
    'EICHERMOT.NS',
    'SBICARD.NS',
    'BIOCON.NS',
    'COLPAL.NS',
    'LUPIN.NS',
    'ADANIPORTS.NS',
    'SIEMENS.NS',
    'DRREDDY.NS',
    'AUROPHARMA.NS',
    'ASHOKLEY.NS',
    'BANKBARODA.NS',
    'HAVELLS.NS',
    'GUJGASLTD.NS',
    'INDIGO.NS',
    'BRITANNIA.NS',
    'CIPLA.NS',
    'HEROMOTOCO.NS',
    'NESTLEIND.NS',
    'MCDOWELL-N.NS',
    'APOLLOHOSP.NS',
    'BERGEPAINT.NS',
    'BEL.NS',
    'BLUESTARCO.NS',
    'AMBUJACEM.NS',
    'GRASIM.NS',
    'TORNTPHARM.NS',
    'PAGEIND.NS',
    'EXIDEIND.NS',
    'ONGC.NS',
    'COALINDIA.NS',
    'TATAMOTORS.NS',
    'ADANIENT.NS',
    'DIVISLAB.NS',
    'HCLTECH.NS',
    'PIDILITIND.NS',
    'DABUR.NS',
    'VEDL.NS',
    'BPCL.NS',
    'INDUSINDBK.NS',
    'HDFCLIFE.NS',
    'SBILIFE.NS',
    'ICICIPRULI.NS',
    'M&M.NS',
    'TATACONSUM.NS',
    'BAJAJFINSV.NS',
    'HINDALCO.NS',
    'UPL.NS',
    'LTIM.NS',
]


def _dec(v, default=None):
    if v is None:
        return default
    try:
        return Decimal(str(float(v)))
    except (TypeError, ValueError):
        return default


class Command(BaseCommand):
    help = 'Upsert stocks from yfinance using NSE symbols (extend list for Nifty 200).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--limit',
            type=int,
            default=0,
            help='Process only first N symbols (0 = all).',
        )

    def handle(self, *args, **options):
        limit = options['limit']
        symbols = NIFTY_NS_SYMBOLS[:limit] if limit > 0 else NIFTY_NS_SYMBOLS
        self.stdout.write(f'Loading {len(symbols)} symbols from yfinance...')

        for symbol in symbols:
            try:
                ticker = yf.Ticker(symbol)
                hist = ticker.history(period='1y', auto_adjust=True)

                if hist.empty:
                    self.stdout.write(self.style.WARNING(f'No history: {symbol}'))
                    continue

                db_symbol = symbol.replace('.NS', '').upper()
                # Prefer history for price (live daily bar); .info often hits Yahoo 429
                lp = float(hist['Close'].iloc[-1])
                prev_close = float(hist['Close'].iloc[-2]) if len(hist) > 1 else lp
                change_pct = ((lp - prev_close) / prev_close * 100) if prev_close else 0.0

                high_52w = float(hist['Close'].max())
                low_52w = float(hist['Close'].min())

                info = {}
                try:
                    info = ticker.info or {}
                except Exception:
                    pass

                dy = info.get('dividendYield')
                if dy is not None and dy < 1 and dy > 0:
                    dy = dy * 100

                pe = info.get('trailingPE')
                pb = info.get('priceToBook')
                mc = info.get('marketCap')
                long_name = info.get('longName') or info.get('shortName')

                _, created = Stock.objects.update_or_create(
                    symbol=db_symbol,
                    defaults={
                        'name': (long_name or db_symbol)[:255],
                        'sector': (info.get('sector') or 'Unknown')[:100],
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
                    },
                )
                status = 'Created' if created else 'Updated'
                self.stdout.write(self.style.SUCCESS(f'{status}: {db_symbol}'))
            except Exception as exc:  # noqa: BLE001
                self.stdout.write(self.style.ERROR(f'{symbol}: {exc}'))

        self.stdout.write(self.style.SUCCESS('Done.'))
