'use server';

import { fetchJSON, getCompanyProfile, getQuote } from '@/lib/actions/finnhub.actions';
import {
    computeDrawdown,
    isForeignCurrency,
    normalizeEarnings,
    pickHeadlines,
    pickMetrics,
    pickNextEarnings,
    summarizeRecommendation,
    type AnalyticsStock,
    type EarningsSurprise,
    type FinnhubEarning,
    type FinnhubEarningsCalendar,
    type FinnhubMetricResponse,
    type FinnhubRecommendation,
    type NewsHeadline,
    type RecommendationSummary,
    type StockMetrics,
    type UpcomingEarnings,
} from '@/lib/actions/analytics.helpers';

const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';
const HOUR = 3600;

function finnhubUrl(path: string, params: Record<string, string>) {
    const url = new URL(`${FINNHUB_BASE_URL}/${path}`);
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    url.searchParams.set('token', process.env.NEXT_PUBLIC_FINNHUB_API_KEY ?? '');
    return url.toString();
}

function isoDate(d: Date) {
    return d.toISOString().slice(0, 10);
}

export async function getStockMetrics(symbol: string): Promise<StockMetrics | null> {
    try {
        const res = await fetchJSON<FinnhubMetricResponse>(finnhubUrl('stock/metric', { symbol, metric: 'all' }), HOUR);
        return pickMetrics(res);
    } catch (e) {
        console.error('Error fetching metrics for', symbol, e);
        return null;
    }
}

export async function getRecommendationTrends(symbol: string): Promise<RecommendationSummary | null> {
    try {
        const res = await fetchJSON<FinnhubRecommendation[]>(finnhubUrl('stock/recommendation', { symbol }), 6 * HOUR);
        return summarizeRecommendation(res);
    } catch (e) {
        console.error('Error fetching recommendations for', symbol, e);
        return null;
    }
}

export async function getEarningsSurprises(symbol: string): Promise<EarningsSurprise[]> {
    try {
        const res = await fetchJSON<FinnhubEarning[]>(finnhubUrl('stock/earnings', { symbol, limit: '4' }), 6 * HOUR);
        return normalizeEarnings(res);
    } catch (e) {
        console.error('Error fetching earnings for', symbol, e);
        return [];
    }
}

export async function getUpcomingEarnings(symbol: string): Promise<UpcomingEarnings | null> {
    try {
        const now = new Date();
        const to = new Date(now.getTime() + 90 * 24 * HOUR * 1000);
        const res = await fetchJSON<FinnhubEarningsCalendar>(
            finnhubUrl('calendar/earnings', { symbol, from: isoDate(now), to: isoDate(to) }),
            6 * HOUR,
        );
        return pickNextEarnings(res, isoDate(now));
    } catch (e) {
        console.error('Error fetching earnings calendar for', symbol, e);
        return null;
    }
}

export async function getCompanyHeadlines(symbol: string): Promise<NewsHeadline[]> {
    try {
        const now = new Date();
        const from = new Date(now.getTime() - 7 * 24 * HOUR * 1000);
        const res = await fetchJSON<RawNewsArticle[]>(
            finnhubUrl('company-news', { symbol, from: isoDate(from), to: isoDate(now) }),
            HOUR / 2,
        );
        return pickHeadlines(res);
    } catch (e) {
        console.error('Error fetching company news for', symbol, e);
        return [];
    }
}

export async function getAnalyticsData(symbols: string[]): Promise<AnalyticsStock[]> {
    const unique = Array.from(new Set((symbols || []).map((s) => s?.trim().toUpperCase()).filter(Boolean)));

    return Promise.all(
        unique.map(async (symbol): Promise<AnalyticsStock> => {
            const [quote, profile, metrics, recommendation, earnings, nextEarnings, news] = await Promise.all([
                getQuote(symbol),
                getCompanyProfile(symbol),
                getStockMetrics(symbol),
                getRecommendationTrends(symbol),
                getEarningsSurprises(symbol),
                getUpcomingEarnings(symbol),
                getCompanyHeadlines(symbol),
            ]);

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
