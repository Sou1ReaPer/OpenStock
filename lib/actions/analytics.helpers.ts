// Pure helpers for the analytics dashboard. Kept out of analytics.actions.ts because
// a 'use server' module may only export async functions.

export type FinnhubMetricResponse = {
    metric?: Record<string, number | null | undefined>;
};

export type FinnhubRecommendation = {
    period?: string;
    strongBuy?: number;
    buy?: number;
    hold?: number;
    sell?: number;
    strongSell?: number;
};

export type FinnhubEarning = {
    period?: string;
    year?: number;
    quarter?: number;
    actual?: number | null;
    estimate?: number | null;
    surprisePercent?: number | null;
};

export type FinnhubEarningsCalendar = {
    earningsCalendar?: {
        date?: string;
        hour?: string;
        epsEstimate?: number | null;
    }[];
};

export type StockMetrics = {
    peTTM: number | null;
    forwardPE: number | null;
    psTTM: number | null;
    revenueGrowthTTM: number | null;
    epsGrowthTTM: number | null;
    grossMargin: number | null;
    netMargin: number | null;
    beta: number | null;
    high52: number | null;
    low52: number | null;
    return13w: number | null;
    return52w: number | null;
    returnYTD: number | null;
};

export type RecommendationSummary = {
    period: string;
    strongBuy: number;
    buy: number;
    hold: number;
    sell: number;
    strongSell: number;
    total: number;
    bullishPct: number;
};

export type EarningsSurprise = {
    label: string;
    actual: number | null;
    estimate: number | null;
    surprisePercent: number | null;
};

export type UpcomingEarnings = {
    date: string;
    hour: string;
    epsEstimate: number | null;
};

export type NewsHeadline = {
    headline: string;
    url: string;
    source: string;
    datetime: number;
};

export type AnalyticsStock = {
    symbol: string;
    name: string;
    logo?: string;
    price: number | null;
    change: number | null;
    changePercent: number | null;
    /** USD millions; null when fundamentals are reported in a foreign currency */
    marketCap: number | null;
    /**
     * Finnhub maps some US tickers (e.g. TSM, SKHY) to their home listing, so
     * absolute figures (market cap, 52-week range) are in another currency than
     * the US quote. Ratios are still comparable; absolute figures are hidden.
     */
    fundamentalsCurrency: string | null;
    foreignFundamentals: boolean;
    metrics: StockMetrics | null;
    /** Percent below the 52-week high (negative number), null when not comparable */
    drawdownFromHigh: number | null;
    recommendation: RecommendationSummary | null;
    earnings: EarningsSurprise[];
    nextEarnings: UpcomingEarnings | null;
    news: NewsHeadline[];
};

const num = (v: unknown): number | null =>
    typeof v === 'number' && Number.isFinite(v) ? v : null;

export function pickMetrics(res: FinnhubMetricResponse | null | undefined): StockMetrics | null {
    const m = res?.metric;
    if (!m || Object.keys(m).length === 0) return null;
    return {
        peTTM: num(m.peTTM),
        forwardPE: num(m.forwardPE),
        psTTM: num(m.psTTM),
        revenueGrowthTTM: num(m.revenueGrowthTTMYoy),
        epsGrowthTTM: num(m.epsGrowthTTMYoy),
        grossMargin: num(m.grossMarginTTM),
        netMargin: num(m.netProfitMarginTTM),
        beta: num(m.beta),
        high52: num(m['52WeekHigh']),
        low52: num(m['52WeekLow']),
        return13w: num(m['13WeekPriceReturnDaily']),
        return52w: num(m['52WeekPriceReturnDaily']),
        returnYTD: num(m.yearToDatePriceReturnDaily),
    };
}

export function summarizeRecommendation(list: FinnhubRecommendation[] | null | undefined): RecommendationSummary | null {
    if (!Array.isArray(list) || list.length === 0) return null;
    // Finnhub returns newest first; sort defensively by period
    const latest = [...list].sort((a, b) => (b.period ?? '').localeCompare(a.period ?? ''))[0];
    const strongBuy = latest.strongBuy ?? 0;
    const buy = latest.buy ?? 0;
    const hold = latest.hold ?? 0;
    const sell = latest.sell ?? 0;
    const strongSell = latest.strongSell ?? 0;
    const total = strongBuy + buy + hold + sell + strongSell;
    if (total === 0) return null;
    return {
        period: latest.period ?? '',
        strongBuy,
        buy,
        hold,
        sell,
        strongSell,
        total,
        bullishPct: ((strongBuy + buy) / total) * 100,
    };
}

export function normalizeEarnings(list: FinnhubEarning[] | null | undefined, limit = 4): EarningsSurprise[] {
    if (!Array.isArray(list)) return [];
    return [...list]
        .sort((a, b) => (b.period ?? '').localeCompare(a.period ?? ''))
        .slice(0, limit)
        .reverse()
        .map((e) => ({
            label: e.year && e.quarter ? `Q${e.quarter} FY${String(e.year).slice(-2)}` : e.period ?? '',
            actual: num(e.actual),
            estimate: num(e.estimate),
            surprisePercent: num(e.surprisePercent),
        }));
}

export function pickNextEarnings(res: FinnhubEarningsCalendar | null | undefined, today: string): UpcomingEarnings | null {
    const upcoming = (res?.earningsCalendar ?? [])
        .filter((e): e is { date: string; hour?: string; epsEstimate?: number | null } => Boolean(e.date) && e.date! >= today)
        .sort((a, b) => a.date.localeCompare(b.date));
    const next = upcoming[0];
    if (!next) return null;
    return { date: next.date, hour: next.hour ?? '', epsEstimate: num(next.epsEstimate) };
}

export function isForeignCurrency(currency: string | null | undefined): boolean {
    return Boolean(currency) && currency!.toUpperCase() !== 'USD';
}

export function computeDrawdown(price: number | null, high52: number | null): number | null {
    if (!price || !high52 || high52 <= 0) return null;
    return Math.min(0, ((price - high52) / high52) * 100);
}

export function pickHeadlines(list: RawNewsArticle[] | null | undefined, limit = 3): NewsHeadline[] {
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    const out: NewsHeadline[] = [];
    for (const a of [...list].sort((x, y) => (y.datetime ?? 0) - (x.datetime ?? 0))) {
        const headline = a.headline?.trim();
        if (!headline || !a.url || !a.datetime || seen.has(headline)) continue;
        seen.add(headline);
        out.push({ headline, url: a.url, source: a.source || 'News', datetime: a.datetime });
        if (out.length >= limit) break;
    }
    return out;
}
