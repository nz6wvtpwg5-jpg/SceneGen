'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { AlertTriangle, BellRing, Check, ChevronDown, Clock3, History, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getEntityId } from '@/lib/entity';
import { useConfirmDialog } from '@/components/ui/confirm-dialog-provider';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type Update = { type: string; summary: string; at: string };
type Receipt = { name: string; seenAt: string; acknowledgedAt?: string | null };
type Notice = {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'important' | 'urgent';
  requires_acknowledgement: boolean;
  created_at: string;
  expires_at?: string | null;
  acknowledged_at?: string | null;
  receipts?: Receipt[];
};

export default function ShowUpdates({ showId, endpoint, onAttentionChange }: { showId: string; endpoint?: string; onAttentionChange?: (needed: boolean) => void }) {
  const base = endpoint || `/api/shows/${encodeURIComponent(showId)}`;
  const [updates, setUpdates] = useState<Update[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [previousVisit, setPreviousVisit] = useState<string | null>(null);
  const [canManage, setCanManage] = useState(false);
  const [tourId, setTourId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [updatesOpen, setUpdatesOpen] = useState(true);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState<Notice['severity']>('important');
  const [scope, setScope] = useState<'show' | 'tour'>('show');
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(true);
  const [visibleToCollaborators, setVisibleToCollaborators] = useState(true);
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);
  const marked = useRef(false);
  const entityId = getEntityId();
  const confirmDialog = useConfirmDialog();
  const headers = useCallback((json = false): HeadersInit => ({
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(entityId ? { 'X-Entity-Id': entityId } : {}),
  }), [entityId]);

  const load = useCallback(async (preserveUpdates = false) => {
    const response = await fetch(`${base}/updates`, { cache: 'no-store', headers: headers() });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || 'Unable to load updates');
    setNotices(body.notices || []);
    setCanManage(Boolean(body.canManage));
    setTourId(body.tourId || null);
    if (!preserveUpdates) {
      setUpdates(body.updates || []);
      setPreviousVisit(body.previousVisit || null);
    }
    if (!marked.current) {
      marked.current = true;
      void fetch(`${base}/visit`, { method: 'POST', headers: headers(true), body: '{}' });
    }
  }, [base, headers]);

  useEffect(() => {
    void load().catch((error) => toast.error(error instanceof Error ? error.message : 'Unable to load updates'));
  }, [load]);

  useEffect(() => {
    onAttentionChange?.(notices.some((notice) => notice.severity === 'urgent' || (notice.requires_acknowledgement && !notice.acknowledged_at)));
  }, [notices, onAttentionChange]);

  async function acknowledge(notice: Notice) {
    const response = await fetch(`${base}/notices/${encodeURIComponent(notice.id)}/acknowledge`, {
      method: 'POST', headers: headers(true), body: '{}',
    });
    if (!response.ok) return toast.error('Acknowledgement could not be recorded');
    setNotices((items) => items.map((item) => item.id === notice.id
      ? { ...item, acknowledged_at: new Date().toISOString() } : item));
    toast.success('Acknowledgement recorded');
  }

  async function createNotice(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !message.trim()) return;
    setSaving(true);
    try {
      const response = await fetch(`${base}/notices`, {
        method: 'POST',
        headers: headers(true),
        body: JSON.stringify({
          title,
          message,
          severity,
          scope,
          requiresAcknowledgement,
          visibleToCollaborators,
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'Notice could not be created');
      setDialogOpen(false);
      setTitle(''); setMessage(''); setSeverity('important'); setScope('show');
      setRequiresAcknowledgement(true); setVisibleToCollaborators(true); setExpiresAt('');
      await load(true);
      toast.success('Notice published');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Notice could not be created');
    } finally {
      setSaving(false);
    }
  }

  async function archiveNotice(notice: Notice) {
    const confirmed = await confirmDialog({
      title: `Archive “${notice.title}”?`,
      description: 'The notice will stop appearing on this show or tour.',
      confirmLabel: 'Archive notice',
      tone: 'destructive',
    });
    if (!confirmed) return;
    const response = await fetch(`${base}/notices/${encodeURIComponent(notice.id)}`, {
      method: 'DELETE', headers: headers(),
    });
    if (!response.ok) return toast.error('Notice could not be archived');
    setNotices((items) => items.filter((item) => item.id !== notice.id));
    toast.success('Notice archived');
  }

  return <section className="rounded-lg border border-[#d8d0c3] bg-[#fffaf2] p-6 shadow-[0_18px_50px_rgba(45,37,24,.07)] md:p-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
      <div><p className="text-xs font-black uppercase tracking-[.18em] text-[#e74428]">Latest information</p><h2 className="mt-1 flex items-center gap-3 text-2xl font-black"><BellRing />Updates & alerts</h2><p className="mt-2 text-sm text-[#686258]">Important notices and everything changed since your previous visit.</p></div>
      {canManage && <button type="button" onClick={() => setDialogOpen(true)} className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-md bg-[#171713] px-4 py-2.5 text-sm font-bold text-white"><Plus size={16} />New notice</button>}
    </div>

    {notices.length > 0 && <div className="mt-6 space-y-3">{notices.map((notice) => <article key={notice.id} className={`rounded-lg border p-5 ${notice.severity === 'urgent' ? 'border-[#ff5738] bg-[#fff0eb]' : notice.severity === 'important' ? 'border-[#d8ad44] bg-[#fff8e4]' : 'border-[#c9d8df] bg-[#f1f7f9]'}`}>
      <div className="flex items-start justify-between gap-3"><div className="flex min-w-0 gap-3">{notice.severity === 'urgent' ? <AlertTriangle className="mt-0.5 shrink-0 text-[#c43d27]" /> : <BellRing className="mt-0.5 shrink-0" size={20} />}<div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="break-words font-black">{notice.title}</h3><span className="rounded-full bg-black/10 px-2 py-1 text-[9px] font-black uppercase">{notice.severity}</span>{notice.requires_acknowledgement && <span className="text-[10px] font-black uppercase text-[#9b3c2c]">Acknowledgement required</span>}</div><p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#4f4b43]">{notice.message}</p><p className="mt-2 text-xs text-[#777064]">Published {new Date(notice.created_at).toLocaleString()}{notice.expires_at ? ` · Expires ${new Date(notice.expires_at).toLocaleString()}` : ''}</p></div></div>{canManage && <button type="button" onClick={() => void archiveNotice(notice)} className="shrink-0 rounded-md p-2 text-[#9b4939] hover:bg-white/70" aria-label={`Archive ${notice.title}`} title="Archive"><Trash2 size={16} /></button>}</div>
      {notice.requires_acknowledgement && !notice.acknowledged_at && <button type="button" onClick={() => void acknowledge(notice)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md bg-[#171713] px-4 py-2 text-sm font-bold text-white"><Check size={15} />I have read and understood this</button>}
      {notice.acknowledged_at && <p className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-[#607b1d]"><Check size={14} />Acknowledged {new Date(notice.acknowledged_at).toLocaleString()}</p>}
      {canManage && notice.receipts && <details className="mt-4 text-xs"><summary className="cursor-pointer font-bold text-[#686258]">Seen by {notice.receipts.length} {notice.receipts.length === 1 ? 'person' : 'people'}</summary><div className="mt-2 space-y-1">{notice.receipts.length ? notice.receipts.map((receipt, index) => <p key={`${receipt.name}-${index}`}>{receipt.name} · seen {new Date(receipt.seenAt).toLocaleString()}{receipt.acknowledgedAt ? ' · acknowledged' : ''}</p>) : <p>Not seen yet.</p>}</div></details>}
    </article>)}</div>}

    <div className="mt-5 rounded-lg border border-[#dfd7ca]"><button type="button" onClick={() => setUpdatesOpen((open) => !open)} className="flex w-full items-center justify-between gap-4 p-4 text-left" aria-expanded={updatesOpen}><span className="flex items-center gap-3"><History size={19} /><span><strong className="block">{previousVisit ? 'Changed since your last visit' : 'Recent changes'}</strong><span className="text-xs text-[#777064]">{updates.length} update{updates.length === 1 ? '' : 's'}{previousVisit ? ` since ${new Date(previousVisit).toLocaleString()}` : ''}</span></span></span><ChevronDown className={`shrink-0 transition-transform ${updatesOpen ? 'rotate-180' : ''}`} size={18} /></button>{updatesOpen && <div className="border-t border-[#dfd7ca] px-4 pb-4">{updates.length ? <div className="divide-y divide-[#e3dbcf]">{updates.map((update, index) => <div key={`${update.at}-${index}`} className="flex items-start gap-3 py-3"><Clock3 className="mt-0.5 shrink-0 text-[#e74428]" size={16} /><div><p className="text-sm font-semibold">{update.summary}</p><p className="mt-1 text-xs text-[#817a70]">{new Date(update.at).toLocaleString()}</p></div></div>)}</div> : <p className="pt-4 text-sm text-[#777064]">Nothing has changed since your previous visit.</p>}</div>}</div>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto bg-[#f7f0e5]"><DialogHeader><DialogTitle className="text-2xl font-black">Publish a notice</DialogTitle><DialogDescription>Share an operational alert with this show or its whole tour.</DialogDescription></DialogHeader><form onSubmit={createNotice} className="mt-3 grid gap-4 sm:grid-cols-2">
      <label className="sm:col-span-2"><span className="text-xs font-black uppercase">Title</span><input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={160} required className="mt-2 h-11 w-full rounded-md border border-[#d8d0c3] bg-white px-3" /></label>
      <label><span className="text-xs font-black uppercase">Priority</span><select value={severity} onChange={(event) => setSeverity(event.target.value as Notice['severity'])} className="mt-2 h-11 w-full rounded-md border border-[#d8d0c3] bg-white px-3"><option value="info">Information</option><option value="important">Important</option><option value="urgent">Urgent</option></select></label>
      <label><span className="text-xs font-black uppercase">Assign to</span><select value={scope} onChange={(event) => setScope(event.target.value as 'show' | 'tour')} className="mt-2 h-11 w-full rounded-md border border-[#d8d0c3] bg-white px-3"><option value="show">This show</option>{tourId && <option value="tour">Every show on this tour</option>}</select></label>
      <label><span className="text-xs font-black uppercase">Expires</span><input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#d8d0c3] bg-white px-3" /></label>
      <div className="space-y-2"><label className="flex min-h-11 items-center gap-2 text-sm font-bold"><input type="checkbox" checked={requiresAcknowledgement} onChange={(event) => setRequiresAcknowledgement(event.target.checked)} className="h-5 w-5 accent-[#e74428]" />Require acknowledgement</label><label className="flex min-h-11 items-center gap-2 text-sm font-bold"><input type="checkbox" checked={visibleToCollaborators} onChange={(event) => setVisibleToCollaborators(event.target.checked)} className="h-5 w-5 accent-[#e74428]" />Show external collaborators</label></div>
      <label className="sm:col-span-2"><span className="text-xs font-black uppercase">Message</span><textarea rows={5} maxLength={3000} required value={message} onChange={(event) => setMessage(event.target.value)} className="mt-2 w-full rounded-md border border-[#d8d0c3] bg-white p-3" /></label>
      <div className="flex justify-end gap-3 sm:col-span-2"><button type="button" onClick={() => setDialogOpen(false)} className="min-h-11 rounded-md border border-[#bdb5aa] px-5 py-2.5 font-bold">Cancel</button><button type="submit" disabled={saving || !title.trim() || !message.trim()} className="min-h-11 rounded-md bg-[#e74428] px-6 py-2.5 font-bold text-white disabled:opacity-40">{saving ? 'Publishing...' : 'Publish notice'}</button></div>
    </form></DialogContent></Dialog>
  </section>;
}
