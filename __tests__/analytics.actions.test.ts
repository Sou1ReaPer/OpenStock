import { afterEach, describe, expect, it, vi } from 'vitest';

import { getAnalyticsData } from '@/lib/actions/analytics.actions';
import {
    computeDrawdown,
    isForeignCurrency,
    normalizeEarnings,
    pickHeadlines,
    pickMetrics,
    pickNextEarnings,
    summarizeRecommendation,
} from '@/lib/actions/analytics.helpers';

afterEach(() => {
    vi.restoreAllMocks();
});

describe('pickMetrics', () => {
    it('maps Finnhub metric keys and drops non-numeric values', () => {
        const m = pickMetrics({
            metric: {
                peTTM: 28.1,
                forwardPE: 17.02,
                revenueGrowthTTMYoy: 83.4,
                netProfitMarginTTM: 63.7,
                '52WeekHigh': 236.54,
                '13WeekPriceReturnDaily': 14.98,
                beta: null,
            },
        });
        expect(m).toMatchObject({
            peTTM: 28.1,
            forwardPE: 17.02,
            revenueGrowthTTM: 83.4,
            netMargin: 63.7,
            high52: 236.54,
            return13w: 14.98,
            beta: null,
            psTTM: null,
        });
    });

    it('returns null for an empty payload', () => {
        expect(pickMetrics({ metric: {} })).toBeNull();
        expect(pickMetrics(null)).toBeNull();
    });
});

describe('summarizeRecommendation', () => {
    it('uses the latest period and computes bullish share', () => {
        const r = summarizeRecommendation([
            { period: '2026-08-01', strongBuy: 1, buy: 1, hold: 8 },
            { period: '2026-09-01', strongBuy: 24, buy: 41, hold: 3, sell: 1, strongSell: 0 },
        ]);
        expect(r?.period).toBe('2026-09-01');
        expect(r?.total).toBe(69);
        expect(r?.bullishPct).toBeCloseTo((65 / 69) * 100);
    });

    it('returns null when there are no ratings', () => {
        expect(summarizeRecommendation([])).toBeNull();
        expect(summarizeRecommendation([{ period: '2026-09-01' }])).toBeNull();
    });
});

describe('normalizeEarnings', () => {
    it('keeps the last four quarters in chronological order', () => {
        const list = [
            { period: '2025-09-30', year: 2026, quarter: 3, actual: 1, estimate: 1, surprisePercent: 0 },
            { period: '2026-09-30', year: 2027, quarter: 2, actual: 2.22, estimate: 2.14, surprisePercent: 3.8 },
            { period: '2026-06-30', year: 2027, quarter: 1, actual: 1.87, estimate: 1.79, surprisePercent: 4.3 },
            { period: '2026-03-31', year: 2026, quarter: 4, actual: 1.62, estimate: 1.56, surprisePercent: 3.6 },
            { period: '2025-12-31', year: 2026, quarter: 3, actual: 1.3, estimate: 1.27, surprisePercent: 2.0 },
        ];
        const out = normalizeEarnings(list);
        expect(out.map((e) => e.label)).toEqual(['Q3 FY26', 'Q4 FY26', 'Q1 FY27', 'Q2 FY27']);
        expect(out[3].surprisePercent).toBe(3.8);
    });
});

describe('pickNextEarnings', () => {
    it('picks the soonest date on or after today', () => {
        const next = pickNextEarnings(
            {
                earningsCalendar: [
                    { date: '2027-01-27', hour: '', epsEstimate: 100 },
                    { date: '2026-09-01', hour: 'amc', epsEstimate: 1 },
                    { date: '2026-10-27', hour: 'bmo', epsEstimate: 86 },
                ],
            },
            '2026-09-28',
        );
        expect(next).toEqual({ date: '2026-10-27', hour: 'bmo', epsEstimate: 86 });
    });

    it('returns null when nothing is upcoming', () => {
        expect(pickNextEarnings({ earningsCalendar: [] }, '2026-09-28')).toBeNull();
    });
});

describe('small helpers', () => {
    it('detects foreign fundamentals currency', () => {
        expect(isForeignCurrency('KRW')).toBe(true);
        expect(isForeignCurrency('usd')).toBe(false);
        expect(isForeignCurrency(undefined)).toBe(false);
    });

    it('computes drawdown from the 52-week high', () => {
        expect(computeDrawdown(225.07, 236.54)).toBeCloseTo(-4.849, 2);
        expect(computeDrawdown(250, 236.54)).toBe(0);
        expect(computeDrawdown(null, 236.54)).toBeNull();
    });

    it('dedupes and caps headlines, newest first', () => {
        const out = pickHeadlines([
            { id: 1, headline: 'A', url: 'u1', datetime: 1 },
            { id: 2, headline: 'B', url: 'u2', datetime: 3, source: 'Yahoo' },
            { id: 3, headline: 'B', url: 'u3', datetime: 2 },
            { id: 4, headline: '', url: 'u4', datetime: 5 },
            { id: 5, headline: 'C', url: 'u5', datetime: 4 },
            { id: 6, headline: 'D', url: 'u6', datetime: 0.5 },
        ]);
        expect(out.map((h) => h.headline)).toEqual(['C', 'B', 'A']);
        expect(out[1].source).toBe('Yahoo');
    });
});

describe('getAnalyticsData', () => {
    function mockFinnhub(responses: Record<string, unknown>) {
        return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
            const url = new URL(String(input));
            const path = url.pathname.replace('/api/v1/', '');
            const symbol = url.searchParams.get('symbol') ?? '';
            const body = responses[`${path}:${symbol}`];
            if (body === undefined) return new Response('forbidden', { status: 403 });
            return new Response(JSON.stringify(body), { status: 200 });
        });
    }

    it('hides absolute figures for stocks with foreign-currency fundamentals', async () => {
        mockFinnhub({
            'quote:SKHY': { c: 191.56, d: 5.19, dp: 2.78 },
            'stock/profile2:SKHY': { name: 'SK Hynix Inc', currency: 'KRW', marketCapitalization: 1357147520 },
            'stock/metric:SKHY': { metric: { forwardPE: 4.27, '52WeekHigh': 2987000, revenueGrowthTTMYoy: 145 } },
        });

        const [skhy] = await getAnalyticsData(['skhy']);
        expect(skhy.symbol).toBe('SKHY');
        expect(skhy.foreignFundamentals).toBe(true);
        expect(skhy.marketCap).toBeNull();
        expect(skhy.drawdownFromHigh).toBeNull();
        expect(skhy.metrics?.high52).toBeNull();
        expect(skhy.metrics?.forwardPE).toBe(4.27);
    });

    it('degrades per endpoint instead of failing the whole stock', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        mockFinnhub({
            'quote:NVDA': { c: 225.07, d: 0.49, dp: 0.22 },
            'stock/profile2:NVDA': { name: 'NVIDIA Corp', currency: 'USD', marketCapitalization: 5424187 },
            'stock/metric:NVDA': { metric: { '52WeekHigh': 236.54 } },
        });

        const [nvda] = await getAnalyticsData(['NVDA', 'NVDA']);
        expect(nvda.marketCap).toBe(5424187);
        expect(nvda.drawdownFromHigh).toBeCloseTo(-4.849, 2);
        expect(nvda.recommendation).toBeNull();
        expect(nvda.earnings).toEqual([]);
        expect(nvda.nextEarnings).toBeNull();
        expect(nvda.news).toEqual([]);
    });
});
