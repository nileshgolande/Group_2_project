"""Train RNN (LSTM) or sklearn MLP on 3y universe history; write signals to Stock.ml_rnn_signal."""
from __future__ import annotations

from django.core.management.base import BaseCommand

from stocks.ml_rnn import fetch_closes_3y, load_predictor, predict_signal_for_closes, train_universe_model
from stocks.models import Stock
from stocks.universe import UNIVERSE_DB_SYMBOLS


class Command(BaseCommand):
    help = 'Train LSTM on 3y daily returns (TensorFlow) or MLP fallback; update ml_rnn_signal for universe.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--sklearn',
            action='store_true',
            help='Force scikit-learn MLP instead of TensorFlow LSTM.',
        )
        parser.add_argument(
            '--epochs',
            type=int,
            default=12,
            help='LSTM training epochs (ignored for sklearn).',
        )
        parser.add_argument(
            '--signals-only',
            action='store_true',
            help='Skip training; only re-run inference using an existing saved model.',
        )

    def handle(self, *args, **options):
        use_sklearn = options['sklearn']
        epochs = options['epochs']
        signals_only = options['signals_only']

        if not signals_only:
            kind = train_universe_model(use_sklearn=use_sklearn, epochs=epochs)
            self.stdout.write(self.style.SUCCESS(f'Trained backend: {kind}'))
        else:
            self.stdout.write('Skipping training (--signals-only).')

        pred = load_predictor()
        updates: list[tuple[str, str]] = []
        for sym in UNIVERSE_DB_SYMBOLS:
            closes = fetch_closes_3y(sym)
            sig = predict_signal_for_closes(closes, pred) if closes.size else 'hold'
            updates.append((sym, sig))

        for sym, sig in updates:
            Stock.objects.filter(symbol=sym).update(ml_rnn_signal=sig)

        self.stdout.write(self.style.SUCCESS(f'Updated ml_rnn_signal for {len(updates)} symbols.'))
