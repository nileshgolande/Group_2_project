import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/Common/Badge';
import { Button } from '../components/Common/Button';
import { Card } from '../components/Common/Card';

type RiskLevel = 'low' | 'medium' | 'high';
type RiskFilter = 'all' | RiskLevel;
type SortBy = 'strength' | 'similarity';

export interface RecommendationItem {
  symbol: string;
  company: string;
  price: number;
  strength: number;
  similarity: number;
  reason: string;
  risk: RiskLevel;
}

const MOCK_RECOMMENDATIONS: RecommendationItem[] = [
  {
    symbol: 'TCS',
    company: 'Tata Consultancy Services Ltd.',
    price: 3842.5,
    strength: 9.2,
    similarity: 0.91,
    reason: 'Strong cash flows and resilient IT services demand align with your IT overweight.',
    risk: 'low',
  },
  {
    symbol: 'HDFCBANK',
    company: 'HDFC Bank Ltd.',
    price: 1658,
    strength: 8.4,
    similarity: 0.88,
    reason: 'Deposit growth and stable NIMs match your preference for quality financials.',
    risk: 'low',
  },
  {
    symbol: 'INFY',
    company: 'Infosys Ltd.',
    price: 1502.2,
    strength: 7.1,
    similarity: 0.84,
    reason: 'Digital deal momentum; complements existing large-cap IT exposure.',
    risk: 'medium',
  },
  {
    symbol: 'RELIANCE',
    company: 'Reliance Industries Ltd.',
    price: 2890,
    strength: 6.5,
    similarity: 0.79,
    reason: 'Energy-to-retail diversification; moderate correlation with your current basket.',
    risk: 'medium',
  },
  {
    symbol: 'SBIN',
    company: 'State Bank of India',
    price: 812.4,
    strength: 6.2,
    similarity: 0.77,
    reason: 'PSU bank recovery play; fits a barbell with your private bank holdings.',
    risk: 'high',
  },
  {
    symbol: 'ITC',
    company: 'ITC Ltd.',
    price: 412.3,
    strength: 5.6,
    similarity: 0.72,
    reason: 'FMCG stability with hotel upside; defensive tilt vs. your growth names.',
    risk: 'low',
  },
  {
    symbol: 'BHARTIARTL',
    company: 'Bharti Airtel Ltd.',
    price: 1188,
    strength: 4.8,
    similarity: 0.68,
    reason: 'ARPU-led telecom; higher volatility than your typical large-cap picks.',
    risk: 'medium',
  },
  {
    symbol: 'WIPRO',
    company: 'Wipro Ltd.',
    price: 248.75,
    strength: 4.2,
    similarity: 0.65,
    reason: 'Turnaround in consulting mix; smaller weight suitable for satellite sleeve.',
    risk: 'medium',
  },
  {
    symbol: 'ADANIPORTS',
    company: 'Adani Ports & SEZ Ltd.',
    price: 1422,
    strength: 3.5,
    similarity: 0.58,
    reason: 'Infrastructure exposure; elevated risk score vs. your risk tolerance profile.',
    risk: 'high',
  },
];

function formatInr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function strengthBadgeClass(strength: number): string {
  if (strength >= 8) {
    return 'bg-emerald/15 text-emerald dark:bg-emerald/20 dark:text-emerald';
  }
  if (strength >= 5) {
    return 'bg-amber/20 text-amber dark:bg-amber/25 dark:text-amber';
  }
  return 'bg-red/15 text-red dark:bg-red/20 dark:text-red';
}

function riskBadgeVariant(risk: RiskLevel): 'success' | 'warning' | 'error' {
  if (risk === 'low') return 'success';
  if (risk === 'medium') return 'warning';
  return 'error';
}

function riskLabel(risk: RiskLevel): string {
  return risk === 'low' ? 'Low' : risk === 'medium' ? 'Medium' : 'High';
}

