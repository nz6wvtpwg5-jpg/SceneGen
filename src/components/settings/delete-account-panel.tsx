'use client';

import { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { Trash2, X } from 'lucide-react';
import { clearOfflineDataForUser } from '@/lib/offline-road-pack';

export function DeleteAccountPanel() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function removeAccount() {
    if (confirmation !== 'DELETE' || !session?.user?.id) return;
    setBusy(true); setError('');
    try {
      const response = await fetch('/api/user/delete-account', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmation })
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error?.message || body.error || 'Account deletion failed');
      }
      await clearOfflineDataForUser(session.user.id);
      await signOut({ callbackUrl: '/' });
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Account deletion failed'); setBusy(false); }
  }

  return <section className="rounded-lg border border-red-300 bg-red-50 p-4">
    <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.15em] text-red-700">Danger zone</p><h3 className="mt-1 font-black">Delete SceneGen account</h3><p className="mt-2 max-w-2xl text-xs leading-5 text-red-900/70">This immediately disables your login, removes your memberships, invitations, connected calendar, saved device data and personal profile. Shared operational and audit records may be retained without your personal identifiers.</p></div>{open && <button type="button" aria-label="Cancel deletion" onClick={() => setOpen(false)}><X size={18}/></button>}</div>
    {!open ? <button type="button" onClick={() => setOpen(true)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full border border-red-400 px-5 text-sm font-black text-red-800"><Trash2 size={16}/>Delete account</button> : <div className="mt-4"><label className="text-xs font-bold text-red-900">Type DELETE to confirm permanent deletion<input autoComplete="off" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="mt-2 h-12 w-full rounded-md border border-red-300 bg-white px-4 text-base outline-none focus:ring-2 focus:ring-red-400" /></label>{error && <p role="alert" className="mt-2 text-xs font-bold text-red-700">{error}</p>}<button type="button" disabled={confirmation !== 'DELETE' || busy} onClick={() => void removeAccount()} className="mt-3 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-red-700 px-5 text-sm font-black text-white disabled:opacity-40 sm:w-auto"><Trash2 size={16}/>{busy ? 'Deleting…' : 'Permanently delete account'}</button></div>}
  </section>;
}
