'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowRight, BriefcaseBusiness, CheckCircle2, ShieldCheck } from 'lucide-react';
import { SceneGenWordmark } from '@/components/brand/scene-gen-mark';

type Invitation = {
  bandName: string; bio?: string; city?: string; state?: string; country?: string;
  agentName: string; agencyName?: string; status: string; expiresAt: string; entityId?: string;
};

export default function AgentBandInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const { status } = useSession();
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [error, setError] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token || status === 'loading') return;
    if (status !== 'authenticated') {
      router.replace(`/login?callbackUrl=${encodeURIComponent(`/agent-band-invite/${token}`)}`);
      return;
    }
    fetch(`/api/agent/band-invitations/${encodeURIComponent(token)}`, { cache: 'no-store' })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || 'Unable to open this invitation'); return data; })
      .then((data) => setInvitation(data.invitation)).catch((caught) => setError(caught instanceof Error ? caught.message : 'Unable to open this invitation'));
  }, [router, status, token]);

  async function accept() {
    if (!invitation) return; setAccepting(true); setError('');
    try {
      const response = await fetch(`/api/agent/band-invitations/${encodeURIComponent(token)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error?.message || 'Unable to accept this invitation');
      sessionStorage.setItem('onboardingCompleted', Date.now().toString()); setAccepted(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Unable to accept this invitation'); }
    finally { setAccepting(false); }
  }

  const location = invitation ? [invitation.city, invitation.state, invitation.country].filter(Boolean).join(', ') : '';
  return <main className="min-h-[100dvh] bg-[#f3ede3] text-[#171713]">
    <header className="mobile-safe-top border-b border-white/10 bg-[#11130f] text-white"><div className="mx-auto flex min-h-[72px] max-w-6xl items-center px-5 md:px-8"><SceneGenWordmark/></div></header>
    <div className="mx-auto max-w-3xl px-5 py-10 md:px-8 md:py-16">
      {accepted ? <section className="rounded-2xl border border-[#d8d0c3] bg-[#fffaf2] p-8 text-center sm:p-12"><CheckCircle2 className="mx-auto text-[#739400]" size={44}/><h1 className="mt-5 text-4xl font-black tracking-[-.04em]">Band workspace connected</h1><p className="mx-auto mt-3 max-w-lg leading-7 text-[#686258]">You now own the artist workspace. {invitation?.agentName} has been added with booking access, which you can review and change from the workspace.</p><button onClick={() => router.push('/dashboard')} className="mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#ff5a36] px-6 font-black text-white">Open the workspace <ArrowRight size={18}/></button></section>
      : error && !invitation ? <section className="rounded-2xl border border-[#ef9b88] bg-[#fff0eb] p-8"><h1 className="text-2xl font-black">Invitation unavailable</h1><p className="mt-3 text-[#9d311e]">{error}</p></section>
      : !invitation ? <p className="font-bold">Opening invitation…</p>
      : <section className="overflow-hidden rounded-2xl border border-[#d8d0c3] bg-[#fffaf2] shadow-[0_20px_65px_rgba(20,20,16,.10)]"><div className="bg-[#171713] p-7 text-white sm:p-10"><p className="text-[10px] font-black uppercase tracking-[.22em] text-[#ff7255]">Band workspace invitation</p><h1 className="mt-3 text-4xl font-black tracking-[-.045em] sm:text-5xl">{invitation.bandName}</h1>{location && <p className="mt-3 text-white/60">{location}</p>}</div><div className="p-7 sm:p-10"><div className="flex items-start gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f1eadf] text-[#ff5a36]"><BriefcaseBusiness size={20}/></div><div><p className="font-black">Created by {invitation.agentName}</p>{invitation.agencyName && <p className="mt-1 text-sm text-[#686258]">{invitation.agencyName}</p>}</div></div>{invitation.bio && <p className="mt-7 leading-7 text-[#565149]">{invitation.bio}</p>}<div className="mt-8 border-l-2 border-[#739400] bg-[#f2f5e7] p-5"><div className="flex gap-3"><ShieldCheck className="shrink-0 text-[#617d00]" size={20}/><div><p className="font-black">You remain in control</p><p className="mt-1 text-sm leading-6 text-[#58632e]">Accepting transfers this working band workspace to you, including any shows and tours already planned. The agent keeps booking access, permission to propose shows and view financial details. You can review or remove that access later.</p></div></div></div>{error && <p className="mt-5 text-sm font-bold text-[#9d311e]">{error}</p>}<button onClick={() => void accept()} disabled={accepting || invitation.status !== 'pending'} className="mt-7 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ff5a36] px-6 font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{accepting ? 'Transferring…' : `Accept ownership of ${invitation.bandName}`} <ArrowRight size={18}/></button>{invitation.status !== 'pending' && <p className="mt-3 text-center text-sm text-[#686258]">This invitation is {invitation.status}.</p>}</div></section>}
    </div>
  </main>;
}
