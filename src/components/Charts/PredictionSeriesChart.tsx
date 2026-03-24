import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export type PredictionRow = {
  date: string;
  actual_price?: number | null;
  lr_prediction?: number | null;
  rnn_prediction?: number | null;
  cnn_prediction?: number | null;
  is_future?: boolean;
  label?: string | null;
};

function formatPrice(v: number, currency: string): string {
  const c = currency.toUpperCase();
  if (c === 'USD') {
    return `$${v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

type Props = {
  data: PredictionRow[];
  currency?: string;
  title?: string;
  subtitle?: string;
};

export function PredictionSeriesChart({ data, currency = 'INR', title, subtitle }: Props) {
  const [show, setShow] = useState({ actual: true, lr: true, rnn: true, cnn: true });

  const transformed = useMemo(() => {
    if (!data?.length) return [];
    const futureIndex = data.findIndex((d) => d.is_future);
    const lastHIndex =
      futureIndex > 0 ? futureIndex - 1 : futureIndex === 0 ? -1 : data.length - 1;

    return data.map((item, idx) => {
      const isFuture = Boolean(item.is_future);
      const isTransition = idx === lastHIndex;
      return {
        ...item,
        lr_h: !isFuture || isTransition ? item.lr_prediction : null,
        lr_p: isFuture || isTransition ? item.lr_prediction : null,
        cnn_h: !isFuture || isTransition ? item.cnn_prediction : null,
        cnn_p: isFuture || isTransition ? item.cnn_prediction : null,
        rnn_h: !isFuture || isTransition ? item.rnn_prediction : null,
        rnn_p: isFuture || isTransition ? item.rnn_prediction : null,
        actual_h: !isFuture ? item.actual_price : null,
      };
    });
  }, [data]);

  const lastHistorical = useMemo(() => {
    const i = data.findIndex((d) => d.is_future);
    return i > 0 ? data[i - 1] : null;
  }, [data]);

  if (!data?.length) {
    return (
      <p className="rounded-lg border border-navy/10 bg-navy/[0.02] px-4 py-8 text-center text-sm text-gray dark:border-white/10 dark:text-gray">
        No chart data.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-navy/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-navy">
      {(title || subtitle) && (
        <div className="mb-4">
          {title ? <h3 className="text-lg font-semibold text-navy dark:text-white">{title}</h3> : null}
          {subtitle ? <p className="text-sm text-gray dark:text-gray">{subtitle}</p> : null}
        </div>
      )}
      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ['actual', 'Actual', show.actual, '#2563EB'] as const,
            ['lr', 'Linear', show.lr, '#F59E0B'] as const,
            ['rnn', 'LSTM', show.rnn, '#8B5CF6'] as const,
            ['cnn', 'CNN', show.cnn, '#10B981'] as const,
          ] as const
        ).map(([key, label, on, color]) => (
          <button
            key={key}
            type="button"
            onClick={() => setShow((s) => ({ ...s, [key]: !s[key as keyof typeof s] }))}
            className="rounded-full border px-3 py-1 text-xs font-medium transition-colors"
            style={{
              borderColor: on ? color : undefined,
              backgroundColor: on ? `${color}22` : undefined,
              color: on ? color : undefined,
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="h-[400px] w-full min-w-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={transformed} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-navy/10 dark:stroke-white/10" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10, fill: 'currentColor' }}
              className="text-gray"
              tickFormatter={(tick) => {
                const d = new Date(tick);
                if (Number.isNaN(d.getTime())) return String(tick).slice(0, 10);
                return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: 'currentColor' }}
              className="text-gray"
              domain={['auto', 'auto']}
              tickFormatter={(v) => formatPrice(Number(v), currency)}
            />
            <Tooltip
              formatter={(value: number | string) => formatPrice(Number(value), currency)}
              labelFormatter={(label) => String(label)}
              contentStyle={{
                borderRadius: 8,
                border: '1px solid rgba(0,0,0,0.08)',
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {lastHistorical ? (
              <ReferenceLine x={lastHistorical.date} stroke="#94a3b8" strokeDasharray="4 4" />
            ) : null}
            {show.actual ? (
              <Line
                type="monotone"
                dataKey="actual_h"
                name="Actual"
                stroke="#2563EB"
                strokeWidth={2}
                dot={false}
                connectNulls
              />
            ) : null}
            {show.lr ? (
              <>
                <Line type="monotone" dataKey="lr_h" stroke="#F59E0B" strokeWidth={1.5} dot={false} connectNulls />
                <Line
                  type="monotone"
                  dataKey="lr_p"
                  stroke="#F59E0B"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls
                />
              </>
            ) : null}
            {show.rnn ? (
              <>
                <Line type="monotone" dataKey="rnn_h" stroke="#8B5CF6" strokeWidth={1.5} dot={false} connectNulls />
                <Line
                  type="monotone"
                  dataKey="rnn_p"
                  stroke="#8B5CF6"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls
                />
              </>
            ) : null}
            {show.cnn ? (
              <>
                <Line type="monotone" dataKey="cnn_h" stroke="#10B981" strokeWidth={1.5} dot={false} connectNulls />
                <Line
                  type="monotone"
                  dataKey="cnn_p"
                  stroke="#10B981"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  dot={false}
                  connectNulls
                />
              </>
            ) : null}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-center text-[10px] text-gray dark:text-gray">
        Vertical line: last historical point · dashed segments = forward projection
      </p>
    </div>
  );
}
