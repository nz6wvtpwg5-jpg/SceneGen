'use client';

import { useEffect, useState } from 'react';
import { Check, Music2, Search, X } from 'lucide-react';

type Genre = { id: string; name: string; hashtag: string; source: 'MusicBrainz' | 'SceneGen' };

export function GenreTagPicker({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = query.trim().replace(/^#/, '');
    if (search.length < 2) { setSuggestions([]); setLoading(false); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/genres?q=${encodeURIComponent(search)}`, { signal: controller.signal, cache: 'no-store' });
        const body = await response.json();
        if (response.ok) setSuggestions(body.genres || []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setSuggestions([]);
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }, 400);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);

  function add(genre: Genre) {
    if (!tags.includes(genre.hashtag)) onChange([...tags, genre.hashtag].slice(0, 12));
    setQuery('');
    setSuggestions([]);
  }

  return <div>
    <div className="flex min-h-12 flex-wrap gap-2 rounded-md border border-black/10 bg-white p-2 focus-within:border-[#ff5a36] focus-within:ring-2 focus-within:ring-[#ff5a36]/15">
      {tags.map((tag) => <span key={tag} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-[#171713] px-3 text-xs font-black text-white"><Music2 size={13} />{tag}<button type="button" onClick={() => onChange(tags.filter((item) => item !== tag))} className="grid h-7 w-7 place-items-center rounded-full text-white/60 hover:bg-white/10 hover:text-white" aria-label={`Remove ${tag}`}><X size={13} /></button></span>)}
      <label className="flex min-w-[10rem] flex-1 items-center gap-2 px-2"><Search size={16} className="shrink-0 text-[#777168]" /><span className="sr-only">Find a music genre</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tags.length ? 'Add another genre' : 'Search genres, e.g. doom metal'} className="h-10 min-w-0 flex-1 bg-transparent text-base outline-none sm:text-sm" /></label>
    </div>
    {query.trim().length >= 2 && <div className="mt-2 overflow-hidden rounded-md border border-black/10 bg-white shadow-lg" role="listbox" aria-label="Genre suggestions">
      {loading ? <p className="p-4 text-sm text-[#686258]">Searching genres…</p> : suggestions.length ? suggestions.map((genre) => <button key={genre.id} type="button" role="option" aria-selected={tags.includes(genre.hashtag)} onClick={() => add(genre)} className="flex min-h-12 w-full items-center justify-between border-b border-black/5 px-4 text-left last:border-0 hover:bg-[#f3ede3]"><span><strong className="block text-sm capitalize">{genre.name}</strong><span className="text-xs text-[#777168]">{genre.hashtag}</span></span>{tags.includes(genre.hashtag) && <Check size={16} className="text-[#ff5a36]" />}</button>) : <p className="p-4 text-sm text-[#686258]">No recognised genre found. Try a broader musical style.</p>}
    </div>}
    <p className="mt-2 text-xs leading-5 text-[#777168]">Choose established genres from SceneGen and MusicBrainz. SceneGen stores a consistent hashtag for future genre and location mapping.</p>
  </div>;
}
