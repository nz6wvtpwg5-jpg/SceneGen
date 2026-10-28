'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { CircleAlert, RefreshCw } from 'lucide-react';
import { reportClientError } from '@/lib/report-client-error';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { void reportClientError(error); }, [error]);
  return <main className="mobile-safe-top mobile-safe-bottom grid min-h-[70dvh] place-items-center bg-[#f2eee5] p-5"><section className="w-full max-w-lg rounded-3xl border border-[#d6cec1] bg-[#fffaf1] p-8 text-center shadow-sm"><CircleAlert className="mx-auto text-[#e54525]" size={36}/><p className="mt-5 text-xs font-black uppercase tracking-[.18em] text-[#e54525]">SceneGen hit a problem</p><h1 className="mt-2 text-3xl font-black">Your work is still safe.</h1><p className="mt-3 text-sm leading-6 text-[#6e675d]">The error has been recorded without including form contents. Try this screen again, or return to the dashboard.</p><div className="mt-6 grid gap-3 sm:grid-cols-2"><button type="button" onClick={reset} className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#ff5a36] px-5 text-sm font-black text-white"><RefreshCw size={16}/>Try again</button><Link href="/dashboard" className="flex min-h-12 items-center justify-center rounded-full border border-black/15 px-5 text-sm font-black">Dashboard</Link></div>{error.digest && <p className="mt-5 text-[10px] text-[#91897e]">Reference: {error.digest}</p>}</section></main>;
}
