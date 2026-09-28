import { Suspense } from 'react';
import Link from 'next/link';
import { getUserWatchlist } from '@/lib/actions/watchlist.actions';
import { getAnalyticsData } from '@/lib/actions/analytics.actions';
import SummaryCards from '@/components/analytics/SummaryCards';
import ValuationGrowthScatter from '@/components/analytics/ValuationGrowthScatter';
import DrawdownBars from '@/components/analytics/DrawdownBars';
import AnalystRatingsBars from '@/components/analytics/AnalystRatingsBars';
import EarningsSurpriseChart from '@/components/analytics/EarningsSurpriseChart';
import AnalyticsTable from '@/components/analytics/AnalyticsTable';
import Panel from '@/components/Panel';

const Skeleton = () => (
    <div className="flex flex-col gap-3" aria-busy="true">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-[104px] animate-pulse rounded-xl bg-hover" />
            ))}
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="h-[360px] animate-pulse rounded-xl bg-hover" />
            ))}
        </div>
    </div>
);

async function Dashboard({ symbols }: { symbols: string[] }) {
    const stocks = await getAnalyticsData(symbols);
    return (
        <div className="flex flex-col gap-3">
            <SummaryCards stocks={stocks} />
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <ValuationGrowthScatter stocks={stocks} />
                <DrawdownBars stocks={stocks} />
                <AnalystRatingsBars stocks={stocks} />
                <EarningsSurpriseChart stocks={stocks} />
            </div>
            <AnalyticsTable stocks={stocks} />
            <p className="text-xs text-faint">
                Data from Finnhub. Fundamentals refresh hourly, ratings and earnings every six hours.
                For information only, not investment advice.
            </p>
        </div>
    );
}

// DB read renders first; Finnhub data streams in behind a skeleton.
export default async function AnalyticsPage() {
    const items = await getUserWatchlist();
    const symbols: string[] = items.map((item: { symbol: string }) => item.symbol);

    return (
        <>
            <header className="page-head">
                <div>
                    <h1 className="page-title">Analytics</h1>
                    <p className="page-sub num flex flex-wrap items-center gap-x-2">
                        Valuation, momentum, analyst views and earnings for {symbols.length} {symbols.length === 1 ? 'symbol' : 'symbols'}
                    </p>
                </div>
            </header>

            {symbols.length === 0 ? (
                <Panel>
                    <div className="flex flex-col items-center gap-2 py-12 text-center">
                        <p className="font-semibold text-foreground">No stocks to analyze yet</p>
                        <p className="text-sm text-muted-foreground">Add stocks to your watchlist and they will show up here.</p>
                        <Link href="/watchlist" className="text-sm text-brand-ink hover:underline">Go to watchlist</Link>
                    </div>
                </Panel>
            ) : (
                <Suspense fallback={<Skeleton />}>
                    <Dashboard symbols={symbols} />
                </Suspense>
            )}
        </>
    );
}
