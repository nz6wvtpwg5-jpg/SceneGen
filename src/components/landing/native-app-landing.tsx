'use client';

import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { ArrowRight, CalendarDays, FileCheck2, Map, ShieldCheck } from 'lucide-react';
import { SceneGenWordmark } from '@/components/brand/scene-gen-mark';

const capabilities = [
  { label: 'Shows and day sheets', icon: CalendarDays },
  { label: 'Tours and routing', icon: Map },
  { label: 'Documents and access', icon: FileCheck2 },
];

export function NativeAppLanding() {
  const { status } = useSession();
  const authenticated = status === 'authenticated';

  return <main className="native-app-landing mobile-safe-top mobile-safe-bottom min-h-[100dvh] bg-[#11140f] px-5 text-[#f7f2e8]">
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-md flex-col pb-5 pt-5">
      <header className="flex items-center justify-between">
        <SceneGenWordmark />
        <span className="rounded-full border border-white/15 px-3 py-2 text-[9px] font-black uppercase tracking-[0.18em] text-white/50">iPhone app</span>
      </header>
      <section className="flex flex-1 flex-col justify-center py-10">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ff7756]">Your live operations desk</p>
        <h1 className="mt-5 text-[3.35rem] font-black leading-[0.88] tracking-[-0.065em]">The whole show.<br /><span className="text-[#ff6845]">Ready for the road.</span></h1>
        <p className="mt-6 max-w-sm text-base leading-7 text-white/60">Shows, routes, people, day sheets and money kept together wherever the work takes you.</p>
        <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
          {capabilities.map(({ label, icon: Icon }) => <div key={label} className="flex min-h-14 items-center gap-3 text-sm font-bold text-white/80"><Icon className="h-4 w-4 text-[#ff7756]" /><span>{label}</span></div>)}
        </div>
      </section>
      <section className="space-y-3" aria-label="SceneGen account access">
        {authenticated ? <Link href="/dashboard" className="flex min-h-14 w-full items-center justify-center rounded-full bg-[#ff5a36] px-6 text-base font-black text-white">Open your workspace <ArrowRight className="ml-2 h-5 w-5" /></Link> : <>
          <Link href="/login" className="flex min-h-14 w-full items-center justify-center rounded-full bg-[#ff5a36] px-6 text-base font-black text-white">Sign in <ArrowRight className="ml-2 h-5 w-5" /></Link>
          <Link href="/login?mode=register" className="flex min-h-14 w-full items-center justify-center rounded-full border border-white/20 px-6 text-base font-black text-white">Create an account</Link>
        </>}
      </section>
      <footer className="mt-4 flex items-center justify-center gap-5 text-[11px] font-semibold text-white/35"><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></footer>
    </div>
  </main>;
}
