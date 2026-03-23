import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Common/Button';
import { Card } from '../components/Common/Card';

type PortfolioTab = 'holdings' | 'analytics' | 'benchmark' | 'reports';

interface HoldingRow {
  symbol: string;
  company: string;
  qty: number;
  avgPrice: number;
  current: number;
}

const HOLDINGS: HoldingRow[] = [
  { symbol: 'TCS', company: 'Tata Consultancy Services Ltd.', qty: 12, avgPrice: 3780, current: 3842.5 },
  { symbol: 'ITC', company: 'ITC Limited', qty: 200, avgPrice: 418.5, current: 412.3 },
  { symbol: 'HDFC', company: 'HDFC Bank Limited', qty: 25, avgPrice: 1620, current: 1658 },
  { symbol: 'INFY', company: 'Infosys Limited', qty: 18, avgPrice: 1520, current: 1502.2 },
  { symbol: 'WIPRO', company: 'Wipro Limited', qty: 80, avgPrice: 245, current: 248.75 },
];

const MOCK_INR_PER_USD = 83;

function formatInr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatUsdFromInr(inr: number): string {
  const usd = inr / MOCK_INR_PER_USD;
  const sign = usd >= 0 ? '+' : '-';
  return `${sign}$${Math.abs(usd).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function holdingMetrics(row: HoldingRow) {
  const invested = row.qty * row.avgPrice;
  const currentVal = row.qty * row.current;
  const gain = currentVal - invested;
  const gainPct = invested !== 0 ? (gain / invested) * 100 : 0;
  return { invested, currentVal, gain, gainPct };
}

const REPORT_HISTORY = [
  { id: '1', name: 'Monthly summary — Feb 2025', date: 'Mar 1, 2025' },
  { id: '2', name: 'Tax statement (realized gains)', date: 'Feb 18, 2025' },
  { id: '3', name: 'Allocation snapshot', date: 'Feb 5, 2025' },
];

const TABS: { id: PortfolioTab; label: string }[] = [
  { id: 'holdings', label: 'Holdings' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'benchmark', label: 'Benchmark' },
  { id: 'reports', label: 'Reports' },
];

export function Portfolio() {
  const [tab, setTab] = useState<PortfolioTab>('holdings');

  return (
    <div className="space-y-6 pb-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-navy dark:text-white">Portfolio</h1>
        <p className="mt-1 text-sm text-gray dark:text-gray">
          Manage positions, analytics, and reporting.
        </p>
      </div>

      <div
        role="tablist"
        aria-label="Portfolio sections"
        className="flex gap-1 overflow-x-auto border-b border-navy/10 pb-px dark:border-white/10"
      >
        {TABS.map(({ id, label }) => {
          const selected = tab === id;
          return (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`portfolio-tab-${id}`}
              aria-controls={`portfolio-panel-${id}`}
              onClick={() => setTab(id)}
              className={[
                'whitespace-nowrap rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors',
                selected
                  ? 'bg-emerald/15 text-emerald dark:bg-emerald/20 dark:text-emerald'
                  : 'text-gray hover:bg-navy/5 hover:text-navy dark:hover:bg-white/5 dark:hover:text-white',
              ].join(' ')}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`portfolio-panel-${tab}`}
        aria-labelledby={`portfolio-tab-${tab}`}
        className="min-h-[320px]"
      >
        {tab === 'holdings' && <HoldingsPanel />}
        {tab === 'analytics' && <AnalyticsPanel />}
        {tab === 'benchmark' && <BenchmarkPanel />}
        {tab === 'reports' && <ReportsPanel />}
      </div>
    </div>
  );
}

function HoldingsPanel() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Link to="/stocks" className="inline-flex">
          <Button variant="primary">
            Add Stock
          </Button>
        </Link>
        <Button variant="secondary" type="button" onClick={() => {}}>
          Export CSV
        </Button>
      </div>

      <Card className="overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-navy/10 bg-navy/[0.04] dark:border-white/10 dark:bg-white/[0.06]">
                <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-5">Symbol</th>
                <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-5">Company</th>
                <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-5">Qty</th>
                <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-5">Avg Price</th>
                <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-5">Current</th>
                <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-5">Gain $</th>
                <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-5">Gain %</th>
                <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {HOLDINGS.map((row) => {
                const { gain, gainPct } = holdingMetrics(row);
                const gainPositive = gain >= 0;
                return (
                  <tr
                    key={row.symbol}
                    className="border-b border-navy/5 last:border-0 dark:border-white/5"
                  >
                    <td className="px-4 py-3 font-medium text-navy dark:text-white sm:px-5">
                      {row.symbol}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-navy/80 dark:text-white/75 sm:max-w-xs sm:px-5">
                      {row.company}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-navy dark:text-gray sm:px-5">{row.qty}</td>
                    <td className="px-4 py-3 tabular-nums text-navy dark:text-gray sm:px-5">
                      {formatInr(row.avgPrice)}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-navy dark:text-gray sm:px-5">
                      {formatInr(row.current)}
                    </td>
                    <td
                      className={
                        gainPositive
                          ? 'px-4 py-3 font-medium tabular-nums text-green sm:px-5'
                          : 'px-4 py-3 font-medium tabular-nums text-red sm:px-5'
                      }
                    >
                      {formatUsdFromInr(gain)}
                    </td>
                    <td
                      className={
                        gainPositive
                          ? 'px-4 py-3 font-medium tabular-nums text-green sm:px-5'
                          : 'px-4 py-3 font-medium tabular-nums text-red sm:px-5'
                      }
                    >
                      {gainPositive ? '+' : ''}
                      {gainPct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 sm:px-5">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="ghost" type="button">
                          Details
                        </Button>
                        <Button size="sm" variant="danger" type="button">
                          Remove
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function AnalyticsPanel() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="min-h-[220px] lg:col-span-2 xl:col-span-1">
        <h2 className="text-base font-semibold text-navy dark:text-white">Portfolio Composition</h2>
        <div className="mt-4 flex min-h-[160px] flex-1 items-center justify-center rounded-lg border border-dashed border-navy/15 bg-navy/[0.03] dark:border-white/10 dark:bg-white/[0.04]">
          <span className="text-sm text-gray dark:text-gray">Chart placeholder</span>
        </div>
      </Card>
      <Card className="min-h-[220px]">
        <h2 className="text-base font-semibold text-navy dark:text-white">Risk Assessment</h2>
        <div className="mt-4 flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-navy/15 bg-navy/[0.03] dark:border-white/10 dark:bg-white/[0.04]">
          <span className="text-sm text-gray dark:text-gray">Metrics placeholder</span>
        </div>
      </Card>
      <Card className="min-h-[220px] lg:col-span-2 xl:col-span-1">
        <h2 className="text-base font-semibold text-navy dark:text-white">Statistics</h2>
        <div className="mt-4 flex min-h-[160px] items-center justify-center rounded-lg border border-dashed border-navy/15 bg-navy/[0.03] dark:border-white/10 dark:bg-white/[0.04]">
          <span className="text-sm text-gray dark:text-gray">Stats placeholder</span>
        </div>
      </Card>
    </div>
  );
}

function BenchmarkPanel() {
  return (
    <Card>
      <h2 className="text-base font-semibold text-navy dark:text-white">Portfolio vs Nifty 50</h2>
      <p className="mt-1 text-sm text-gray dark:text-gray">
        Compare your performance against the benchmark index.
      </p>
      <div className="mt-6 flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-navy/15 bg-navy/[0.03] dark:border-white/10 dark:bg-white/[0.04]">
        <span className="text-sm text-gray dark:text-gray">Chart placeholder</span>
      </div>
    </Card>
  );
}

function ReportsPanel() {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="flex flex-col gap-4">
        <div>
          <h3 className="font-semibold text-navy dark:text-white">Monthly</h3>
          <p className="mt-1 text-sm text-gray dark:text-gray">PnL and activity for the month.</p>
        </div>
        <Button variant="primary" type="button" className="w-full sm:w-auto">
          Generate
        </Button>
      </Card>
      <Card className="flex flex-col gap-4">
        <div>
          <h3 className="font-semibold text-navy dark:text-white">Tax</h3>
          <p className="mt-1 text-sm text-gray dark:text-gray">Realized gains and tax-relevant exports.</p>
        </div>
        <Button variant="primary" type="button" className="w-full sm:w-auto">
          Generate
        </Button>
      </Card>
      <Card className="flex flex-col gap-4">
        <div>
          <h3 className="font-semibold text-navy dark:text-white">Allocation</h3>
          <p className="mt-1 text-sm text-gray dark:text-gray">Sector and asset mix snapshot.</p>
        </div>
        <Button variant="primary" type="button" className="w-full sm:w-auto">
          Generate
        </Button>
      </Card>

      <Card className="lg:col-span-3">
        <h3 className="text-base font-semibold text-navy dark:text-white">History</h3>
        <ul className="mt-4 divide-y divide-navy/10 dark:divide-white/10">
          {REPORT_HISTORY.map((item) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
            >
              <span className="font-medium text-navy dark:text-white">{item.name}</span>
              <span className="text-sm text-gray dark:text-gray">{item.date}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
