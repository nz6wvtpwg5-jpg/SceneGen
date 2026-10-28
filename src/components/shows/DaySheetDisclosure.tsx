'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

type Props = {
  id?: string;
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
  defaultOpen?: boolean;
  forceOpen?: boolean;
};

export default function DaySheetDisclosure({ id, eyebrow, title, summary, children, defaultOpen = false, forceOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (forceOpen) setOpen(true);
  }, [forceOpen]);

  useEffect(() => {
    if (!id) return;
    const openForHash = () => {
      if (window.location.hash === `#${id}`) setOpen(true);
    };
    openForHash();
    window.addEventListener('hashchange', openForHash);
    return () => window.removeEventListener('hashchange', openForHash);
  }, [id]);

  return <section id={id} className="scroll-mt-24 overflow-hidden rounded-[22px] border border-[#d8d0c3] bg-[#fffaf2] shadow-[0_18px_50px_rgba(45,37,24,.07)] sm:rounded-lg">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="flex min-h-24 w-full items-center justify-between gap-5 p-4 text-left hover:bg-[#f8f1e6] sm:p-6">
      <span className="min-w-0">
        <span className="block text-[10px] font-black uppercase tracking-[.18em] text-[#e74428]">{eyebrow}</span>
        <span className="mt-1 block text-xl font-black text-[#171713] sm:text-2xl">{title}</span>
        <span className="mt-1 block text-sm text-[#686258]">{summary}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-xs font-black uppercase tracking-[.1em] text-[#5f5a51]">
        <span className="hidden sm:inline">{open ? 'Close' : 'Open'}</span>
        <ChevronDown size={20} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </span>
    </button>
    {open && <div className="border-t border-[#d8d0c3] bg-[#f2ebe0] p-2 sm:p-3 [&>section]:shadow-none">{children}</div>}
  </section>;
}
