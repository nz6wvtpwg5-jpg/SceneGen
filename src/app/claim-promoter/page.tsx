'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useProfileStore } from '@/store/useProfileStore';

export default function ClaimPromoterPage() {
  const search = useSearchParams();
  const token = search.get('token') || '';
  const [eligible, setEligible] = useState<boolean | null>(null);
  const [name, setName] = useState('');
  const [genres, setGenres] = useState('');
  const [status, setStatus] = useState('');
  const [claimed, setClaimed] = useState(false);
  const [busy, setBusy] = useState(false);
  const setActiveProfile = useProfileStore(store => store.setActiveProfile);
  useEffect(() => {
    if (!token) { setEligible(false); return; }
    let cancelled = false;
    fetch('/api/promoter-claims/status?token=' + encodeURIComponent(token), { cache: 'no-store' })
      .then(async result => {
        const data = await result.json().catch(() => ({}));
        if (!cancelled) setEligible(result.ok && data.eligible === true);
      })
      .catch(() => { if (!cancelled) setEligible(false); });
    return () => { cancelled = true; };
  }, [token]);
  const claim = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setStatus('');
    try {
      const response = await fetch('/api/promoter-claims/claim', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({ token, name, genres:genres.split(/[,\s]+/).map(tag => tag.startsWith('#') ? tag : '#' + tag).filter(tag=>tag.length>2) })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error?.message || 'Claim could not be completed');
      setActiveProfile({ id:result.promoterId, name, entityType:'promoter', administratorId:'', membershipRole:'owner' });
      setClaimed(true);
    } catch(error) { setStatus(error instanceof Error ? error.message : 'Unable to claim profile'); }
    finally { setBusy(false); }
  };
  return <main className="scene-page mx-auto max-w-xl space-y-6 py-12">
    <p className="scene-kicker">SceneGen promoter network</p>
    <h1 className="scene-title">Claim your promoter profile</h1>
    {eligible === null && <p>Verifying your invitation…</p>}
    {eligible === false && <div className="space-y-3"><p>This invitation has expired, has already been claimed, or requires you to sign in using the invited email address.</p><Link href={'/login?callbackUrl='+encodeURIComponent('/claim-promoter?token='+token)} className="font-bold underline">Sign in with your invited email</Link></div>}
    {eligible === true && !claimed && <form onSubmit={claim} className="space-y-4 rounded-lg border border-black/10 bg-white p-6">
      <p>Choose the public identity other bands can see. Private records belonging to other bands remain private.</p>
      <label className="block text-sm font-bold">Public promoter name<input required minLength={2} maxLength={160} value={name} onChange={e=>setName(e.target.value)} className="mt-2 h-12 w-full rounded-md border border-black/20 px-3"/></label>
      <label className="block text-sm font-bold">Genres you promote<input value={genres} onChange={e=>setGenres(e.target.value)} placeholder="doommetal, sludgemetal, stonermetal" className="mt-2 h-12 w-full rounded-md border border-black/20 px-3"/><span className="mt-1 block text-xs font-normal">Separate genres with commas.</span></label>
      {status && <p role="alert" className="text-red-700">{status}</p>}
      <button type="submit" disabled={busy} className="min-h-12 rounded-full bg-[#ff5a36] px-6 font-bold text-white disabled:opacity-50">{busy?'Claiming…':'Claim my profile'}</button>
    </form>}
    {claimed && <div className="space-y-4"><p>Your promoter profile is claimed. You can now use your own workspace to search for bands and manage shows.</p><Link href="/promoter-network" className="inline-flex rounded-full bg-[#171713] px-6 py-3 font-bold text-white">Open promoter network</Link></div>}
  </main>;
}
