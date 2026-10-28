import Link from 'next/link';
import { CloudOff, RefreshCw } from 'lucide-react';

export default function UnavailablePage() {
  return <main className="mobile-safe-top mobile-safe-bottom grid min-h-[100dvh] place-items-center bg-[#11140f] p-5 text-white"><section className="max-w-md text-center"><CloudOff className="mx-auto text-[#ff6845]" size={42}/><h1 className="mt-5 text-3xl font-black">SceneGen is temporarily unavailable.</h1><p className="mt-3 text-sm leading-6 text-white/60">Check your connection and try again. Previously saved road packs are still available on this device.</p><div className="mt-6 grid gap-3"><Link href="/dashboard" className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#ff5a36] px-5 font-black"><RefreshCw size={16}/>Try again</Link><Link href="/offline" className="flex min-h-12 items-center justify-center rounded-full border border-white/20 px-5 font-black">Open saved road packs</Link></div></section></main>;
}
