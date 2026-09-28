import React from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/better-auth/auth';
import { getUserWatchlist } from '@/lib/actions/watchlist.actions';
import { getAnalyticsData } from '@/lib/actions/analytics.actions';
import SummaryCards from '@/components/analytics/SummaryCards';
import ValuationGrowthScatter from '@/components/analytics/ValuationGrowthScatter';
import DrawdownBars from '@/components/analytics/DrawdownBars';
import AnalystRatingsBars from '@/components/analytics/AnalystRatingsBars';
import EarningsSurpriseChart from '@/components/analytics/EarningsSurpriseChart';
import AnalyticsTable from '@/components/analytics/AnalyticsTable';

export default async function AnalyticsPage() {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (!session) {
        redirect('/sign-in');
    }

    const watchlistItems = await getUserWatchlist(session.user.id);
    const symbols: string[] = watchlistItems.map((item: { symbol: string }) => item.symbol);

    if (symbols.length === 0) {
        return (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center gap-3">
                <h1 className="text-2xl font-semibold text-gray-100">No stocks to analyze yet</h1>
                <p className="text-gray-500">Add stocks to your watchlist and they will show up here.</p>
                <Link href="/watchlist" className="text-teal-400 hover:text-teal-300">Go to watchlist</Link>
            </div>
        );
    }

    const stocks = await getAnalyticsData(symbols);

    return (
        <div className="flex flex-col gap-6">
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
                    Analytics
                </h1>
                <p className="text-gray-500 mt-1">
                    Valuation, momentum, analyst views and earnings for your {stocks.length} watchlist stocks.
                </p>
            </div>

            <SummaryCards stocks={stocks} />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ValuationGrowthScatter stocks={stocks} />
                <DrawdownBars stocks={stocks} />
                <AnalystRatingsBars stocks={stocks} />
                <EarningsSurpriseChart stocks={stocks} />
            </div>

            <AnalyticsTable stocks={stocks} />

            <p className="text-xs text-gray-600">
                Data from Finnhub. Quotes are live on page load; fundamentals refresh hourly, ratings and earnings every six hours.
                For information only, not investment advice.
            </p>
        </div>
    );
}
