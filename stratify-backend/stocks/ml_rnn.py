"""
RNN (LSTM) classifier on 3 years of daily adjusted closes from Yahoo.
Labels from forward HORIZON-day return: sell / hold / strong_buy.
Falls back to scikit-learn MLP when TensorFlow is not installed.
"""
from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import yfinance as yf
from django.conf import settings

from .universe import yahoo_ticker_for_db_symbol

logger = logging.getLogger(__name__)

SEQ_LEN = 50
HORIZON = 10
SPARKLINE_POINTS = 30

# 0 = sell, 1 = hold, 2 = strong_buy
CLASS_LABELS = ('sell', 'hold', 'strong_buy')


def artifact_dir() -> Path:
    base = Path(getattr(settings, 'BASE_DIR', '.'))
    p = base / 'ml_artifacts'
    p.mkdir(parents=True, exist_ok=True)
    return p


def lstm_path(universe: str) -> Path:
    return artifact_dir() / f'rnn_lstm_{universe.lower()}.keras'

def mlp_path(universe: str) -> Path:
    return artifact_dir() / f'rnn_mlp_{universe.lower()}.joblib'


def fetch_closes_3y(db_symbol: str) -> np.ndarray:
    yt = yahoo_ticker_for_db_symbol(db_symbol)
    try:
        t = yf.Ticker(yt)
        df = t.history(period='3y', interval='1d', auto_adjust=True)
        if df.empty:
            return np.array([])
        return df['Close'].values.astype(np.float64)
    except Exception as exc:  # noqa: BLE001
        logger.warning('yfinance 3y history failed for %s: %s', db_symbol, exc)
        return np.array([])


def normalized_sparkline(closes: np.ndarray, n: int = SPARKLINE_POINTS) -> list[float]:
    if closes.size == 0:
        return []
    tail = closes[-n:].astype(np.float64)
    lo, hi = float(np.min(tail)), float(np.max(tail))
    if hi <= lo:
        return [0.5] * len(tail)
    return [float((x - lo) / (hi - lo)) for x in tail]


def seven_day_trend_pct(closes: np.ndarray) -> float | None:
    """Approximate 7 trading sessions using 8-day lookback (prev vs last)."""
    if closes.size < 9:
        return None
    last = float(closes[-1])
    prev = float(closes[-8])
    if prev == 0:
        return None
    return (last - prev) / prev * 100.0


def valuation_from_52w(price: float, high: float, low: float) -> str:
    if high <= low or price <= 0:
        return 'neutral'
    pos = (price - low) / (high - low)
    if pos < 0.33:
        return 'undervalued'
    if pos > 0.67:
        return 'overbought'
    return 'neutral'


def avg_discount_from_high_pct(price: float, high: float) -> float | None:
    if high <= 0 or price <= 0:
        return None
    return (high - price) / high * 100.0


def _build_xy_from_closes(closes: np.ndarray) -> tuple[np.ndarray | None, np.ndarray | None]:
    if closes.size < SEQ_LEN + HORIZON + 2:
        return None, None
    rets = np.diff(closes) / np.clip(closes[:-1], 1e-12, None)
    xs: list[np.ndarray] = []
    ys: list[int] = []
    max_i = len(rets) - SEQ_LEN - HORIZON + 1
    for i in range(max_i):
        window = rets[i : i + SEQ_LEN].astype(np.float32)
        base = closes[i + SEQ_LEN - 1]
        fut = closes[i + SEQ_LEN + HORIZON - 1]
        fwd = (fut - base) / base if base else 0.0
        if fwd > 0.02:
            cls = 2
        elif fwd < -0.02:
            cls = 0
        else:
            cls = 1
        xs.append(window.reshape(SEQ_LEN, 1))
        ys.append(cls)
    if not xs:
        return None, None
    return np.stack(xs, axis=0), np.array(ys, dtype=np.int64)


def build_training_arrays(
    symbol_closes: dict[str, np.ndarray],
) -> tuple[np.ndarray | None, np.ndarray | None]:
    all_x: list[np.ndarray] = []
    all_y: list[np.ndarray] = []
    for sym, closes in symbol_closes.items():
        X, y = _build_xy_from_closes(closes)
        if X is None:
            continue
        all_x.append(X)
        all_y.append(y)
    if not all_x:
        return None, None
    return np.concatenate(all_x, axis=0), np.concatenate(all_y, axis=0)


