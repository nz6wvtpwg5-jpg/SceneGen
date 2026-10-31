'use client';
import {Suspense} from 'react';
import {MessagesCenter} from '@/components/contacts/MessagesCenter';
export default function MessagesPage(){
  return <main className="scene-page min-h-full overflow-y-auto pb-28 sm:pb-10"><div className="mx-auto max-w-6xl">
    <header className="border-b border-black/10 pb-6"><p className="scene-kicker">Your network</p><h1 className="scene-title">Messages</h1><p className="scene-copy">Booking enquiries and private conversations, all in one place.</p></header>
    <div className="mt-6"><Suspense fallback={<p className="p-6 text-sm">Loading messages…</p>}><MessagesCenter/></Suspense></div>
  </div></main>;
}
