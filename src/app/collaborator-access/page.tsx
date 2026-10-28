'use client';

import { type FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, KeyRound, Mail, ShieldCheck } from 'lucide-react';
import { SessionProvider, signIn } from 'next-auth/react';
import { SceneGenWordmark } from '@/components/brand/scene-gen-mark';

async function collaboratorSessionExists() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const response = await fetch('/api/collaborator-auth/session', { cache: 'no-store' });
    if (response.ok && (await response.json())?.user?.id) return true;
    await new Promise((resolve) => window.setTimeout(resolve, 150));
  }
  return false;
}

function CollaboratorAccessContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<'password' | 'email' | ''>('');

  useEffect(() => {
    const requestedEmail = new URLSearchParams(window.location.search).get('email');
    if (requestedEmail) setEmail(requestedEmail);
    void collaboratorSessionExists().then((signedIn) => {
      if (signedIn) window.location.replace('/external-day-sheets');
    });
  }, []);

  async function passwordSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy('password'); setMessage('');
    try {
      const result = await signIn('collaborator-credentials', { email, password, redirect: false });
      if (result?.error) {
        setMessage('That email or password was not recognized, or this access is no longer active.');
      } else if (await collaboratorSessionExists()) {
        window.location.replace('/external-day-sheets');
        return;
      } else {
        setMessage('Your details were accepted, but this browser did not keep the session. Please try again.');
      }
    } catch {
      setMessage('Unable to sign in right now. Please try again.');
    } finally { setBusy(''); }
  }

  async function requestLink() {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) { setMessage('Enter your authorized email address first.'); return; }
    setBusy('email'); setMessage('');
    try {
      const response = await fetch('/api/collaborator-access/request-link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await response.json();
      setMessage(data.message || 'Check your inbox for your one-use sign-in link.');
    } catch { setMessage('Unable to request a link right now. Please try again.'); }
    finally { setBusy(''); }
  }

  const resetHref = `/forgot-password?email=${encodeURIComponent(email)}&audience=collaborator`;
  return <main className="min-h-[100dvh] bg-[#f2ede3] text-[#151713]">
    <nav className="mobile-safe-top border-b border-white/10 bg-[#11140f] text-white"><div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between px-4 sm:min-h-20 sm:px-8"><SceneGenWordmark /><Link href="/" className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-white/65 hover:text-white sm:text-sm"><ArrowLeft size={16} />Back</Link></div></nav>
    <section className="mx-auto grid min-h-[calc(100dvh-4rem)] max-w-6xl items-center gap-8 px-4 py-8 sm:px-5 sm:py-12 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
      <div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#e74428]">External collaborator</p><h1 className="mt-4 text-4xl font-black leading-[0.94] sm:mt-5 sm:text-6xl">Your day sheets.<br />Your secure view.</h1><p className="mt-5 max-w-lg text-base leading-7 text-[#62665e] sm:mt-6 sm:leading-8">For agents, promoters and crew who have accepted SceneGen access. Sign in with the exact email address your invitation was sent to.</p><div className="mt-6 flex items-start gap-3 border-l-2 border-[#e74428] pl-4 text-sm leading-6 text-[#62665e] sm:mt-8"><ShieldCheck className="mt-0.5 shrink-0 text-[#e74428]" size={19} /><p>Your permissions remain controlled by the workspace. You will only see the day sheets and information assigned to you.</p></div></div>
      <div className="rounded-2xl border border-black/10 bg-[#fffaf2] p-5 shadow-[0_24px_70px_rgba(30,25,18,0.12)] sm:rounded-none sm:p-10"><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#e74428]">Returning collaborator</p><h2 className="mt-3 text-3xl font-black">Sign in to my day sheets</h2><p className="mt-2 text-sm leading-6 text-[#686258]">Use the email and password attached to your accepted invitation.</p>
        <form onSubmit={passwordSignIn} className="mt-7 space-y-4"><div><label htmlFor="collaborator-email" className="text-[10px] font-black uppercase tracking-[0.18em]">Email address</label><input id="collaborator-email" type="email" required autoComplete="email" inputMode="email" value={email} onChange={(event) => { setEmail(event.target.value); setMessage(''); }} placeholder="you@example.com" className="mt-2 min-h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-4 text-base outline-none focus:border-[#e74428] focus:ring-2 focus:ring-[#e74428]/20" /></div><div><label htmlFor="collaborator-password" className="text-[10px] font-black uppercase tracking-[0.18em]">Password</label><input id="collaborator-password" type="password" required autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setMessage(''); }} className="mt-2 min-h-12 w-full rounded-md border border-[#d8d0c3] bg-white px-4 text-base outline-none focus:border-[#e74428] focus:ring-2 focus:ring-[#e74428]/20" /></div>{message && <p role="status" className="border-l-2 border-[#739400] bg-[#f1f6df] p-4 text-sm font-semibold text-[#384315]">{message}</p>}<button disabled={Boolean(busy)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#e74428] px-6 font-black text-white hover:bg-[#c93a22] disabled:opacity-60"><KeyRound size={18} />{busy === 'password' ? 'Signing in...' : 'Sign in'}</button></form>
        <div className="mt-5 flex flex-col items-center gap-3 text-sm"><Link href={resetHref} className="font-bold underline underline-offset-4">Set or reset password</Link><span className="text-xs text-[#777064]">or</span><button type="button" onClick={requestLink} disabled={Boolean(busy)} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/20 px-5 font-bold hover:border-black/50 disabled:opacity-60"><Mail size={17} />{busy === 'email' ? 'Sending link...' : 'Email me a one-use link'}</button></div>
        <p className="mt-6 border-t border-black/10 pt-5 text-xs leading-5 text-[#777064]">First time here? Open the private invitation from the SceneGen workspace and accept access first.</p>
      </div>
    </section>
  </main>;
}

export default function CollaboratorAccessPage() {
  return <SessionProvider basePath="/api/collaborator-auth"><CollaboratorAccessContent /></SessionProvider>;
}
