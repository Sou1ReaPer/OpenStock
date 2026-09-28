'use client';

import React, { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { AnalyticsStock, EarningsSurprise } from '@/lib/actions/analytics.helpers';
import ChartCard from './ChartCard';
import { CHART_COLORS, earningsHourLabel, fmtNum, fmtPct } from './format';

function QuarterTooltip({ active, payload }: { active?: boolean; payload?: { payload: EarningsSurprise }[] }) {
    if (!active || !payload?.length) return null;
    const q = payload[0].payload;
    return (
        <div className="rounded-lg border border-white/10 bg-black/90 px-3 py-2 text-xs shadow-xl">
            <p className="font-semibold text-gray-100">{q.label}</p>
            <p className="text-gray-300 mt-1">EPS actual <span className="tabular-nums text-gray-100">{fmtNum(q.actual, 2)}</span></p>
            <p className="text-gray-300">EPS estimate <span className="tabular-nums text-gray-100">{fmtNum(q.estimate, 2)}</span></p>
            <p className="text-gray-300">Surprise <span className="tabular-nums text-gray-100">{fmtPct(q.surprisePercent, 1, true)}</span></p>
        </div>
    );
}

export default function EarningsSurpriseChart({ stocks }: { stocks: AnalyticsStock[] }) {
    const withEarnings = stocks
        .filter((s) => s.earnings.some((e) => e.surprisePercent !== null))
        .sort((a, b) => (b.marketCap ?? -1) - (a.marketCap ?? -1));
    const [selected, setSelected] = useState(withEarnings[0]?.symbol ?? '');
    const stock = withEarnings.find((s) => s.symbol === selected) ?? withEarnings[0];
    const data = stock?.earnings.filter((e) => e.surprisePercent !== null) ?? [];
    const next = stock?.nextEarnings;

    const picker = withEarnings.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Select stock">
            {withEarnings.map((s) => (
                <button
                    key={s.symbol}
                    role="tab"
                    aria-selected={s.symbol === stock?.symbol}
                    onClick={() => setSelected(s.symbol)}
                    className={`rounded-md border px-2.5 py-1 text-xs font-mono transition-colors ${
                        s.symbol === stock?.symbol
                            ? 'border-teal-500/60 bg-teal-500/10 text-gray-100'
                            : 'border-white/10 text-gray-400 hover:text-gray-100 hover:bg-white/5'
                    }`}
                >
                    {s.symbol}
                </button>
            ))}
        </div>
    );

    return (
        <ChartCard
            title="Earnings surprise"
            description="Reported EPS vs consensus, last four quarters"
            action={picker}
            footnote={
                next
                    ? `Next report: ${next.date}${earningsHourLabel(next.hour) ? ` ${earningsHourLabel(next.hour)}` : ''}${next.epsEstimate !== null ? ` · EPS estimate ${fmtNum(next.epsEstimate, 2)}` : ''}${stock?.foreignFundamentals ? ` (${stock.fundamentalsCurrency})` : ''}`
                    : undefined
            }
        >
            {!stock || data.length === 0 ? (
                <p className="py-16 text-center text-sm text-gray-500">No earnings history available.</p>
            ) : (
                <>
                    <ul className="flex gap-4 text-xs text-gray-400 mb-3">
                        <li className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS.positive }} />
                            Beat
                        </li>
                        <li className="flex items-center gap-1.5">
                            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: CHART_COLORS.negative }} />
                            Miss
                        </li>
                    </ul>
                    <div className="h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={data} margin={{ top: 20, right: 8, bottom: 4, left: 0 }} barCategoryGap="30%">
                                <CartesianGrid stroke={CHART_COLORS.grid} vertical={false} />
                                <XAxis dataKey="label" tick={{ fill: CHART_COLORS.axis, fontSize: 12 }} stroke={CHART_COLORS.grid} />
                                <YAxis
                                    tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
                                    stroke={CHART_COLORS.grid}
                                    tickFormatter={(v: number) => `${v}%`}
                                    width={48}
                                />
                                <ReferenceLine y={0} stroke={CHART_COLORS.axis} />
                                <Tooltip content={<QuarterTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                                <Bar dataKey="surprisePercent" radius={[4, 4, 0, 0]} maxBarSize={56} isAnimationActive={false}>
                                    {data.map((q) => (
                                        <Cell key={q.label} fill={(q.surprisePercent ?? 0) >= 0 ? CHART_COLORS.positive : CHART_COLORS.negative} />
                                    ))}
                                    <LabelList
                                        dataKey="surprisePercent"
                                        position="top"
                                        fill={CHART_COLORS.textSecondary}
                                        fontSize={11}
                                        formatter={(v) => fmtPct(Number(v), 1, true)}
                                    />
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </>
            )}
        </ChartCard>
    );
}
