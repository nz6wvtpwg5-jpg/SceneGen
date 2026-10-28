'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, CheckCircle2, Download, FileImage, FileText, FolderLock, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { getEntityId } from '@/lib/entity';
import { useConfirmDialog } from '@/components/ui/confirm-dialog-provider';

type Category = 'contract' | 'rider' | 'stage_plot' | 'hotel_confirmation' | 'travel_document' | 'other';
type Acknowledgement = { name: string; email?: string | null; acknowledgedAt: string };
type VaultDocument = { id: string; category: Category; title: string; notes?: string | null; file_name: string; mime_type: string; byte_size: number; scope: 'show' | 'tour'; visible_to_collaborators: boolean; permission_level: 'operations' | 'financial'; requires_acknowledgement: boolean; acknowledged_at?: string | null; acknowledgements?: Acknowledgement[]; created_at: string };
type FinancialAccess = 'hidden' | 'view' | 'edit';

const labels: Record<Category, string> = { contract: 'Contracts', rider: 'Riders', stage_plot: 'Stage plots', hotel_confirmation: 'Hotel confirmations', travel_document: 'Travel documents', other: 'Other files' };
const categories = Object.keys(labels) as Category[];
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
const DOCUMENT_TYPES = new Set(['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain', 'image/jpeg', 'image/png', 'image/webp']);
const displaySize = (bytes: number) => bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

