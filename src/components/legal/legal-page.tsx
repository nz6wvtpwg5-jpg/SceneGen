import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { SceneGenMark } from '@/components/brand/scene-gen-mark';

export type LegalSection = { title: string; paragraphs?: React.ReactNode[]; items?: React.ReactNode[] };

export function LegalPage({ eyebrow, title, summary, updated, sections }: { eyebrow: string; title: string; summary: string; updated: string; sections: LegalSection[] }) {
  return <main className="min-h-screen bg-[#f2ede3] text-[#151713]">
    <header className="border-b border-black/10 bg-[#11140f] text-white"><div className="mx-auto flex min-h-20 max-w-6xl items-center justify-between px-5 sm:px-8"><Link href="/" className="flex items-center gap-3" aria-label="SceneGen home"><SceneGenMark className="h-10 w-10" /><span><span className="block text-sm font-black uppercase tracking-[0.14em]">SceneGen</span><span className="mt-1 block text-[8px] font-bold uppercase tracking-[0.28em] text-white/45">Live operations</span></span></Link><Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-white/65 hover:text-white"><ArrowLeft size={16} />Back to SceneGen</Link></div></header>
    <article className="mx-auto max-w-4xl px-5 py-14 sm:px-8 sm:py-20">
      <div className="border-b border-black/10 pb-10"><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff5a36]">{eyebrow}</p><h1 className="mt-5 text-5xl font-black leading-[0.94] sm:text-6xl">{title}</h1><p className="mt-6 max-w-3xl text-lg leading-8 text-[#61655d]">{summary}</p><p className="mt-5 text-xs font-bold text-black/45">Last updated: {updated}</p></div>
      <div className="divide-y divide-black/10">{sections.map((section, index) => <section key={section.title} className="grid gap-5 py-9 md:grid-cols-[3rem_1fr]"><span className="pt-1 text-[10px] font-black tracking-[0.2em] text-[#ff5a36]">{String(index + 1).padStart(2, '0')}</span><div><h2 className="text-2xl font-black">{section.title}</h2><div className="mt-4 space-y-4 text-[15px] leading-7 text-[#5f635a]">{section.paragraphs?.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}{section.items && <ul className="list-disc space-y-2 pl-5">{section.items.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul>}</div></div></section>)}</div>
    </article>
    <footer className="border-t border-black/10 px-5 py-8 sm:px-8"><div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-xs font-bold text-black/50"><p>SceneGen - One working record for live music.</p><nav className="flex flex-wrap gap-5" aria-label="Legal"><Link href="/terms" className="hover:text-black">Terms of Service</Link><Link href="/privacy" className="hover:text-black">Privacy Policy</Link><a href="mailto:hello@scenegen.app" className="hover:text-black">Contact</a></nav></div></footer>
  </main>;
}
