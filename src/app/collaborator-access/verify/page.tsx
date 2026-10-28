'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { SessionProvider, signIn } from 'next-auth/react';
import { ShieldCheck } from 'lucide-react';

async function waitForCollaboratorSession() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch('/api/collaborator-auth/session', { cache: 'no-store' });
    if (response.ok && (await response.json())?.user?.id) return true;
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }
  return false;
}

function VerifyContent() {
  const token = useSearchParams().get('token') || '';
  const started = useRef(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (!/^[A-Za-z0-9_-]{32,128}$/.test(token)) { setError('This sign-in link is invalid.'); return; }
    void signIn('collaborator-link', { token, redirect: false }).then(async (result) => {
      if (result?.error) setError('This link has expired or has already been used.');
      else if (await waitForCollaboratorSession()) window.location.replace('/external-day-sheets');
      else setError('Your access was verified, but this browser did not save the session. Return to sign in and try again.');
    }).catch(() => setError('This link has expired or has already been used.'));
  }, [token]);
  return <main className="grid min-h-screen place-items-center bg-[#f2ede3] p-5"><div className="w-full max-w-lg border border-black/10 bg-[#fffaf2] p-9 text-center shadow-xl"><ShieldCheck className="mx-auto text-[#e74428]" size={38} /><p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#e74428]">External collaborator</p><h1 className="mt-3 text-3xl font-black">{error ? 'Sign-in link unavailable' : 'Opening your day sheets...'}</h1><p className="mt-3 text-sm leading-6 text-[#686258]">{error || 'Verifying your one-use secure link.'}</p>{error && <Link href="/collaborator-access" className="mt-6 inline-flex min-h-11 items-center rounded-full bg-[#171713] px-6 font-bold text-white">Request a new link</Link>}</div></main>;
}

export default function VerifyCollaboratorPage() {
  return <SessionProvider basePath="/api/collaborator-auth"><Suspense fallback={<main className="scene-page text-center">Verifying secure link...</main>}><VerifyContent /></Suspense></SessionProvider>;
}
