'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, MapPin, X } from 'lucide-react';
import { countrySuggestions } from '@/lib/countryOptions';

/** A strict country combobox: free typing searches, only an option can commit a value. */
export default function CountryFilter({ value, onChange }: {value: string; onChange: (value: string) => void}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const matches = countrySuggestions(query);

  useEffect(() => { setQuery(value); }, [value]);
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) { setOpen(false); setQuery(value); }
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [value]);

  function commit(country: string) {
    setQuery(country);
    setOpen(false);
    setActiveIndex(0);
    onChange(country);
  }

  return <div ref={rootRef} className="relative">
    <div className="flex h-12 items-center gap-2 rounded-md border border-black/15 bg-white px-3 focus-within:border-[#ff5a36] focus-within:ring-2 focus-within:ring-[#ff5a36]/15">
      <MapPin size={17} className="shrink-0 text-[#686258]" />
      <input ref={inputRef} value={query} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId}
        aria-activedescendant={open && matches.length ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off" placeholder="Search countries" className="min-w-0 flex-1 bg-transparent text-sm outline-none"
        onFocus={() => { if (query && query !== value) setOpen(true); }}
        onChange={event => { setQuery(event.target.value); setOpen(Boolean(event.target.value.trim())); setActiveIndex(0); if (value) onChange(''); }}
        onKeyDown={event => {
          if (event.key === 'Escape') { setOpen(false); setQuery(value); }
          if (event.key === 'ArrowDown' && open && matches.length) { event.preventDefault(); setActiveIndex(index => (index + 1) % matches.length); }
          if (event.key === 'ArrowUp' && open && matches.length) { event.preventDefault(); setActiveIndex(index => (index - 1 + matches.length) % matches.length); }
          if (event.key === 'Enter' && open) { event.preventDefault(); if (matches[activeIndex]) commit(matches[activeIndex]); }
        }} />
      {value ? <button type="button" aria-label="Clear country" className="rounded p-1 text-[#686258] hover:bg-[#eee6da]" onClick={() => { commit(''); inputRef.current?.focus(); }}><X size={16} /></button>
        : <ChevronDown size={16} className="shrink-0 text-[#999184]" />}
    </div>
    {open && <div id={listId} role="listbox" aria-label="Country suggestions" className="absolute inset-x-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-black/10 bg-white p-1 shadow-lg">
      {matches.length ? matches.map((country,index) => <button key={country} id={`${listId}-${index}`} type="button" role="option"
        aria-selected={index === activeIndex} className={`flex w-full items-center justify-between rounded px-3 py-2.5 text-left text-sm ${index === activeIndex ? 'bg-[#f3e8dc] text-[#171713]' : 'hover:bg-[#f8f3eb]'}`}
        onMouseEnter={() => setActiveIndex(index)} onClick={() => commit(country)}>{country}{value === country && <Check size={16} />}</button>)
      : <p className="px-3 py-3 text-sm text-[#686258]">No countries match “{query}”. Try the City field for towns and cities.</p>}
    </div>}
  </div>;
}
