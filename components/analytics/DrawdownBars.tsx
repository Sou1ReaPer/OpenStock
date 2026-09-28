'use client';

import React from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsStock } from '@/lib/actions/analytics.helpers';
import ChartCard from './ChartCard';
import { CHART_COLORS, fmtPct, fmtPrice } from './format';

type Row = { symbol: string; /** percent below the high, positive */ below: number; drawdown: number; price: number | null; high: number | null };

function RowTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
    if (!active || !payload?.length) return null;
    const r = payload[0].payload;
    return (
        <div className="rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-xl">
            <p className="font-semibold text-foreground">{r.symbol}</p>
            <p className="text-muted-foreground mt-1">From 52-week high <span className="tabular-nums text-foreground">{fmtPct(r.drawdown)}</span></p>
            <p className="text-muted-foreground">Price <span className="tabular-nums text-foreground">{fmtPrice(r.price)}</span></p>
            <p className="text-muted-foreground">52-week high <span className="tabular-nums text-foreground">{fmtPrice(r.high)}</span></p>
        </div>
    );
}

export default function DrawdownBars({ stocks }: { stocks: AnalyticsStock[] }) {
    const rows: Row[] = stocks
        .filter((s) => s.drawdownFromHigh !== null)
        .map((s) => ({ symbol: s.symbol, below: -s.drawdownFromHigh!, drawdown: s.drawdownFromHigh!, price: s.price, high: s.metrics?.high52 ?? null }))
        .sort((a, b) => a.drawdown - b.drawdown);
    const excluded = stocks.filter((s) => s.drawdownFromHigh === null).map((s) => s.symbol);

    return (
        <ChartCard
            title="Distance from 52-week high"
            description="How far each stock trades below its one-year peak"
            footnote={excluded.length ? `Not shown (52-week range reported in a foreign currency or unavailable): ${excluded.join(', ')}.` : undefined}
        >
            {rows.length === 0 ? (
                <p className="py-16 text-center text-sm text-faint">No price range data available.</p>
            ) : (
                <div style={{ height: Math.max(160, rows.length * 36 + 40) }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 52, bottom: 4, left: 4 }} barCategoryGap={6}>
                            <CartesianGrid stroke={CHART_COLORS.grid} horizontal={false} />
                            <XAxis
                                type="number"
                                domain={[0, (dataMax: number) => Math.max(5, Math.ceil(dataMax / 10) * 10)]}
                                tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
                                stroke={CHART_COLORS.grid}
                                tickFormatter={(v: number) => (v === 0 ? '0%' : `-${Math.round(v)}%`)}
                            />
                            <YAxis
                                type="category"
                                dataKey="symbol"
                                tick={{ fill: CHART_COLORS.textPrimary, fontSize: 12 }}
                                stroke={CHART_COLORS.grid}
                                width={52}
                            />
                            <Tooltip content={<RowTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                            <Bar dataKey="below" fill={CHART_COLORS.series} radius={[0, 4, 4, 0]} minPointSize={2} isAnimationActive={false}>
                                <LabelList
                                    dataKey="drawdown"
                                    position="right"
                                    fill={CHART_COLORS.textSecondary}
                                    fontSize={11}
                                    formatter={(v) => fmtPct(Number(v))}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}
        </ChartCard>
    );
}
