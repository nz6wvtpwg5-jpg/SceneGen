import Link from 'next/link';
import { ArrowRight, CalendarDays, Check, Clock3, FileCheck2, MapPin, Route, ShieldCheck, WalletCards } from 'lucide-react';
import { SceneGenMark } from '@/components/brand/scene-gen-mark';
import { LandingProof } from '@/components/landing/landing-proof';
import { LandingDecision } from '@/components/landing/landing-decision';
import { LandingMobileMenu } from '@/components/landing/landing-mobile-menu';
import { NativeAppLanding } from '@/components/landing/native-app-landing';

const workflows = [
  { number: '01', title: 'Build the live plan', copy: 'Create shows, group tours and turn an outline into a route the whole team can trust.', icon: Route },
  { number: '02', title: 'Advance every date', copy: 'Keep timings, contacts, travel, documents and operational updates attached to the right show.', icon: FileCheck2 },
  { number: '03', title: 'Share only what matters', copy: 'Give agents, promoters and crew precise day-sheet access without exposing the rest of the workspace.', icon: ShieldCheck },
  { number: '04', title: 'Close the numbers', copy: 'Track guarantees, costs, settlement and commission in the currencies the work actually uses.', icon: WalletCards },
];

const audiences = [
  ['Artists & managers', 'One operational record from first hold to final settlement.'],
  ['Booking agents', 'A clean view of dates, availability, fees and the day sheets you represent.'],
  ['Promoters & crew', 'The current information for the dates you work, without chasing another PDF.'],
];

function Wordmark() {
  return <span className="flex items-center gap-3"><SceneGenMark className="h-10 w-10" /><span className="leading-none"><span className="block text-[15px] font-black uppercase tracking-[0.12em]">SceneGen</span><span className="mt-1.5 block text-[8px] font-bold uppercase tracking-[0.3em] text-black/45">Live operations</span></span></span>;
}

