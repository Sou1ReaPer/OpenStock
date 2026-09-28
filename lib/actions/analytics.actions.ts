'use server';

import {
    getCompanyHeadlines,
    getCompanyProfile,
    getEarningsSurprises,
    getLiveQuotes,
    getRecommendationTrends,
    getStockMetrics,
    getUpcomingEarnings,
} from '@/lib/actions/finnhub.actions';
import { computeDrawdown, isForeignCurrency, type AnalyticsStock } from '@/lib/actions/analytics.helpers';

export async function getAnalyticsData(symbols: string[]): Promise<AnalyticsStock[]> {
    const unique = Array.from(new Set((symbols || []).map((s) => s?.trim().toUpperCase()).filter(Boolean)));
    const quotes = await getLiveQuotes(unique);

    return Promise.all(
        unique.map(async (symbol): Promise<AnalyticsStock> => {
            const [profile, metrics, recommendation, earnings, nextEarnings, news] = await Promise.all([
                getCompanyProfile(symbol),
                getStockMetrics(symbol),
                getRecommendationTrends(symbol),
                getEarningsSurprises(symbol),
                getUpcomingEarnings(symbol),
                getCompanyHeadlines(symbol),
            ]);

            const quote = quotes[symbol];
            const price = typeof quote?.c === 'number' && quote.c > 0 ? quote.c : null;
            const currency = profile?.currency ?? null;
            const foreign = isForeignCurrency(currency);

            return {
                symbol,
                name: profile?.name || symbol,
                logo: profile?.logo,
                price,
                change: price !== null ? quote?.d ?? null : null,
                changePercent: price !== null ? quote?.dp ?? null : null,
                marketCap: !foreign && profile?.marketCapitalization ? profile.marketCapitalization : null,
                fundamentalsCurrency: currency,
                foreignFundamentals: foreign,
                metrics: metrics && foreign ? { ...metrics, high52: null, low52: null } : metrics,
                drawdownFromHigh: foreign ? null : computeDrawdown(price, metrics?.high52 ?? null),
                recommendation,
                earnings,
                nextEarnings,
                news,
            };
        }),
    );
}
