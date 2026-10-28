"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";

const links = [
  ["Product", "product"],
  ["Workflows", "workflows"],
  ["Who it is for", "teams"],
  ["Questions", "questions"],
];

export function LandingMobileMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    containerRef.current?.querySelector<HTMLAnchorElement>("nav a")?.focus();
    const closeOutside = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  return <div ref={containerRef} className="relative md:hidden">
    <button ref={triggerRef} type="button" className="flex h-11 w-11 items-center justify-center rounded-full border border-black/10 hover:bg-white/50" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="landing-mobile-navigation" onClick={() => setOpen((current) => !current)}>
      {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
    </button>
    {open && <nav id="landing-mobile-navigation" className="absolute right-0 top-14 z-50 w-56 overflow-hidden rounded-lg border border-black/10 bg-[#fbf8f1] p-2 shadow-[0_20px_60px_rgba(17,20,15,0.18)]" aria-label="Mobile navigation">
      {links.map(([label, target]) => <a key={target} href={`#${target}`} className="block px-4 py-3 text-sm font-bold text-black/60 hover:bg-black/5 hover:text-black" onClick={() => setOpen(false)}>{label}</a>)}
      <Link href="/login" className="mt-1 block border-t border-black/10 px-4 py-3 text-sm font-bold text-[#e54525]" onClick={() => setOpen(false)}>Sign in</Link>
      <Link href="/login?mode=register" className="block bg-[#11140f] px-4 py-3 text-sm font-bold text-white" onClick={() => setOpen(false)}>Start planning</Link>
    </nav>}
  </div>;
}
