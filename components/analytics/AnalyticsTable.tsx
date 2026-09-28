'use client';

import React, { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowDown, ArrowUp, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import TradingViewWidget from '@/components/TradingViewWidget';
import Panel from '@/components/Panel';
import { CANDLE_CHART_WIDGET_CONFIG } from '@/lib/constants';
import { formatSymbolForTradingView, formatTimeAgo } from '@/lib/utils';
import type { AnalyticsStock } from '@/lib/actions/analytics.helpers';
import { changeClass, fmtMarketCap, fmtNum, fmtPct, fmtPrice } from './format';

type Column = {
    key: string;
    label: string;
    value: (s: AnalyticsStock) => number | string | null;
    render: (s: AnalyticsStock) => React.ReactNode;
    align?: 'left' | 'right';
};

const COLUMNS: Column[] = [
    {
        key: 'symbol',
        label: 'Symbol',
        align: 'left',
        value: (s) => s.symbol,
        render: (s) => (
            <div className="flex flex-col">
                <span className="font-mono font-semibold text-foreground">{s.symbol}</span>
                <span className="text-xs text-faint truncate max-w-[160px]">{s.name}</span>
            </div>
        ),
    },
    { key: 'price', label: 'Price', value: (s) => s.price, render: (s) => <span className="text-foreground">{fmtPrice(s.price)}</span> },
    {
        key: 'change',
        label: 'Today',
        value: (s) => s.changePercent,
        render: (s) => <span className={changeClass(s.changePercent)}>{fmtPct(s.changePercent, 2, true)}</span>,
    },
    { key: 'marketCap', label: 'Mkt cap', value: (s) => s.marketCap, render: (s) => fmtMarketCap(s.marketCap) },
    { key: 'forwardPE', label: 'Fwd P/E', value: (s) => s.metrics?.forwardPE ?? null, render: (s) => fmtNum(s.metrics?.forwardPE) },
    { key: 'peTTM', label: 'P/E TTM', value: (s) => s.metrics?.peTTM ?? null, render: (s) => fmtNum(s.metrics?.peTTM) },
    {
        key: 'revenueGrowth',
        label: 'Rev growth',
        value: (s) => s.metrics?.revenueGrowthTTM ?? null,
        render: (s) => fmtPct(s.metrics?.revenueGrowthTTM, 0, true),
    },
    { key: 'netMargin', label: 'Net margin', value: (s) => s.metrics?.netMargin ?? null, render: (s) => fmtPct(s.metrics?.netMargin, 1) },
    { key: 'drawdown', label: 'From high', value: (s) => s.drawdownFromHigh, render: (s) => fmtPct(s.drawdownFromHigh, 1) },
    {
        key: 'return13w',
        label: '13 wk',
        value: (s) => s.metrics?.return13w ?? null,
        render: (s) => <span className={changeClass(s.metrics?.return13w)}>{fmtPct(s.metrics?.return13w, 1, true)}</span>,
    },
    {
        key: 'bullish',
        label: 'Bullish',
        value: (s) => s.recommendation?.bullishPct ?? null,
        render: (s) => fmtPct(s.recommendation?.bullishPct, 0),
    },
    {
        key: 'nextEarnings',
        label: 'Earnings',
        value: (s) => s.nextEarnings?.date ?? null,
        render: (s) => s.nextEarnings?.date ?? '—',
    },
];

function compare(a: number | string | null, b: number | string | null, dir: 1 | -1) {
    // Missing values always sort last
    if (a === null && b === null) return 0;
    if (a === null) return 1;
    if (b === null) return -1;
    if (typeof a === 'string' && typeof b === 'string') return a.localeCompare(b) * dir;
    return ((a as number) - (b as number)) * dir;
}

function ExpandedRow({ stock, width }: { stock: AnalyticsStock; width: number | null }) {
    const tvSymbol = formatSymbolForTradingView(stock.symbol);
    return (
        // Pinned to the visible scroll area so the panel doesn't stretch to the full table width on narrow screens
        <div
            className="sticky left-0 grid grid-cols-1 lg:grid-cols-3 gap-4 p-4 bg-canvas"
            style={width ? { width } : undefined}
        >
            <div className="lg:col-span-2 min-w-0">
                <TradingViewWidget
                    scriptUrl="https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js"
                    config={{ ...CANDLE_CHART_WIDGET_CONFIG(tvSymbol), height: 420 }}
                    className="custom-chart"
                    height={420}
                />
            </div>
            <div className="flex flex-col gap-3 min-w-0">
                <h3 className="text-sm font-semibold text-foreground">Latest news</h3>
                {stock.news.length === 0 ? (
                    <p className="text-sm text-faint">No company news in the past week.</p>
                ) : (
                    <ul className="flex flex-col gap-3">
                        {stock.news.map((n) => (
                            <li key={n.url}>
                                <a
                                    href={n.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="group block text-sm text-muted-foreground hover:text-brand-ink"
                                >
                                    <span className="line-clamp-2">{n.headline}</span>
                                    <span className="text-xs text-faint">
                                        {n.source} · {formatTimeAgo(n.datetime)}
                                    </span>
                                </a>
                            </li>
                        ))}
                    </ul>
                )}
                {stock.foreignFundamentals && (
                    <p className="text-xs text-faint">
                        Fundamentals come from the {stock.fundamentalsCurrency} home listing; market cap and 52-week range are hidden
                        because they are not comparable with the USD quote.
                    </p>
                )}
                <Link
                    href={`/stocks/${stock.symbol}`}
                    className="mt-auto inline-flex items-center gap-1.5 text-sm text-brand-ink hover:underline"
                >
                    Full stock page <ExternalLink className="h-3.5 w-3.5" />
                </Link>
            </div>
        </div>
    );
}

export default function AnalyticsTable({ stocks }: { stocks: AnalyticsStock[] }) {
    const [sortKey, setSortKey] = useState('marketCap');
    const [dir, setDir] = useState<1 | -1>(-1);
    const [expanded, setExpanded] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [visibleWidth, setVisibleWidth] = useState<number | null>(null);

    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const observer = new ResizeObserver(() => setVisibleWidth(el.clientWidth));
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const sorted = useMemo(() => {
        const col = COLUMNS.find((c) => c.key === sortKey) ?? COLUMNS[0];
        return [...stocks].sort((a, b) => compare(col.value(a), col.value(b), dir));
    }, [stocks, sortKey, dir]);

    const onSort = (key: string) => {
        if (key === sortKey) {
            setDir((d) => (d === 1 ? -1 : 1));
        } else {
            setSortKey(key);
            setDir(key === 'symbol' || key === 'nextEarnings' ? 1 : -1);
        }
    };

    return (
        <Panel title="Watchlist details" sub="Click a column to sort, click a row for chart and news" bodyClassName="overflow-hidden">
            <div ref={scrollRef} className="overflow-x-auto">
                <table className="data-table text-sm">
                    <thead>
                        <tr>
                            <th className="w-8 !px-0" aria-label="Expand" />
                            {COLUMNS.map((c) => (
                                <th
                                    key={c.key}
                                    className={c.align === 'left' ? '' : 'is-num'}
                                    aria-sort={sortKey === c.key ? (dir === 1 ? 'ascending' : 'descending') : 'none'}
                                >
                                    <button
                                        type="button"
                                        onClick={() => onSort(c.key)}
                                        className={`inline-flex items-center gap-1 hover:text-foreground ${sortKey === c.key ? 'text-foreground' : ''}`}
                                    >
                                        {c.label}
                                        {sortKey === c.key && (dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                                    </button>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {sorted.map((s) => {
                            const isOpen = expanded === s.symbol;
                            return (
                                <Fragment key={s.symbol}>
                                    <tr
                                        onClick={() => setExpanded(isOpen ? null : s.symbol)}
                                        className={`cursor-pointer ${isOpen ? '[&>td]:!bg-hover' : ''}`}
                                        aria-expanded={isOpen}
                                    >
                                        <td className="!pr-0 text-faint">
                                            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                                        </td>
                                        {COLUMNS.map((c) => (
                                            <td
                                                key={c.key}
                                                className={`text-muted-foreground ${c.align === 'left' ? '' : 'is-num'}`}
                                            >
                                                {c.render(s)}
                                            </td>
                                        ))}
                                    </tr>
                                    {isOpen && (
                                        <tr>
                                            <td colSpan={COLUMNS.length + 1} className="!h-auto !p-0">
                                                <ExpandedRow stock={s} width={visibleWidth} />
                                            </td>
                                        </tr>
                                    )}
                                </Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </Panel>
    );
}