def train_lstm(X: np.ndarray, y: np.ndarray, *, epochs: int = 12, universe: str) -> None:
    import tensorflow as tf  # noqa: PLC0415

    tf.keras.utils.set_random_seed(42)
    model = tf.keras.Sequential(
        [
            tf.keras.layers.Input(shape=(SEQ_LEN, 1)),
            tf.keras.layers.LSTM(48, return_sequences=False),
            tf.keras.layers.Dense(16, activation='relu'),
            tf.keras.layers.Dense(3, activation='softmax'),
        ]
    )
    model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
    model.fit(X, y, epochs=epochs, batch_size=64, validation_split=0.1, verbose=1)
    path = lstm_path(universe)
    model.save(path)
    logger.info('Saved LSTM to %s', path)


def train_mlp_sklearn(X: np.ndarray, y: np.ndarray, *, universe: str) -> None:
    import joblib  # noqa: PLC0415
    from sklearn.neural_network import MLPClassifier  # noqa: PLC0415

    Xf = X.reshape(X.shape[0], SEQ_LEN)
    clf = MLPClassifier(
        hidden_layer_sizes=(96, 48),
        max_iter=400,
        random_state=42,
        early_stopping=True,
        validation_fraction=0.1,
    )
    clf.fit(Xf, y)
    path = mlp_path(universe)
    joblib.dump(clf, path)
    logger.info('Saved sklearn MLP to %s', path)


def train_universe_model(
    db_symbols: list[str],
    *,
    universe: str,
    use_sklearn: bool = False,
    epochs: int = 12,
) -> str:
    """Train on 3y daily history for provided db symbols.

    Returns 'lstm' or 'mlp' depending on which trainer succeeded.
    """
    symbol_closes: dict[str, np.ndarray] = {}
    for sym in db_symbols:
        arr = fetch_closes_3y(sym)
        if arr.size > 0:
            symbol_closes[sym] = arr
    X, y = build_training_arrays(symbol_closes)
    if X is None or len(y) < 50:
        raise RuntimeError('Not enough overlapping history to train (check Yahoo / symbols).')

    if use_sklearn:
        train_mlp_sklearn(X, y, universe=universe)
        return 'mlp'

    try:
        train_lstm(X, y, epochs=epochs, universe=universe)
        return 'lstm'
    except ImportError as exc:
        logger.warning('TensorFlow not available (%s); using sklearn MLP.', exc)
        train_mlp_sklearn(X, y, universe=universe)
        return 'mlp'


def load_predictor(universe: str):
    """Returns ('lstm'|'mlp', model) or (None, None) if no artifact on disk."""
    lp, mp = lstm_path(universe), mlp_path(universe)
    if lp.is_file():
        import tensorflow as tf  # noqa: PLC0415

        return 'lstm', tf.keras.models.load_model(lp)
    if mp.is_file():
        import joblib  # noqa: PLC0415

        return 'mlp', joblib.load(mp)
    return None, None


def predict_signal_for_closes(
    closes: np.ndarray,
    predictor: tuple[str | None, object | None] | None = None,
) -> str:
    kind, model = predictor if predictor is not None else (None, None)
    if kind is None or closes.size < SEQ_LEN + 1:
        return 'hold'
    rets = np.diff(closes) / np.clip(closes[:-1], 1e-12, None)
    tail = rets[-SEQ_LEN:].astype(np.float32).reshape(1, SEQ_LEN, 1)
    if kind == 'lstm':
        prob = model.predict(tail, verbose=0)[0]
        cls = int(np.argmax(prob))
    else:
        tail_flat = tail.reshape(1, SEQ_LEN)
        cls = int(model.predict(tail_flat)[0])
    return CLASS_LABELS[cls] if 0 <= cls < 3 else 'hold'


def run_inference_for_symbols(db_symbols: list[str], *, universe: str) -> dict[str, str]:
    """Return symbol -> signal for provided symbols (for logging); caller updates DB."""
    pred = load_predictor(universe)
    out: dict[str, str] = {}
    for sym in db_symbols:
        closes = fetch_closes_3y(sym)
        out[sym] = predict_signal_for_closes(closes, pred) if closes.size else 'hold'
    return out
