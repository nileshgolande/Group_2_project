import { useEffect, useState } from 'react';
import { PredictionSeriesChart, type PredictionRow } from '../components/Charts/PredictionSeriesChart';
import { Card } from '../components/Common/Card';
import { API_ENDPOINTS } from '../constants/api';
import { apiClient } from '../services/api';

const ASSETS = [
  { id: 'gold', label: 'Gold (GC=F)' },
  { id: 'silver', label: 'Silver (SI=F)' },
  { id: 'btc', label: 'Bitcoin (BTC-USD)' },
] as const;

export function MlCommodities() {
  const [asset, setAsset] = useState<string>('gold');
  const [rows, setRows] = useState<PredictionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [torch, setTorch] = useState(false);

  useEffect(() => {
    let c = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const { data } = await apiClient.get<{ data?: PredictionRow[]; meta?: { torch?: boolean } }>(
          API_ENDPOINTS.ml.commodity(asset)
        );
        if (c) return;
        setRows(data?.data ?? []);
        setTorch(Boolean(data?.meta?.torch));
      } catch {
        if (!c) {
          setErr('Could not load commodity ML series. Is the API running?');
          setRows([]);
        }
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [asset]);

  return (
    <div className="space-y-6 pb-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-navy dark:text-white sm:text-3xl">
          Commodity ML (Bizmetric flow)
        </h1>
        <p className="mt-1 text-sm text-gray dark:text-gray">
          Linear regression plus optional PyTorch LSTM/CNN — ported from{' '}
          <a
            href="https://github.com/nileshgolande/Nilesh_Bizmetric_project_stock_evaluation"
            className="text-emerald underline hover:no-underline"
            target="_blank"
            rel="noreferrer"
          >
            Nilesh_Bizmetric_project_stock_evaluation
          </a>
          .
        </p>
      </header>

      <Card className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium text-navy dark:text-white" htmlFor="asset-select">
          Asset
        </label>
        <select
          id="asset-select"
          value={asset}
          onChange={(e) => setAsset(e.target.value)}
          className="rounded-lg border border-navy/15 bg-white px-3 py-2 text-sm text-navy focus:border-emerald focus:outline-none dark:border-white/10 dark:bg-navy dark:text-white"
        >
          {ASSETS.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-gray dark:text-gray">
          PyTorch on server: {torch ? 'yes' : 'no'} (install torch for full LSTM/CNN)
        </span>
      </Card>

      {err ? (
        <p className="rounded-lg border border-red/30 bg-red/10 px-4 py-3 text-sm text-red">{err}</p>
      ) : null}

      {loading ? (
        <p className="text-sm text-gray dark:text-gray">Loading series…</p>
      ) : (
        <PredictionSeriesChart
          data={rows}
          currency="USD"
          title={`${asset.toUpperCase()} — historical fit & forward projection`}
          subtitle="Hourly history when Yahoo provides it; otherwise daily fallback."
        />
      )}
    </div>
  );
}
