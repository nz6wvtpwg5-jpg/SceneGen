'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, RefreshCw } from 'lucide-react';

type OutstandingTask = { id: string; title: string; status: 'todo' | 'in_progress' | 'blocked'; assignee?: string | null; dueDate?: string | null; overdue: boolean };
type HealthShow = { id: string; date: string; status: string; venueName?: string | null; city?: string | null; country?: string | null; readiness: number; tasks: { done: number; total: number; outstanding: OutstandingTask[] }; recentUpdates: number };
type Health = { windowDays: number; summary: { activeDates: number; cancelledDates: number; roadReady: number; needAttention: number; datesWithUpdates: number }; shows: HealthShow[] };

function showName(show: HealthShow) {
  return show.venueName || show.city || 'Location TBC';
}

function showDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  const date = year && month && day ? new Date(year, month - 1, day) : new Date(value);
  return Number.isNaN(date.getTime()) ? 'Date TBC' : date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function TourHealth({ tourId, entityId }: { tourId: string; entityId: string }) {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    const response = await fetch(`/api/tours/${encodeURIComponent(tourId)}/health`, {
      cache: 'no-store',
      credentials: 'include',
      headers: { 'X-Entity-Id': entityId },
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Tour health could not be loaded');
    setHealth(data);
  }, [entityId, tourId]);

  const refresh = () => {
    setLoading(true);
    void load()
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Tour health could not be loaded'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refresh();
  }, [load]);

  if (loading) return <section className="mb-10 animate-pulse rounded-lg border border-border-subtle bg-surface-elevated p-7"><div className="h-5 w-32 rounded bg-black/10" /><div className="mt-6 h-24 rounded bg-black/10" /></section>;

  if (error || !health) return <section className="mb-10 flex flex-col justify-between gap-4 rounded-lg border border-semantic-error/20 bg-semantic-error/5 p-6 sm:flex-row sm:items-center"><div><h2 className="font-black">Tour health unavailable</h2><p className="mt-1 text-sm text-text-tertiary">{error}</p></div><button type="button" onClick={refresh} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border-subtle px-4 text-sm font-bold"><RefreshCw size={15} />Retry</button></section>;

  const attention = health.shows.filter((show) => show.status !== 'cancelled' && show.readiness < 100);
  return <section className="mb-10 overflow-hidden rounded-lg border border-border-subtle bg-surface-elevated" aria-labelledby="tour-health-title">
    <div className="flex flex-col justify-between gap-4 border-b border-border-subtle p-6 sm:flex-row sm:items-end lg:p-7"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff5a36]">Operational overview</p><h2 id="tour-health-title" className="mt-2 text-3xl font-black text-foreground">Tour health</h2><p className="mt-2 text-sm text-text-tertiary">Calculated from each active date&apos;s live advancing checklist.</p></div><button type="button" onClick={refresh} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-border-subtle px-4 text-sm font-bold hover:bg-surface-hover"><RefreshCw size={15} />Refresh</button></div>
    <div className="grid border-b border-border-subtle sm:grid-cols-3">
      <div className="border-b border-border-subtle p-6 sm:border-b-0 sm:border-r"><CheckCircle2 className="text-semantic-success" size={20} /><strong className="mt-6 block text-4xl text-foreground">{health.summary.roadReady}</strong><p className="mt-1 text-sm font-bold text-text-tertiary">Road ready</p></div>
      <div className="border-b border-border-subtle p-6 sm:border-b-0 sm:border-r"><AlertTriangle className="text-semantic-warning" size={20} /><strong className="mt-6 block text-4xl text-foreground">{health.summary.needAttention}</strong><p className="mt-1 text-sm font-bold text-text-tertiary">Need attention</p></div>
      <div className="p-6"><Clock3 className="text-[#ff5a36]" size={20} /><strong className="mt-6 block text-4xl text-foreground">{health.summary.datesWithUpdates}</strong><p className="mt-1 text-sm font-bold text-text-tertiary">Dates updated in {health.windowDays} days</p></div>
    </div>
    {attention.length ? <div><div className="flex items-center justify-between border-b border-border-subtle px-6 py-4"><h3 className="font-black text-foreground">What needs attention</h3><span className="text-xs font-bold text-text-tertiary">{attention.length} {attention.length === 1 ? 'date' : 'dates'}</span></div><div className="divide-y divide-border-subtle">{attention.map((show) => <article key={show.id} className="grid gap-4 p-6 lg:grid-cols-[minmax(190px,0.8fr)_minmax(0,1.7fr)_auto] lg:items-center">
      <div><h4 className="font-black text-foreground">{showName(show)}</h4><p className="mt-1 text-xs text-text-tertiary">{showDate(show.date)}{show.city ? ` - ${show.city}${show.country ? `, ${show.country}` : ''}` : ''}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-black/10"><div className="h-full bg-[#ff5a36]" style={{ width: `${show.readiness}%` }} /></div><p className="mt-1 text-xs font-bold text-text-tertiary">{show.readiness}% advanced</p></div>
      <ul className="space-y-2">{show.tasks.outstanding.slice(0, 3).map((task) => <li key={task.id} className="flex items-start gap-2 text-sm text-foreground"><span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${task.status === 'blocked' || task.overdue ? 'bg-semantic-error' : 'bg-semantic-warning'}`} /><span><strong>{task.title}</strong>{task.status === 'blocked' ? <span className="ml-2 text-xs font-black uppercase text-semantic-error">Blocked</span> : task.overdue ? <span className="ml-2 text-xs font-black uppercase text-semantic-error">Overdue</span> : null}{task.assignee && <span className="block text-xs text-text-tertiary">Responsible: {task.assignee}</span>}</span></li>)}{show.tasks.outstanding.length > 3 && <li className="text-xs font-bold text-text-tertiary">+{show.tasks.outstanding.length - 3} more checklist items</li>}{show.tasks.total === 0 && <li className="text-sm font-bold text-semantic-warning">No advancing checklist is configured.</li>}</ul>
      <Link href={`/shows/${encodeURIComponent(show.id)}#advancing`} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#11140f] px-4 text-sm font-bold text-white hover:bg-[#292d26]">Open day sheet <ArrowRight size={15} /></Link>
    </article>)}</div></div> : <div className="flex items-center gap-3 p-6 text-sm font-bold text-semantic-success"><CheckCircle2 size={20} />Every active date is fully advanced.</div>}
  </section>;
}
