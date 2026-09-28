'use client';

import React from 'react';
import {
    CartesianGrid,
    LabelList,
    ResponsiveContainer,
    Scatter,
    ScatterChart,
    Tooltip,
    XAxis,
    YAxis,
    ZAxis,
} from 'recharts';
import type { AnalyticsStock } from '@/lib/actions/analytics.helpers';
import ChartCard from './ChartCard';
import { CHART_COLORS, fmtMarketCap, fmtNum, fmtPct } from './format';

type Point = {
    symbol: string;
    name: string;
    forwardPE: number;
    revenueGrowth: number;
    marketCap: number | null;
    size: number;
};

function PointTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    return (
        <div className="rounded-lg border border-line bg-card px-3 py-2 text-xs shadow-xl">
            <p className="font-semibold text-foreground">{p.symbol} <span className="font-normal text-muted-foreground">{p.name}</span></p>
            <p className="text-muted-foreground mt-1">Forward P/E <span className="tabular-nums text-foreground">{fmtNum(p.forwardPE)}</span></p>
            <p className="text-muted-foreground">Revenue growth <span className="tabular-nums text-foreground">{fmtPct(p.revenueGrowth, 1, true)}</span></p>
            <p className="text-muted-foreground">Market cap <span className="tabular-nums text-foreground">{fmtMarketCap(p.marketCap)}</span></p>
        </div>
    );
}

export default function ValuationGrowthScatter({ stocks }: { stocks: AnalyticsStock[] }) {
    const points: Point[] = [];
    const excluded: string[] = [];
    for (const s of stocks) {
        const pe = s.metrics?.forwardPE;
        const growth = s.metrics?.revenueGrowthTTM;
        if (pe && pe > 0 && growth !== null && growth !== undefined) {
            points.push({
                symbol: s.symbol,
                name: s.name,
                forwardPE: pe,
                revenueGrowth: growth,
                marketCap: s.marketCap,
                // Stocks without a USD market cap get a neutral mid size
                size: s.marketCap ?? 500_000,
            });
        } else {
            excluded.push(s.symbol);
        }
    }

    const maxPE = Math.max(...points.map((p) => p.forwardPE), 1);
    const minPE = Math.min(...points.map((p) => p.forwardPE), maxPE);
    const useLog = maxPE / minPE > 15;
    // Log scale gets explicit round ticks; recharts' defaults are sparse on a log axis
    const logTicks = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000].filter((t) => t >= minPE / 1.5 && t <= maxPE * 1.5);

    const notes = ['Bubble size = market cap.'];
    if (useLog) notes.push('X axis is log scale.');
    if (excluded.length) notes.push(`Not shown (no forward P/E or growth data): ${excluded.join(', ')}.`);

    return (
        <ChartCard
            title="Valuation vs growth"
            description="Forward P/E against trailing-twelve-month revenue growth"
            footnote={notes.join(' ')}
        >
            {points.length === 0 ? (
                <p className="py-16 text-center text-sm text-faint">No valuation data available.</p>
            ) : (
                <div className="h-[320px]">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 48, bottom: 24, left: 8 }}>
                            <CartesianGrid stroke={CHART_COLORS.grid} strokeDasharray="0" />
                            <XAxis
                                type="number"
                                dataKey="forwardPE"
                                name="Forward P/E"
                                scale={useLog ? 'log' : 'auto'}
                                domain={useLog ? [minPE / 1.3, maxPE * 1.3] : ['auto', 'auto']}
                                ticks={useLog ? logTicks : undefined}
                                allowDataOverflow={false}
                                tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
                                stroke={CHART_COLORS.grid}
                                tickFormatter={(v: number) => fmtNum(v, 0)}
                                label={{ value: 'Forward P/E', position: 'insideBottom', offset: -14, fill: CHART_COLORS.textSecondary, fontSize: 12 }}
                            />
                            <YAxis
                                type="number"
                                dataKey="revenueGrowth"
                                name="Revenue growth"
                                tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
                                stroke={CHART_COLORS.grid}
                                tickFormatter={(v: number) => `${v}%`}
                                domain={[(dataMin: number) => Math.min(0, Math.floor(dataMin / 25) * 25), (dataMax: number) => Math.ceil((dataMax + 10) / 25) * 25]}
                                width={52}
                            />
                            <ZAxis type="number" dataKey="size" range={[80, 900]} />
                            <Tooltip content={<PointTooltip />} cursor={{ stroke: CHART_COLORS.axis, strokeDasharray: '3 3' }} />
                            <Scatter
                                data={points}
                                fill={CHART_COLORS.series}
                                fillOpacity={0.7}
                                stroke={CHART_COLORS.surface}
                                strokeWidth={2}
                                isAnimationActive={false}
                            >
                                <LabelList dataKey="symbol" position="right" offset={10} fill={CHART_COLORS.textPrimary} fontSize={11} />
                            </Scatter>
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            )}
        </ChartCard>
    );
}
