'use client';

import { useEffect, useRef, useState } from 'react';
import PlacesAutocomplete from '@/components/ui/PlacesAutocomplete';
import { GenreTagPicker } from '@/components/settings/genre-tag-picker';
import { Search, UserRoundCheck } from 'lucide-react';
import { toast } from 'sonner';
import { useSession } from 'next-auth/react';
import { getEntityId } from '@/lib/entity';

type Result = { id: string; name: string; type: string };

export default function ContactSearch() {
  const [isLoading,setIsLoading] = useState(false);
  const [error,setError] = useState('');
  const [genres,setGenres] = useState<string[]>([]);
  const [cityInput,setCityInput] = useState('');
  const [countryInput,setCountryInput] = useState('');
  const [city,setCity] = useState('');
  const [country,setCountry] = useState('');
  const { data: session } = useSession();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Result[]>([]);
  const [sending, setSending] = useState<string | null>(null);
  const searchSequence = useRef(0);

  useEffect(() => {
    const trimmed=query.trim();
    const sequence=++searchSequence.current;
    if (trimmed.length<2 && !genres.length && !city && !country) {setResults([]);setIsLoading(false);return;}
    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{
      setIsLoading(true);setError('');
      try {
        const params=new URLSearchParams();
        params.set('q',trimmed);
        genres.forEach(value=>params.append('genre',value));
        if(city) params.set('city',city);
        if(country) params.set('country',country);
        const response=await fetch('/api/contacts/search-profiles?'+params.toString(),{
          headers:{'X-Entity-Id':getEntityId() || ''},signal:controller.signal,cache:'no-store'
        });
        if(!response.ok) throw new Error('Could not search profiles');
        const data=await response.json();
        if(sequence===searchSequence.current) setResults(Array.isArray(data.profiles)?data.profiles:[]);
      }catch(e) {if(!controller.signal.aborted){setResults([]);setError(e instanceof Error?e.message:'Search failed');}}
      finally{if(!controller.signal.aborted)setIsLoading(false);}
    },350);
    return ()=>{window.clearTimeout(timer);controller.abort();};
  },[query,genres,city,country]);

  async function connect(result: Result) {
    if (!session?.user?.id || sending) return;
    const entityId = getEntityId();
    if (!entityId) return toast.error('Select a workspace before connecting');
    setSending(result.id);
    try {
      const response = await fetch('/api/contacts/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Entity-Id': entityId },
        body: JSON.stringify({ contactEntityId: result.id }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || body.error || 'Could not send request');
      toast.success(`Connection request sent to ${result.name}`);
    } catch (caught) {
      toast.error(caught instanceof Error ? caught.message : 'Could not send request');
    } finally { setSending(null); }
  }

  return <div><h2 className="text-2xl font-black">Find a SceneGen profile</h2><p className="mt-1 text-sm text-[#6d685f]">Connections are reciprocal: the other profile must accept before it joins your network.</p>
    <div className="mt-7 space-y-4">
      <div><label className="mb-2 block text-sm font-bold">Music genres</label><GenreTagPicker tags={genres} onChange={setGenres}/></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div><label className="mb-2 block text-sm font-bold">Country</label>
          <PlacesAutocomplete value={countryInput} types={['(regions)']} placeholder="Search country with Google Places"
            onChange={value=>{setCountryInput(value);setCountry('');setCity('');setCityInput('');}}
            onPlaceSelect={place=>{const name=place.address_components?.find(part=>part.types.includes('country'))?.long_name || '';if(name && place.types?.includes('country')){setCountryInput(name);setCountry(name);}}}/>
          {country && <button type="button" className="mt-1 text-xs underline" onClick={()=>{setCountry('');setCountryInput('');setCity('');setCityInput('');}}>Clear country</button>}
        </div>
        <div><label className="mb-2 block text-sm font-bold">City</label>
          <PlacesAutocomplete value={cityInput} types={['(cities)']} placeholder="Search city with Google Places"
            onChange={value=>{setCityInput(value);setCity('');}}
            onPlaceSelect={place=>{const parts=place.address_components || [];const name=parts.find(part=>part.types.includes('locality') || part.types.includes('postal_town'))?.long_name || place.name || '';const nation=parts.find(part=>part.types.includes('country'))?.long_name || '';if(name && nation && (place.types?.includes('locality') || place.types?.includes('postal_town'))){setCityInput(name+', '+nation);setCity(name);setCountryInput(nation);setCountry(nation);}}}/>
          {city && <button type="button" className="mt-1 text-xs underline" onClick={()=>{setCity('');setCityInput('');}}>Clear city</button>}
        </div>
      </div>
    </div>
    <label className="relative mt-7 block"><span className="sr-only">Search SceneGen profiles</span><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777168]" size={18} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search artists, promoters and organisations" className="h-14 w-full rounded-md border border-black/10 bg-white pl-12 pr-4 outline-none focus:border-[#ff5a36]" /></label>
    {isLoading && <p className="mt-4 text-sm text-[#6d685f]">Searching...</p>}
    {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
    {(query.trim().length >= 2 || genres.length>0 || city || country) && !isLoading && !results.length && <p className="mt-6 rounded-lg border border-dashed border-black/15 py-10 text-center text-sm text-[#6d685f]">No matching profiles. Create a private contact instead.</p>}
    <div className="mt-5 grid gap-3">{results.map((result) => <article key={result.id} className="flex items-center justify-between gap-4 rounded-lg border border-black/10 bg-white p-5"><div><strong>{result.name}</strong><p className="mt-1 text-xs capitalize text-[#777168]">{result.type}</p></div><button type="button" onClick={() => void connect(result)} disabled={Boolean(sending)} className="inline-flex items-center gap-2 rounded-full bg-[#171713] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"><UserRoundCheck size={16} />{sending === result.id ? 'Sending...' : 'Connect'}</button></article>)}</div>
  </div>;
}
