'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Circle, CircleDashed, ListChecks, Plus, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import { getEntityId } from '@/lib/entity';
import { useConfirmDialog } from '@/components/ui/confirm-dialog-provider';

type Status = 'todo' | 'in_progress' | 'blocked' | 'done';
type Task = { id: string; title: string; status: Status; assignee?: string | null; due_date?: string | null; notes?: string | null };
type Summary = { done: number; total: number; percentage: number };

type Props = {
  showId: string;
  endpoint?: string;
  canEdit: boolean;
  canDelete?: boolean;
};

export default function AdvanceChecklist({ showId, endpoint, canEdit, canDelete = false }: Props) {
  const base = endpoint || `/api/shows/${encodeURIComponent(showId)}/advance`;
  const [tasks, setTasks] = useState<Task[]>([]);
  const [summary, setSummary] = useState<Summary>({ done: 0, total: 0, percentage: 0 });
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const entityId = getEntityId();
  const confirmDialog = useConfirmDialog();
  const headers = useCallback((json = false): HeadersInit => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(entityId ? { 'X-Entity-Id': entityId } : {}),
  }), [entityId]);

  const load = useCallback(async () => {
    const response = await fetch(base, { cache: 'no-store', headers: headers() });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Unable to load advancing checklist');
    setTasks(data.tasks || []);
    setSummary(data.summary || { done: 0, total: 0, percentage: 0 });
  }, [base, headers]);

  useEffect(() => {
    void load().catch((error) => toast.error(error.message)).finally(() => setLoading(false));
  }, [load]);

  async function update(task: Task, changes: Partial<Task>) {
    setTasks((current) => current.map((item) => item.id === task.id ? { ...item, ...changes } : item));
    try {
      const response = await fetch(`${base}/${encodeURIComponent(task.id)}`, {
        method: 'PATCH',
        headers: headers(true),
        body: JSON.stringify({
          ...(changes.title !== undefined ? { title: changes.title } : {}),
          ...(changes.status !== undefined ? { status: changes.status } : {}),
          ...(changes.assignee !== undefined ? { assignee: changes.assignee } : {}),
          ...(changes.due_date !== undefined ? { dueDate: changes.due_date } : {}),
          ...(changes.notes !== undefined ? { notes: changes.notes } : {}),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Task could not be updated');
      await load();
    } catch (error) {
      await load().catch(() => {});
      toast.error(error instanceof Error ? error.message : 'Task could not be updated');
    }
  }

  async function add() {
    const nextTitle = title.trim();
    if (!nextTitle) return;
    const response = await fetch(base, { method: 'POST', headers: headers(true), body: JSON.stringify({ title: nextTitle }) });
    const data = await response.json();
    if (!response.ok) return toast.error(data.error?.message || 'Task could not be added');
    setTitle('');
    await load();
    toast.success('Advancing task added');
  }

  async function remove(task: Task) {
    const confirmed = await confirmDialog({
      title: `Remove “${task.title}”?`,
      description: 'This custom or default advancing task will be permanently removed from this show.',
      confirmLabel: 'Remove task',
      tone: 'destructive',
    });
    if (!confirmed) return;
    const response = await fetch(`${base}/${encodeURIComponent(task.id)}`, { method: 'DELETE', headers: headers() });
    if (!response.ok) return toast.error('Task could not be removed');
    await load();
    toast.success('Advancing task removed');
  }

  const statusIcon = (status: Status) => status === 'done' ? <Check size={16} />
    : status === 'in_progress' ? <CircleDashed size={16} />
      : status === 'blocked' ? <TriangleAlert size={16} /> : <Circle size={16} />;

  return (
    <section id="advancing" className="scroll-mt-24 rounded-[22px] border border-[#d8d0c3] bg-[#fffaf2] p-4 shadow-[0_18px_50px_rgba(45,37,24,.07)] sm:rounded-lg sm:p-6 md:p-7">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="flex items-start gap-3"><ListChecks className="mt-1 text-[#e74428]" /><div><h2 className="text-2xl font-black">Show advancing</h2><p className="mt-1 text-sm text-[#686258]">Production, hospitality and commercial details required before show day.</p></div></div>
        <div className="min-w-32 rounded-2xl bg-[#f2ebe0] p-3 sm:bg-transparent sm:p-0"><div className="flex items-center justify-between sm:block"><p className="text-sm font-black sm:hidden">Readiness</p><p className="text-right text-2xl font-black">{summary.percentage}%</p></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-[#ded6c9]"><div className="h-full bg-[#7d9c17] transition-all" style={{ width: `${summary.percentage}%` }} /></div><p className="mt-1 text-right text-xs font-bold text-[#777064]">{summary.done} of {summary.total} ready</p></div>
      </div>
      {loading ? <p className="mt-6 text-sm text-[#686258]">Loading checklist...</p> : <div className="mt-6 divide-y divide-[#e2dbd0]">{tasks.map((task) => <div key={task.id} className="grid grid-cols-[44px_minmax(0,1fr)_44px] gap-2 py-4 md:grid-cols-[auto_1fr_150px_145px_auto] md:items-center md:gap-3">
        <button type="button" disabled={!canEdit} onClick={() => void update(task, { status: task.status === 'done' ? 'todo' : 'done' })} className={`flex h-11 w-11 items-center justify-center rounded-full border md:h-8 md:w-8 ${task.status === 'done' ? 'border-[#7d9c17] bg-[#7d9c17] text-white' : task.status === 'blocked' ? 'border-[#c43d27] text-[#c43d27]' : 'border-[#bdb5aa]'} disabled:opacity-60`} aria-label={task.status === 'done' ? 'Mark incomplete' : 'Mark complete'}>{statusIcon(task.status)}</button>
        <div><p className={`font-bold ${task.status === 'done' ? 'text-[#777064] line-through' : ''}`}>{task.title}</p>{task.notes && <p className="mt-1 text-xs text-[#777064]">{task.notes}</p>}</div>
        <input disabled={!canEdit} value={task.assignee || ''} onChange={(event) => setTasks((current) => current.map((item) => item.id === task.id ? { ...item, assignee: event.target.value } : item))} onBlur={(event) => void update(task, { assignee: event.currentTarget.value })} maxLength={120} placeholder="Responsible person" className="col-start-2 h-11 rounded-md border border-[#d8d0c3] bg-white px-3 text-base disabled:bg-transparent md:col-start-auto md:h-9 md:text-xs" />
        <input disabled={!canEdit} type="date" value={task.due_date?.slice(0, 10) || ''} onChange={(event) => void update(task, { due_date: event.target.value })} className="col-start-2 h-11 rounded-md border border-[#d8d0c3] bg-white px-2 text-base disabled:bg-transparent md:col-start-auto md:h-9 md:text-xs" />
        {canDelete ? <button type="button" onClick={() => void remove(task)} className="col-start-3 row-start-1 flex h-11 w-11 items-center justify-center rounded-md text-[#9b4939] hover:bg-[#fff1ec] md:col-start-auto md:row-start-auto md:h-auto md:w-auto md:p-2" aria-label={`Remove ${task.title}`} title="Remove task"><Trash2 size={16} /></button> : <span />}
      </div>)}</div>}
      {canEdit && <div className="mt-5 flex flex-col gap-2 border-t border-[#d8d0c3] pt-5 sm:flex-row"><input value={title} maxLength={160} onChange={(event) => setTitle(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); void add(); } }} placeholder="Add a custom advancing task" className="h-12 flex-1 rounded-md border border-[#d8d0c3] bg-white px-4 text-base sm:h-11" /><button type="button" disabled={!title.trim()} onClick={() => void add()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-[#171713] px-5 font-bold text-white disabled:opacity-40 sm:min-h-11"><Plus size={16} /> Add</button></div>}
    </section>
  );
}
