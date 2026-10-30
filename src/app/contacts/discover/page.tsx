'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import PromoterDiscovery from '@/components/contacts/PromoterDiscovery';

export default function DiscoverPromotersPage() {
  return <main className="scene-page min-h-[calc(100dvh-5rem)] overflow-y-auto pb-28 md:h-[calc(100vh-5rem)] md:pb-8">
    <Link href="/contacts" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-[#6d685f] hover:text-[#171713]">
      <ArrowLeft size={16} /> Back to contacts
    </Link>
    <div className="mt-5 max-w-5xl rounded-xl border border-black/10 bg-[#fffaf2] p-5 shadow-sm sm:p-8">
      <PromoterDiscovery />
    </div>
  </main>;
}
