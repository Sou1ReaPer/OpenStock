import React from 'react';
import type { AnalyticsStock } from '@/lib/actions/analytics.helpers';
import { changeClass, daysUntil, earningsHourLabel, fmtPct } from './format';

function Card({ label, value, detail, valueClass }: { label: string; value: string; detail?: string; valueClass?: string }) {
    return (
        <div className="rounded-xl border border-white/10 bg-[#141414] p-5">
            <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
            <p className={`mt-2 text-2xl font-semibold tabular-nums ${valueClass ?? 'text-gray-100'}`}>{value}</p>
            {detail && <p className="mt-1 text-sm text-gray-400 truncate">{detail}</p>}
        </div>
    );
}

export default function SummaryCards({ stocks }: { stocks: AnalyticsStock[] }) {
    const priced = stocks.filter((s) => s.changePercent !== null);
    const avgChange = priced.length
        ? priced.reduce((sum, s) => sum + (s.changePercent ?? 0), 0) / priced.length
        : null;
    const sorted = [...priced].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0));
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    const next = stocks
        .filter((s) => s.nextEarnings)
        .sort((a, b) => a.nextEarnings!.date.localeCompare(b.nextEarnings!.date))[0];
    const nextDays = next ? daysUntil(next.nextEarnings!.date) : null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card
                label="Watchlist today"
                value={fmtPct(avgChange, 2, true)}
                valueClass={changeClass(avgChange)}
                detail={`Equal-weighted average of ${priced.length} stocks`}
            />
            <Card
                label="Top gainer"
                value={best ? best.symbol : '—'}
                detail={best ? `${fmtPct(best.changePercent, 2, true)} · ${best.name}` : undefined}
            />
            <Card
                label="Top loser"
                value={worst && worst !== best ? worst.symbol : '—'}
                detail={worst && worst !== best ? `${fmtPct(worst.changePercent, 2, true)} · ${worst.name}` : undefined}
            />
            <Card
                label="Next earnings"
                value={next ? next.symbol : '—'}
                detail={
                    next
                        ? `${next.nextEarnings!.date}${earningsHourLabel(next.nextEarnings!.hour) ? ` ${earningsHourLabel(next.nextEarnings!.hour)}` : ''} · ${nextDays === 0 ? 'today' : `in ${nextDays} days`}`
                        : 'None in the next 90 days'
                }
            />
        </div>
    );
}