export default function DocumentVault({ showId, endpoint, canEdit, financialAccess = 'edit' }: { showId: string; endpoint?: string; canEdit: boolean; financialAccess?: FinancialAccess }) {
  const base = endpoint || `/api/shows/${encodeURIComponent(showId)}/documents`;
  const external = base.includes('/api/collaborator/');
  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [tourId, setTourId] = useState<string | null>(null);
  const [canUpload, setCanUpload] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<Category>('rider');
  const [scope, setScope] = useState<'show' | 'tour'>('show');
  const [visible, setVisible] = useState(false);
  const [requiresAcknowledgement, setRequiresAcknowledgement] = useState(false);
  const [permission, setPermission] = useState<'operations' | 'financial'>('operations');
  const [file, setFile] = useState<File | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const entityId = getEntityId();
  const confirmDialog = useConfirmDialog();
  const headers = useCallback((): HeadersInit => entityId ? { 'X-Entity-Id': entityId } : {}, [entityId]);

  const load = useCallback(async () => {
    const response = await fetch(base, { cache: 'no-store', headers: headers() });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || 'Unable to load documents');
    setDocuments(body.documents || []);
    setTourId(body.tourId || null);
    setCanUpload(Boolean(body.canUpload));
    setCanDelete(Boolean(body.canDelete));
  }, [base, headers]);

  useEffect(() => { void load().catch((error) => toast.error(error.message)); }, [load]);

  function reset() {
    setTitle(''); setNotes(''); setCategory('rider'); setScope('show');
    setVisible(false); setRequiresAcknowledgement(false); setPermission('operations'); setFile(null);
    if (input.current) input.current.value = '';
  }

  function chooseCategory(nextCategory: Category) {
    setCategory(nextCategory);
    if (nextCategory === 'contract') setPermission('financial');
  }

  function chooseFile(nextFile: File | null) {
    if (nextFile && (!DOCUMENT_TYPES.has(nextFile.type) || nextFile.size < 1 || nextFile.size > MAX_DOCUMENT_BYTES)) {
      if (input.current) input.current.value = '';
      setFile(null);
      toast.error('Choose a supported file no larger than 10 MB');
      return;
    }
    setFile(nextFile);
  }

  async function upload() {
    if (!file || !title.trim()) return toast.error('Add a title and choose a file');
    const effectivePermission = category === 'contract' ? 'financial' : permission;
    if (external && effectivePermission === 'financial' && financialAccess !== 'edit') {
      return toast.error('Your invitation cannot upload financial documents');
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.set('file', file); form.set('title', title.trim()); form.set('notes', notes.trim());
      form.set('category', category); form.set('scope', external ? 'show' : scope);
      form.set('visibleToCollaborators', String(external ? true : visible));
      form.set('permissionLevel', effectivePermission);
      form.set('requiresAcknowledgement', String(!external && requiresAcknowledgement));
      const response = await fetch(base, { method: 'POST', headers: headers(), body: form });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'Document could not be uploaded');
      await load(); setOpen(false); reset(); toast.success('Document added to the vault');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Document could not be uploaded');
    } finally {
      setUploading(false);
    }
  }

  async function remove(document: VaultDocument) {
    const confirmed = await confirmDialog({
      title: `Remove “${document.title}”?`,
      description: 'The file will be permanently removed from the document vault.',
      confirmLabel: 'Remove document',
      tone: 'destructive',
    });
    if (!confirmed) return;
    const response = await fetch(`${base}/${encodeURIComponent(document.id)}`, { method: 'DELETE', headers: headers() });
    if (!response.ok) return toast.error('Document could not be removed');
    await load(); toast.success('Document removed');
  }

  async function acknowledge(document: VaultDocument) {
    const response = await fetch(`${base}/${encodeURIComponent(document.id)}/acknowledge`, { method: 'POST', headers: headers() });
    let body: { error?: { message?: string } } = {};
    try { body = await response.json(); } catch {}
    if (!response.ok) return toast.error(body.error?.message || 'Document could not be acknowledged');
    await load();
    toast.success('Document acknowledged');
  }

  const grouped = categories.map((value) => ({ category: value, items: documents.filter((document) => document.category === value) })).filter((group) => group.items.length);
  const uploadAllowed = canEdit && canUpload;
  const financialUploadAllowed = !external || financialAccess === 'edit';

  return <section className="rounded-[22px] border border-[#d8d0c3] bg-[#fffaf2] p-4 shadow-[0_18px_50px_rgba(45,37,24,.07)] sm:rounded-lg sm:p-6 md:p-7">
    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#e74428]">Tour files</p><h2 className="mt-1 flex items-center gap-3 text-2xl font-black"><FolderLock />Document vault</h2><p className="mt-2 text-sm text-[#686258]">Contracts, riders, production files and confirmed travel documents for this date.</p></div>{uploadAllowed && <button type="button" onClick={() => setOpen(true)} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-md bg-[#171713] px-4 py-2.5 text-sm font-bold text-white sm:min-h-11"><Plus size={16} />Add document</button>}</div>
    {grouped.length ? <div className="mt-7 space-y-6">{grouped.map((group) => <div key={group.category}><h3 className="mb-3 text-xs font-black uppercase tracking-[.16em] text-[#686258]">{labels[group.category]}</h3><div className="grid gap-3">{group.items.map((document) => { const Icon = document.mime_type.startsWith('image/') ? FileImage : FileText; return <article key={document.id} className="rounded-lg border border-[#dfd7ca] bg-white/60 p-4"><div className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#f1e9de] text-[#e74428]"><Icon size={19} /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="break-words font-black">{document.title}</p><span className="rounded-full bg-[#e7dfd3] px-2 py-1 text-[9px] font-black uppercase">{document.scope} file</span>{document.permission_level === 'financial' && <span className="rounded-full bg-[#171713] px-2 py-1 text-[9px] font-black uppercase text-white">Financial access</span>}{document.visible_to_collaborators && <span title="Available to permitted external collaborators"><ShieldCheck size={15} className="text-[#729400]" /></span>}{document.requires_acknowledgement && <span className="rounded-full border border-[#d9c8aa] px-2 py-1 text-[9px] font-black uppercase">Acknowledgement required</span>}</div><p className="mt-1 truncate text-xs text-[#777064]">{document.file_name} · {displaySize(document.byte_size)}</p>{document.notes && <p className="mt-2 break-words text-sm leading-6 text-[#5e594f]">{document.notes}</p>}</div><div className="flex shrink-0"><a href={`${base}/${encodeURIComponent(document.id)}/content`} className="rounded-md p-2.5 hover:bg-[#eee6db]" aria-label={`Download ${document.title}`} title="Download"><Download size={17} /></a>{canDelete && <button type="button" onClick={() => void remove(document)} className="rounded-md p-2.5 text-[#9b4939] hover:bg-[#fff1ec]" aria-label={`Remove ${document.title}`} title="Remove"><Trash2 size={17} /></button>}</div></div>{document.requires_acknowledgement && <div className="mt-4 border-t border-[#e7dfd3] pt-4">{document.acknowledged_at ? <p className="inline-flex items-center gap-2 text-xs font-bold text-[#607b1d]"><CheckCircle2 size={15} />Acknowledged {new Date(document.acknowledged_at).toLocaleString()}</p> : <button type="button" onClick={() => void acknowledge(document)} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[#171713] px-4 py-2 text-sm font-bold text-white"><Check size={15} />I have read and understood this</button>}{document.acknowledgements && <details className="mt-3 text-xs"><summary className="cursor-pointer font-bold text-[#686258]">Acknowledged by {document.acknowledgements.length} {document.acknowledgements.length === 1 ? 'person' : 'people'}</summary><div className="mt-2 space-y-1">{document.acknowledgements.length ? document.acknowledgements.map((receipt, index) => <p key={`${receipt.email || receipt.name}-${index}`}>{receipt.name} - {new Date(receipt.acknowledgedAt).toLocaleString()}</p>) : <p>Nobody has acknowledged this document yet.</p>}</div></details>}</div>}</article>; })}</div></div>)}</div>
      : <div className="mt-7 rounded-lg border border-dashed border-[#bbb2a5] p-8 text-center"><FolderLock className="mx-auto text-[#8c857a]" /><p className="mt-3 font-black">No documents available for this date</p><p className="mt-1 text-sm text-[#686258]">Show-specific and tour-wide files will appear here.</p></div>}

    {open && <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/65 p-0 backdrop-blur-sm sm:p-4" role="dialog" aria-modal="true" aria-labelledby="vault-upload-title"><div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col bg-[#f7f0e5] shadow-2xl sm:my-10 sm:min-h-0 sm:rounded-lg"><div className="mobile-safe-top sticky top-0 z-10 flex justify-between border-b border-[#d8d0c3] bg-[#f7f0e5]/95 p-4 backdrop-blur-xl sm:static sm:rounded-t-lg sm:p-7"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#e74428]">Document vault</p><h3 id="vault-upload-title" className="mt-1 text-2xl font-black sm:mt-2 sm:text-3xl">Add a document</h3></div><button type="button" onClick={() => setOpen(false)} className="grid h-12 w-12 place-items-center rounded-full hover:bg-black/10" aria-label="Close"><X /></button></div><div className="grid flex-1 gap-4 p-4 [&_input]:text-base [&_select]:text-base [&_textarea]:text-base sm:grid-cols-2 sm:p-7 sm:[&_input]:text-sm sm:[&_select]:text-sm sm:[&_textarea]:text-sm">
      <label className="sm:col-span-2"><span className="text-xs font-black uppercase">File</span><input ref={input} type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp" onChange={(event) => chooseFile(event.target.files?.[0] || null)} className="mt-2 block w-full rounded-md border border-[#d8d0c3] bg-white p-3 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#171713] file:px-4 file:py-2 file:font-bold file:text-white" /><p className="mt-1 text-xs text-[#777064]">PDF, Office document, text or image · maximum 10 MB</p></label>
      <label className="sm:col-span-2"><span className="text-xs font-black uppercase">Document title</span><input value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} className="mt-2 h-11 w-full rounded-md border border-[#d8d0c3] bg-white px-3" /></label>
      <label><span className="text-xs font-black uppercase">Category</span><select value={category} onChange={(event) => chooseCategory(event.target.value as Category)} className="mt-2 h-11 w-full rounded-md border border-[#d8d0c3] bg-white px-3">{categories.filter((value) => financialUploadAllowed || value !== 'contract').map((value) => <option key={value} value={value}>{labels[value]}</option>)}</select></label>
      {!external && <label><span className="text-xs font-black uppercase">Assign to</span><select value={scope} onChange={(event) => setScope(event.target.value as 'show' | 'tour')} className="mt-2 h-11 w-full rounded-md border border-[#d8d0c3] bg-white px-3"><option value="show">This show only</option>{tourId && <option value="tour">Every show on this tour</option>}</select></label>}
      {financialUploadAllowed && category !== 'contract' && <label><span className="text-xs font-black uppercase">Permission type</span><select value={permission} onChange={(event) => setPermission(event.target.value as 'operations' | 'financial')} className="mt-2 h-11 w-full rounded-md border border-[#d8d0c3] bg-white px-3"><option value="operations">Operational document</option><option value="financial">Requires financial access</option></select></label>}
      {!external && <label className="flex min-h-11 items-center gap-3 rounded-md border border-[#d8d0c3] bg-white px-4"><input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} className="h-5 w-5 accent-[#e74428]" /><span className="text-sm font-bold">Share with permitted collaborators</span></label>}
      {!external && <label className="flex min-h-11 items-center gap-3 rounded-md border border-[#d8d0c3] bg-white px-4"><input type="checkbox" checked={requiresAcknowledgement} onChange={(event) => setRequiresAcknowledgement(event.target.checked)} className="h-5 w-5 accent-[#e74428]" /><span className="text-sm font-bold">Require acknowledgement</span></label>}
      <label className="sm:col-span-2"><span className="text-xs font-black uppercase">Notes</span><textarea rows={3} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-2 w-full rounded-md border border-[#d8d0c3] bg-white p-3" /></label>
    </div><div className="mobile-safe-bottom sticky bottom-0 grid grid-cols-2 gap-3 border-t border-[#d8d0c3] bg-[#f7f0e5]/95 p-4 backdrop-blur-xl sm:static sm:flex sm:justify-end sm:rounded-b-lg sm:p-7"><button type="button" onClick={() => setOpen(false)} className="min-h-12 rounded-md border border-[#bdb5aa] px-5 py-3 font-bold sm:min-h-11">Cancel</button><button type="button" disabled={uploading || !file || !title.trim()} onClick={() => void upload()} className="min-h-12 rounded-md bg-[#e74428] px-6 py-3 font-bold text-white disabled:opacity-40 sm:min-h-11">{uploading ? 'Uploading...' : 'Add to vault'}</button></div></div></div>}
  </section>;
}
