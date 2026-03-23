"""
Curated universe helpers for Stratify.
Maps DB symbol (no .NS) to Yahoo Finance ticker.
"""
from __future__ import annotations

# 27 global / US / crypto / index tickers (DB symbol → Yahoo)
_GLOBAL_UNIVERSE: list[tuple[str, str]] = [
    ('BTC-USD', 'BTC-USD'),
    ('ETH-USD', 'ETH-USD'),
    ('SOL-USD', 'SOL-USD'),
    ('DJI', '^DJI'),
    ('GSPC', '^GSPC'),
    ('IXIC', '^IXIC'),
    ('NSEI', '^NSEI'),
    ('BSESN', '^BSESN'),
    ('VIX', '^VIX'),
    ('GLD', 'GLD'),
    ('SLV', 'SLV'),
    ('AAPL', 'AAPL'),
    ('MSFT', 'MSFT'),
    ('GOOGL', 'GOOGL'),
    ('AMZN', 'AMZN'),
    ('NVDA', 'NVDA'),
    ('META', 'META'),
    ('TSLA', 'TSLA'),
    ('ASML', 'ASML'),
    ('JPM', 'JPM'),
    ('V', 'V'),
    ('MA', 'MA'),
    ('UNH', 'UNH'),
    ('JNJ', 'JNJ'),
    ('WMT', 'WMT'),
    ('PG', 'PG'),
    ('XOM', 'XOM'),
]

_NSE_YAHOO = [
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
    'GODREJCP.NS',
    # Additional NSE tickers to reach India-100 universe
    'ASIANPAINT.NS',
    'ACC.NS',
    'SHREECEM.NS',
    'MARICO.NS',
    'BHEL.NS',
    'TATAPOWER.NS',
    'ADANIPOWER.NS',
    'IOC.NS',
    'PETRONET.NS',
    'GAIL.NS',
    'HINDZINC.NS',
    'RBLBANK.NS',
    'BANDHANBNK.NS',
    'YESBANK.NS',
    'TCIEXP.NS',
    'KPRMILL.NS',
    'TVSMOTOR.NS',
    'WOCKPHARMA.NS',
    'UJJIVANS.NS',
    'VGUARD.NS',
    'LTTS.NS',
    'HDFCAMC.NS',
    'DMART.NS',
    'MINDTREE.NS',
    'COFORGE.NS',
    'SYNGENE.NS',
    'CROMPTON.NS',
    'JINDALSTEL.NS',
]

INDIA_UNIVERSE_PAIRS: list[tuple[str, str]] = [
    (y.replace('.NS', '').upper(), y) for y in _NSE_YAHOO
]
INDIA_DB_SYMBOLS: list[str] = [db for db, _ in INDIA_UNIVERSE_PAIRS]

# Fixed order: global first, then NSE (exactly 100 rows when all load)
UNIVERSE_PAIRS: list[tuple[str, str]] = _GLOBAL_UNIVERSE + INDIA_UNIVERSE_PAIRS

UNIVERSE_DB_SYMBOLS: list[str] = [db for db, _ in UNIVERSE_PAIRS]

YFIN_TICKER_BY_DB_SYMBOL: dict[str, str] = dict(UNIVERSE_PAIRS)


def yahoo_ticker_for_db_symbol(db_symbol: str) -> str:
    s = (db_symbol or '').upper().strip()
    # If we explicitly mapped the symbol, use it (India .NS / special tickers).
    # Otherwise, assume it is a US-native ticker and return as-is.
    return YFIN_TICKER_BY_DB_SYMBOL.get(s, s)


def quote_currency_for_db_symbol(db_symbol: str) -> str:
    """INR for NSE listings; USD otherwise (indices, US equities, crypto, ETFs)."""
    s = (db_symbol or '').upper().strip()
    y = YFIN_TICKER_BY_DB_SYMBOL.get(s)
    if not y:
        return 'USD'
    return 'INR' if y.endswith('.NS') or y.endswith('.BO') else 'USD'
