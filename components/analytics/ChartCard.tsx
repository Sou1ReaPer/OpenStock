import React from 'react';

type ChartCardProps = {
    title: string;
    description?: string;
    footnote?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
};

export default function ChartCard({ title, description, footnote, action, children }: ChartCardProps) {
    return (
        <section className="rounded-xl border border-white/10 bg-[#141414] p-5 flex flex-col gap-4 min-w-0">
            <header className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h2 className="text-base font-semibold text-gray-100">{title}</h2>
                    {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
                </div>
                {action}
            </header>
            <div className="min-w-0">{children}</div>
            {footnote && <p className="text-xs text-gray-500">{footnote}</p>}
        </section>
    );
}