function ProductPreview() {
  const stops = [
    ['12', 'Brussels', 'Ancienne Belgique'],
    ['13', 'Tilburg', '013 Poppodium'],
    ['15', 'Cologne', 'Die Kantine'],
    ['16', 'Hamburg', 'Markthalle'],
  ];
  return <div className="mx-auto w-full max-w-6xl overflow-hidden rounded-lg border border-white/10 bg-[#11140f] text-white shadow-[0_24px_70px_rgba(17,20,15,0.25)]" aria-label="SceneGen tour operations preview">
    <div className="flex min-h-12 items-center justify-between border-b border-white/10 px-4 sm:px-5"><div className="flex items-center gap-2" aria-hidden="true"><span className="h-2.5 w-2.5 rounded-full bg-[#ff5a36]" /><span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="h-2.5 w-2.5 rounded-full bg-white/20" /></div><p className="truncate pl-4 text-[9px] font-black uppercase tracking-[0.2em] text-white/45">European support tour 2027</p></div>
    <div className="grid lg:grid-cols-[1.25fr_0.75fr]">
      <section className="p-4 sm:p-6 lg:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ff8068]">Tour routing</p><h2 className="mt-2 text-2xl font-black text-white">Ready for the road.</h2></div><span className="rounded-full border border-[#c8f135]/30 bg-[#c8f135]/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-[#c8f135]">18 shows</span></div>
        <div className="mt-4 grid grid-cols-2 gap-2">{stops.map(([day, city, venue], index) => <div key={venue} className={`${index > 1 ? 'hidden sm:flex' : 'flex'} min-w-0 items-center gap-3 border border-white/10 bg-white/[0.045] p-3`}><span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-black ${index === 0 ? 'bg-[#ff5a36]' : 'border border-white/15 text-white/70'}`}>{day}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{venue}</strong><span className="block text-[11px] text-white/45">{city}</span></span><Check className="hidden h-4 w-4 shrink-0 text-[#c8f135] sm:block" /></div>)}</div>
      </section>
      <section className="hidden border-t border-white/10 bg-[#181b16] p-4 sm:block sm:p-6 lg:border-l lg:border-t-0 lg:p-7"><div className="flex items-center justify-between"><p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#ff8068]">Next show</p><span className="rounded-full bg-[#dff29a] px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.1em] text-[#151713]">Confirmed</span></div><h3 className="mt-4 text-xl font-black">Ancienne Belgique</h3><div className="mt-4 grid gap-2 border-t border-white/10 pt-4 text-xs text-white/70"><p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#ff8068]" />Friday, 12 February</p><p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#ff8068]" />Brussels, Belgium</p><p className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#ff8068]" />On stage 20:00</p></div><div className="mt-5 border border-white/10 p-4"><div className="flex items-end justify-between"><div><p className="text-[8px] font-black uppercase tracking-[0.16em] text-white/45">Day-sheet readiness</p><strong className="mt-1 block text-2xl">92%</strong></div><span className="text-[10px] font-bold text-[#c8f135]">Road ready</span></div><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10"><div className="h-full w-[92%] rounded-full bg-[#c8f135]" /></div></div></section>
    </div>
  </div>;
}

export default function LandingPage() {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SceneGen',
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    description: 'A live-operations workspace for planning tours, advancing shows, sharing day sheets and managing show finances.',
    featureList: ['Tour planning and routing', 'Show advancing', 'Permission-aware day sheets', 'Document vault', 'Travel and accommodation', 'Settlement and commission tracking'],
  };
  const serializedStructuredData = JSON.stringify(structuredData).replace(/</g, '\\u003c');

  return <>
    <div className="md:hidden"><NativeAppLanding /></div>
    <div className="hidden md:block"><main className="min-h-screen bg-[#f2ede3] text-[#151713]">
    <a href="#main-content" className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-[#11140f] px-5 py-3 text-sm font-bold text-white shadow-xl transition-transform focus:translate-y-0">Skip to main content</a>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializedStructuredData }} />
    <header className="sticky top-0 z-20 border-b border-black/10 bg-[#f2ede3]/90 backdrop-blur-xl"><div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8"><Link href="/" aria-label="SceneGen home"><Wordmark /></Link><nav className="hidden items-center gap-7 text-sm font-bold text-black/60 md:flex" aria-label="Main navigation"><a href="#product" className="hover:text-black">Product</a><a href="#workflows" className="hover:text-black">Workflows</a><a href="#teams" className="hover:text-black">Who it is for</a><a href="#questions" className="hover:text-black">Questions</a></nav><div className="flex items-center gap-2"><LandingMobileMenu /><Link href="/login" className="hidden rounded-full px-4 py-2.5 text-sm font-bold hover:bg-black/5 sm:block">Sign in</Link><Link href="/login?mode=register" className="hidden min-h-11 items-center rounded-full bg-[#11140f] px-5 text-sm font-bold text-white hover:bg-[#292d26] sm:inline-flex">Start planning <ArrowRight className="ml-2 h-4 w-4" /></Link></div></div></header>

    <section id="main-content" tabIndex={-1} className="scroll-mt-20 border-b border-black/10 px-5 pb-0 pt-8 outline-none sm:px-8 sm:pb-10 sm:pt-10"><div className="mx-auto max-w-7xl text-center"><p className="mx-auto w-fit rounded-full border border-black/10 bg-[#fbf8f1] px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em]">Built for the work behind live music</p><h1 className="mx-auto mt-4 max-w-5xl text-5xl font-black leading-[0.9] sm:text-6xl">SceneGen. The whole show.<br /><span className="text-[#ff5a36]">One working record.</span></h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-[#5f635a] sm:text-lg">Keep dates, routes, people, day sheets, documents and money in agreement, from the first hold to the final settlement.</p><div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/login?mode=register" className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#ff5a36] px-7 text-base font-bold text-white hover:bg-[#e94a28]">Create your workspace <ArrowRight className="ml-2 h-5 w-5" /></Link><a href="#product" className="inline-flex min-h-12 items-center justify-center rounded-full border border-black/15 px-7 text-base font-bold hover:bg-white/40">See the product</a></div><div id="product" className="mt-6"><ProductPreview /></div></div></section>

    <section className="bg-[#11140f] px-5 py-20 text-[#f7f2e8] sm:px-8 lg:py-24"><div className="mx-auto max-w-7xl"><div className="grid gap-8 border-b border-white/10 pb-12 lg:grid-cols-2 lg:items-end"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff8068]">A live operations system</p><h2 className="mt-5 text-4xl font-black leading-[0.95] sm:text-5xl">Stop running the tour from fragments.</h2></div><p className="max-w-2xl text-base leading-8 text-white/55 lg:justify-self-end">Spreadsheets, inboxes, message threads and stale PDFs describe different versions of the same show. SceneGen gives the work one authoritative home and gives each person precisely the view they need.</p></div><div id="workflows" className="grid border-x border-white/10 md:grid-cols-2 xl:grid-cols-4">{workflows.map(({ number, title, copy, icon: Icon }) => <article key={title} className="border-b border-r border-white/10 p-7"><div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-[0.2em] text-white/30">{number}</span><Icon className="h-5 w-5 text-[#ff8068]" /></div><h3 className="mt-12 text-xl font-black">{title}</h3><p className="mt-3 text-sm leading-6 text-white/50">{copy}</p></article>)}</div></div></section>

    <LandingProof />

    <section id="teams" className="px-5 py-20 sm:px-8 lg:py-24"><div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.8fr_1.2fr]"><div className="max-w-xl"><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff5a36]">One platform, clear boundaries</p><h2 className="mt-5 text-4xl font-black leading-[0.95] sm:text-5xl">Built for the network around the show.</h2><p className="mt-6 text-base leading-8 text-[#656960]">Bring the people who need to work together into one system without giving everyone the same access.</p></div><div className="divide-y divide-black/10 border-y border-black/10">{audiences.map(([title, copy], index) => <article key={title} className="grid gap-3 py-7 sm:grid-cols-[3rem_12rem_1fr]"><span className="text-[10px] font-black tracking-[0.2em] text-[#ff5a36]">0{index + 1}</span><h3 className="font-black">{title}</h3><p className="text-sm leading-6 text-[#6b6f66]">{copy}</p></article>)}</div></div></section>

    <LandingDecision />

    <section className="px-5 pb-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 rounded-lg bg-[#ff5a36] px-6 py-12 text-white sm:px-10 lg:flex-row lg:items-end lg:px-14 lg:py-16"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-white/70">Make the next run easier</p><h2 className="mt-5 max-w-3xl text-4xl font-black leading-[0.95] sm:text-5xl">Put the whole show on the same page.</h2></div><Link href="/login?mode=register" className="inline-flex min-h-12 w-fit items-center rounded-full bg-[#11140f] px-7 text-base font-bold text-white hover:bg-[#292d26]">Start with SceneGen <ArrowRight className="ml-2 h-5 w-5" /></Link></div></section>

    <footer className="px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col gap-5 border-t border-black/10 pt-7 text-xs text-black/50 sm:flex-row sm:items-center sm:justify-between"><Wordmark /><p>One working record for live music.</p><div className="flex flex-wrap gap-5 font-bold"><Link href="/login">Sign in</Link><Link href="/terms">Terms of Service</Link><Link href="/privacy">Privacy Policy</Link><a href="mailto:hello@scenegen.app">Contact</a></div></div></footer>
    </main></div>
  </>;
}