export function Recommendations() {
  const [draftRisk, setDraftRisk] = useState<RiskFilter>('all');
  const [draftStrengthMin, setDraftStrengthMin] = useState(0);
  const [draftSort, setDraftSort] = useState<SortBy>('strength');

  const [appliedRisk, setAppliedRisk] = useState<RiskFilter>('all');
  const [appliedStrengthMin, setAppliedStrengthMin] = useState(0);
  const [appliedSort, setAppliedSort] = useState<SortBy>('strength');

  const filtered = useMemo(() => {
    let list = [...MOCK_RECOMMENDATIONS];

    if (appliedRisk !== 'all') {
      list = list.filter((r) => r.risk === appliedRisk);
    }
    list = list.filter((r) => r.strength >= appliedStrengthMin);

    list.sort((a, b) => {
      if (appliedSort === 'strength') {
        return b.strength - a.strength;
      }
      return b.similarity - a.similarity;
    });

    return list;
  }, [appliedRisk, appliedStrengthMin, appliedSort]);

  const applyFilters = () => {
    setAppliedRisk(draftRisk);
    setAppliedStrengthMin(draftStrengthMin);
    setAppliedSort(draftSort);
  };

  return (
    <div className="space-y-8 pb-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-navy dark:text-white sm:text-3xl">
          Stock Recommendations
        </h1>
        <p className="mt-1 text-sm text-gray dark:text-gray sm:text-base">AI-powered suggestions</p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(240px,280px)_1fr] lg:items-start">
        <aside className="lg:sticky lg:top-24">
          <Card>
            <h2 className="text-sm font-semibold text-navy dark:text-white">Filters</h2>

            <fieldset className="mt-4 space-y-2">
              <legend className="text-xs font-medium uppercase tracking-wide text-gray dark:text-gray">
                Risk level
              </legend>
              <div className="flex flex-col gap-2">
                {(
                  [
                    ['all', 'All'],
                    ['low', 'Low'],
                    ['medium', 'Medium'],
                    ['high', 'High'],
                  ] as const
                ).map(([value, label]) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-center gap-2 text-sm text-navy dark:text-white"
                  >
                    <input
                      type="radio"
                      name="risk"
                      checked={draftRisk === value}
                      onChange={() => setDraftRisk(value)}
                      className="h-4 w-4 border-navy/30 text-emerald focus:ring-emerald dark:border-white/30"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-6">
              <label
                htmlFor="strength-slider"
                className="text-xs font-medium uppercase tracking-wide text-gray dark:text-gray"
              >
                Strength (min): {draftStrengthMin}
              </label>
              <input
                id="strength-slider"
                type="range"
                min={0}
                max={10}
                step={1}
                value={draftStrengthMin}
                onChange={(e) => setDraftStrengthMin(Number(e.target.value))}
                className="mt-2 w-full accent-emerald"
              />
              <p className="mt-1 text-xs text-gray dark:text-gray">0–10: show ideas at or above this score</p>
            </div>

            <fieldset className="mt-6 space-y-2">
              <legend className="text-xs font-medium uppercase tracking-wide text-gray dark:text-gray">
                Sort
              </legend>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-navy dark:text-white">
                <input
                  type="radio"
                  name="sort"
                  checked={draftSort === 'strength'}
                  onChange={() => setDraftSort('strength')}
                  className="h-4 w-4 border-navy/30 text-emerald focus:ring-emerald dark:border-white/30"
                />
                Strength
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-navy dark:text-white">
                <input
                  type="radio"
                  name="sort"
                  checked={draftSort === 'similarity'}
                  onChange={() => setDraftSort('similarity')}
                  className="h-4 w-4 border-navy/30 text-emerald focus:ring-emerald dark:border-white/30"
                />
                Similarity
              </label>
            </fieldset>

            <Button type="button" variant="primary" className="mt-6 w-full" onClick={applyFilters}>
              Apply
            </Button>
          </Card>
        </aside>

        <div>
          <p className="mb-4 text-sm text-gray dark:text-gray">
            Showing <span className="font-medium text-navy dark:text-white">{filtered.length}</span>{' '}
            recommendations
          </p>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((item) => (
              <Card key={item.symbol} hover className="flex flex-col gap-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <Link
                      to={`/stocks/${item.symbol}`}
                      className="text-lg font-semibold text-navy transition-colors hover:text-emerald dark:text-white dark:hover:text-emerald"
                    >
                      {item.symbol}
                    </Link>
                    <p className="mt-0.5 line-clamp-2 text-sm text-gray dark:text-gray">{item.company}</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${strengthBadgeClass(item.strength)}`}
                    >
                      Strength {item.strength.toFixed(1)}
                    </span>
                    <Badge variant={riskBadgeVariant(item.risk)}>{riskLabel(item.risk)} risk</Badge>
                  </div>
                </div>

                <p className="text-lg font-semibold tabular-nums text-navy dark:text-white">
                  {formatInr(item.price)}
                </p>
                <p className="text-xs font-medium text-gray dark:text-gray">
                  Similarity:{' '}
                  <span className="text-navy dark:text-white">
                    {(item.similarity * 100).toFixed(0)}% match
                  </span>
                </p>
                <p className="flex-1 text-sm leading-relaxed text-navy/85 dark:text-white/80">
                  {item.reason}
                </p>

                <div className="flex flex-wrap items-center gap-2 border-t border-navy/10 pt-3 dark:border-white/10">
                  <Button variant="primary" size="sm" type="button">
                    Add to Portfolio
                  </Button>
                  <Link
                    to={`/stocks/${item.symbol}`}
                    className="text-sm font-medium text-emerald transition-colors hover:underline"
                  >
                    Details
                  </Link>
                </div>
              </Card>
            ))}
          </div>
          {filtered.length === 0 ? (
            <Card className="mt-4">
              <p className="text-center text-sm text-gray dark:text-gray">
                No recommendations match these filters. Try lowering the strength minimum or widening risk.
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
