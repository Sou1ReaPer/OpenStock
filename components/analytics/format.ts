// Chart colors, stepped for the app's dark surface (see dataviz reference palette, dark column)
export const CHART_COLORS = {
    surface: '#141414',
    grid: '#262626',
    axis: '#737373',
    textPrimary: '#f3f4f6',
    textSecondary: '#9ca3af',
    series: '#3987e5',
    positive: '#3987e5',
    negative: '#e66767',
    // Diverging blue <-> red with a neutral gray midpoint, for analyst ratings
    strongBuy: '#3987e5',
    buy: '#86b6ef',
    hold: '#5c5b57',
    sell: '#f0a3a3',
    strongSell: '#e66767',
} as const;

export const dash = '—';

export function fmtPct(v: number | null | undefined, digits = 1, signed = false): string {
    if (v === null || v === undefined || !Number.isFinite(v)) return dash;
    const sign = signed && v > 0 ? '+' : '';
    return `${sign}${v.toFixed(digits)}%`;
}

export function fmtNum(v: number | null | undefined, digits = 1): string {
    if (v === null || v === undefined || !Number.isFinite(v)) return dash;
    return v.toFixed(digits);
}

export function fmtPrice(v: number | null | undefined): string {
    if (v === null || v === undefined || !Number.isFinite(v)) return dash;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(v);
}

/** Finnhub market caps are in USD millions */
export function fmtMarketCap(millions: number | null | undefined): string {
    if (!millions || !Number.isFinite(millions)) return dash;
    const v = millions * 1e6;
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(1)}B`;
    return `$${(v / 1e6).toFixed(0)}M`;
}

export function changeClass(v: number | null | undefined): string {
    if (!v) return 'text-gray-400';
    return v > 0 ? 'text-green-500' : 'text-red-500';
}

export function daysUntil(date: string, from = new Date()): number {
    const target = new Date(`${date}T00:00:00Z`).getTime();
    const today = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
    return Math.round((target - today) / 86_400_000);
}

export function earningsHourLabel(hour: string): string {
    if (hour === 'bmo') return 'before open';
    if (hour === 'amc') return 'after close';
    return '';
}
