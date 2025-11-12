'use client';

import React from 'react';

function cx(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

interface PlaygroundCardProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  badge?: string;
  actions?: React.ReactNode;
  id?: string;
}

export const PlaygroundCard: React.FC<PlaygroundCardProps> = ({
  title,
  description,
  children,
  badge,
  actions,
  id
}) => {
  return (
    <section
      id={id}
      className="rounded-2xl border border-slate-200 bg-white/80 shadow-sm ring-1 ring-slate-100 backdrop-blur"
    >
      <div className="flex flex-col gap-3 border-b border-slate-100 p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-slate-900">{title}</h2>
            {badge && (
              <span className="rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-medium text-indigo-700">
                {badge}
              </span>
            )}
          </div>
          {description && <p className="mt-2 text-sm text-slate-600">{description}</p>}
        </div>
        {actions && <div className="flex gap-3">{actions}</div>}
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </section>
  );
};

interface ResultViewerProps {
  label: string;
  data?: unknown;
  status?: 'idle' | 'loading' | 'success' | 'error';
  error?: string | null;
}

export const ResultViewer: React.FC<ResultViewerProps> = ({ label, data, status = 'idle', error }) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
      <div className="mb-2 flex items-center justify-between text-slate-500">
        <span className="font-medium uppercase tracking-wide text-xs">{label}</span>
        <span
          className={cx(
            'rounded-full px-2 py-0.5 text-[11px] font-semibold',
            status === 'success' && 'bg-emerald-100 text-emerald-700',
            status === 'error' && 'bg-rose-100 text-rose-700',
            status === 'loading' && 'bg-amber-100 text-amber-700',
            status === 'idle' && 'bg-slate-200 text-slate-600'
          )}
        >
          {status.toUpperCase()}
        </span>
      </div>
      <pre className="max-h-64 overflow-auto rounded-lg bg-slate-900/90 p-3 text-xs text-slate-100">
        {error ? error : data ? JSON.stringify(data, null, 2) : '// run the example to inspect output'}
      </pre>
    </div>
  );
};
