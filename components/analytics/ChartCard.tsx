import React from 'react';
import Panel from '@/components/Panel';

type ChartCardProps = {
    title: string;
    description?: string;
    footnote?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
};

export default function ChartCard({ title, description, footnote, action, children }: ChartCardProps) {
    return (
        <Panel title={title} sub={description} action={action} bodyClassName="flex flex-1 flex-col gap-3 p-4">
            <div className="min-w-0">{children}</div>
            {footnote && <p className="mt-auto text-xs text-faint">{footnote}</p>}
        </Panel>
    );
}
