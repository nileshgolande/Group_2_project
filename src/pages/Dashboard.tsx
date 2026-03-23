import {
  Activity,
  ArrowRight,
  Briefcase,
  Landmark,
  LineChart,
  Percent,
  Plus,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Common/Badge';
import { Button } from '../components/Common/Button';
import { Card } from '../components/Common/Card';
import { StatCard } from '../components/Common/StatCard';
import { useAppSelector } from '../store';

interface TopStockRow {
  symbol: string;
  price: string;
  changePct: number;
  sentiment: 'bullish' | 'neutral' | 'bearish';
}

interface Recommendation {
  symbol: string;
  headline: string;
  rationale: string;
}

interface ActivityEntry {
  id: string;
  time: string;
  title: string;
  detail: string;
}

const TOP_STOCKS: TopStockRow[] = [
  { symbol: 'TCS', price: '₹3,842.50', changePct: 1.24, sentiment: 'bullish' },
  { symbol: 'ITC', price: '₹412.30', changePct: -0.42, sentiment: 'neutral' },
  { symbol: 'HDFC', price: '₹1,658.00', changePct: 0.88, sentiment: 'bullish' },
  { symbol: 'INFY', price: '₹1,502.20', changePct: -1.05, sentiment: 'bearish' },
  { symbol: 'WIPRO', price: '₹248.75', changePct: 0.56, sentiment: 'neutral' },
];

const RECOMMENDATIONS: Recommendation[] = [
  {
    symbol: 'RELIANCE',
    headline: 'Energy & retail mix',
    rationale: 'Strong downstream margins and retail footfall trends vs. sector average.',
  },
  {
    symbol: 'SBIN',
    headline: 'Rate cycle tailwind',
    rationale: 'NIM stability with improving asset quality in retail loan book.',
  },
  {
    symbol: 'BHARTIARTL',
    headline: 'ARPU expansion',
    rationale: '5G uptake and tariff discipline support recurring revenue growth.',
  },
];

const ACTIVITIES: ActivityEntry[] = [
  {
    id: '1',
    time: 'Today · 9:42 AM',
    title: 'Dividend credited',
    detail: '₹1,240 from ITC reinvested to cash balance.',
  },
  {
    id: '2',
    time: 'Yesterday · 4:18 PM',
    title: 'Order filled',
    detail: 'Bought 4 shares of INFY at limit ₹1,498.',
  },
  {
    id: '3',
    time: 'Mon · 11:05 AM',
    title: 'Price alert',
    detail: 'TCS crossed ₹3,800 — your target was ₹3,750.',
  },
  {
    id: '4',
    time: 'Sun · 8:30 PM',
    title: 'Research note',
    detail: 'Morpheus updated sector view on IT services.',
  },
];

function sentimentBadge(s: TopStockRow['sentiment']) {
  switch (s) {
    case 'bullish':
      return <Badge variant="success">Bullish</Badge>;
    case 'bearish':
      return <Badge variant="error">Bearish</Badge>;
    default:
      return <Badge variant="default">Neutral</Badge>;
  }
}

export function Dashboard() {
  const user = useAppSelector((state) => state.auth.user);
  const displayName = user?.name?.trim() || user?.email?.split('@')[0] || 'Investor';

  return (
    <div className="space-y-8 pb-8">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-navy via-navy to-slate px-6 py-10 text-white shadow-lg sm:px-8 sm:py-12">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Welcome Back, {displayName}!
          </h1>
          <p className="mt-2 text-base text-white/85 sm:text-lg">
            Your portfolio is up <span className="font-semibold text-emerald">3.2%</span> today
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link to="/stocks" className="inline-flex">
              <Button size="lg" variant="primary" className="shadow-md shadow-black/20">
                <Plus className="h-4 w-4" aria-hidden />
                Add Stock
              </Button>
            </Link>
            <Link to="/portfolio" className="inline-flex">
              <Button
                size="lg"
                variant="secondary"
                className="border-white/90 !text-white hover:bg-white/10 dark:border-white/90 dark:!text-white dark:hover:bg-white/10"
              >
                <Briefcase className="h-4 w-4" aria-hidden />
                View Portfolio
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section aria-labelledby="quick-stats-heading">
        <h2 id="quick-stats-heading" className="sr-only">
          Quick stats
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Portfolio Value"
            value="₹2,45,000"
            change="+3.2% today"
            isPositive
            icon={<Landmark className="h-5 w-5" aria-hidden />}
          />
          <StatCard
            title="Invested"
            value="₹2,10,000"
            change="+16.7% vs. start"
            isPositive
            icon={<Briefcase className="h-5 w-5" aria-hidden />}
          />
          <StatCard
            title="Gain"
            value="₹35,000"
            change="+5.2% unrealized"
            isPositive
            icon={<LineChart className="h-5 w-5" aria-hidden />}
          />
          <StatCard
            title="Return"
            value="16.67%"
            change="+2.1% vs. last month"
            isPositive
            icon={<Percent className="h-5 w-5" aria-hidden />}
          />
        </div>
      </section>

      <section aria-labelledby="sector-sentiment-heading" className="space-y-3">
        <h2
          id="sector-sentiment-heading"
          className="text-lg font-semibold text-navy dark:text-white"
        >
          Sector Sentiment
        </h2>
        <Card className="h-[300px]">
          <div className="flex h-full min-h-[252px] flex-col">
            <p className="text-sm font-medium text-gray dark:text-gray">Market breadth</p>
            <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-navy/15 bg-navy/[0.03] dark:border-white/10 dark:bg-white/[0.04]">
              <span className="text-sm text-gray dark:text-gray">Chart here</span>
            </div>
          </div>
        </Card>
      </section>

      <section aria-labelledby="top-stocks-heading" className="space-y-3">
        <h2 id="top-stocks-heading" className="text-lg font-semibold text-navy dark:text-white">
          Top 5 Stocks
        </h2>
        <Card className="overflow-hidden !p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-navy/10 bg-navy/[0.04] dark:border-white/10 dark:bg-white/[0.06]">
                  <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-6">
                    Symbol
                  </th>
                  <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-6">
                    Price
                  </th>
                  <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-6">
                    Change %
                  </th>
                  <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-6">
                    Sentiment
                  </th>
                  <th className="px-4 py-3 font-semibold text-navy dark:text-white sm:px-6">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {TOP_STOCKS.map((row) => (
                  <tr
                    key={row.symbol}
                    className="border-b border-navy/5 last:border-0 dark:border-white/5"
                  >
                    <td className="px-4 py-3 font-medium text-navy dark:text-white sm:px-6">
                      {row.symbol}
                    </td>
                    <td className="px-4 py-3 text-navy dark:text-gray sm:px-6">{row.price}</td>
                    <td
                      className={
                        row.changePct >= 0
                          ? 'px-4 py-3 font-medium text-green sm:px-6'
                          : 'px-4 py-3 font-medium text-red sm:px-6'
                      }
                    >
                      {row.changePct >= 0 ? '+' : ''}
                      {row.changePct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3 sm:px-6">{sentimentBadge(row.sentiment)}</td>
                    <td className="px-4 py-3 sm:px-6">
                      <div className="flex flex-wrap gap-2">
                        <Link to={`/stocks/${row.symbol}`} className="inline-flex">
                          <Button size="sm" variant="ghost">
                            View Details
                          </Button>
                        </Link>
                        <Button size="sm" variant="primary">
                          Add
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      <section aria-labelledby="recommended-heading" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2
            id="recommended-heading"
            className="text-lg font-semibold text-navy dark:text-white"
          >
            Recommended Stocks
          </h2>
          <Link
            to="/recommendations"
            className="inline-flex items-center gap-1 text-sm font-medium text-emerald transition-colors hover:underline"
          >
            View All
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {RECOMMENDATIONS.map((rec) => (
            <Card key={rec.symbol} hover className="flex flex-col gap-3">
              <div className="flex items-start justify-between gap-2">
                <span className="text-lg font-semibold text-navy dark:text-white">{rec.symbol}</span>
                <Badge variant="success">Buy</Badge>
              </div>
              <p className="text-sm font-medium text-gray dark:text-gray">{rec.headline}</p>
              <p className="flex-1 text-sm text-navy/80 dark:text-white/75">{rec.rationale}</p>
              <Link to="/recommendations" className="inline-flex w-full sm:w-auto">
                <Button size="sm" variant="secondary" className="w-full sm:w-auto">
                  Open thesis
                </Button>
              </Link>
            </Card>
          ))}
        </div>
      </section>

      <section aria-labelledby="activity-heading" className="space-y-3">
        <h2 id="activity-heading" className="text-lg font-semibold text-navy dark:text-white">
          Recent Activity
        </h2>
        <Card>
          <div className="relative pl-2">
            <div
              className="absolute bottom-2 left-[11px] top-2 w-px bg-navy/15 dark:bg-white/15"
              aria-hidden
            />
            <ul className="space-y-6">
              {ACTIVITIES.map((item) => (
                <li key={item.id} className="relative flex gap-4 pl-6">
                  <span
                    className="absolute left-0 top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald/15 text-emerald dark:border-navy dark:bg-emerald/20"
                    aria-hidden
                  >
                    <Activity className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1 border-b border-navy/5 pb-6 last:border-0 last:pb-0 dark:border-white/10">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray dark:text-gray">
                      {item.time}
                    </p>
                    <p className="mt-1 font-medium text-navy dark:text-white">{item.title}</p>
                    <p className="mt-1 text-sm text-navy/75 dark:text-white/70">{item.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </section>
    </div>
  );
}
