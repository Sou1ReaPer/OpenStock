'use client';

import React from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsStock } from '@/lib/actions/analytics.helpers';
import ChartCard from './ChartCard';
import { CHART_COLORS, fmtPct } from './format';

const SEGMENTS = [
    { key: 'strongBuy', label: 'Strong buy', color: CHART_COLORS.strongBuy },
    { key: 'buy', label: 'Buy', color: CHART_COLORS.buy },
    { key: 'hold', label: 'Hold', color: CHART_COLORS.hold },
    { key: 'sell', label: 'Sell', color: CHART_COLORS.sell },
    { key: 'strongSell', label: 'Strong sell', color: CHART_COLORS.strongSell },
] as const;

type SegmentKey = (typeof SEGMENTS)[number]['key'];
type Row = { symbol: string; total: number; bullishPct: number; period: string } & Record<SegmentKey, number> &
    Record<`${SegmentKey}Count`, number>;

function RowTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
    if (!active || !payload?.length) return null;
    const r = payload[0].payload;
    return (
        <div className="rounded-lg border border-white/10 bg-black/90 px-3 py-2 text-xs shadow-xl min-w-[160px]">
            <p className="font-semibold text-gray-100">
                {r.symbol} <span className="font-normal text-gray-400">· {r.total} analysts · {r.period}</span>
            </p>
            <ul className="mt-1 space-y-0.5">
                {SEGMENTS.map((s) => (
                    <li key={s.key} className="flex items-center justify-between gap-4 text-gray-300">
                        <span className="flex items-center gap-1.5">
                            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: s.color }} />
                            {s.label}
                        </span>
                        <span className="tabular-nums text-gray-100">{r[`${s.key}Count`]}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default function AnalystRatingsBars({ stocks }: { stocks: AnalyticsStock[] }) {
    const rows: Row[] = stocks
        .filter((s) => s.recommendation)
        .map((s) => {
            const r = s.recommendation!;
            const row = { symbol: s.symbol, total: r.total, bullishPct: r.bullishPct, period: r.period } as Row;
            for (const seg of SEGMENTS) {
                row[seg.key] = (r[seg.key] / r.total) * 100;
                row[`${seg.key}Count`] = r[seg.key];
            }
            return row;
        })
        .sort((a, b) => b.bullishPct - a.bullishPct);
    const bullishBySymbol = new Map(rows.map((r) => [r.symbol, r.bullishPct]));

    return (
        <ChartCard
            title="Analyst ratings"
            description="Share of analysts per rating, latest month. Sorted by buy + strong buy."
        >
            {rows.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-500">No analyst ratings available.</p>
            ) : (
                <>
                    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mb-3">
                        {SEGMENTS.map((s) => (
                            <li key={s.key} className="flex items-center gap-1.5">
                                <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />
                                {s.label}
                            </li>
                        ))}
                    </ul>
                    <div style={{ height: rows.length * 32 + 32 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={rows} layout="vertical" margin={{ top: 0, right: 4, bottom: 4, left: 4 }} barCategoryGap={6}>
                                <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
                                <XAxis
                                    type="number"
                                    domain={[0, 100]}
                                    ticks={[0, 25, 50, 75, 100]}
                                    tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
                                    stroke={CHART_COLORS.grid}
                                    tickFormatter={(v: number) => `${v}%`}
                                />
                                <YAxis
                                    type="category"
                                    dataKey="symbol"
                                    tick={{ fill: CHART_COLORS.textPrimary, fontSize: 12 }}
                                    stroke={CHART_COLORS.grid}
                                    width={52}
                                />
                                {/* Direct label: bullish share for each row */}
                                <YAxis
                                    yAxisId="bullish"
                                    orientation="right"
                                    type="category"
                                    dataKey="symbol"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: CHART_COLORS.textSecondary, fontSize: 11 }}
                                    tickFormatter={(sym: string) => fmtPct(bullishBySymbol.get(sym), 0)}
                                    width={40}
                                />
                                <Tooltip content={<RowTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                                {SEGMENTS.map((s, i) => (
                                    <Bar
                                        key={s.key}
                                        dataKey={s.key}
                                        stackId="ratings"
                                        fill={s.color}
                                        stroke={CHART_COLORS.surface}
                                        strokeWidth={1}
                                        radius={i === SEGMENTS.length - 1 ? [0, 4, 4, 0] : i === 0 ? [4, 0, 0, 4] : 0}
                                        isAnimationActive={false}
                                    />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </ChartCard>
    );
}
