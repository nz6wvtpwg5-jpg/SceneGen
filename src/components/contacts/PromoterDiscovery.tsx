'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, Music2, MapPin, Building2, ArrowUpRight, ShieldCheck, SlidersHorizontal } from 'lucide-react';
import { getEntityId } from '@/lib/entity';
import { useProfileStore } from '@/store/useProfileStore';
import { GenreTagPicker } from '@/components/settings/genre-tag-picker';
import PlacesAutocomplete from '@/components/ui/PlacesAutocomplete';
import CountryFilter from '@/components/contacts/CountryFilter';

type Promoter = {
  name: string;
  profileId: string | null;
  registrationStatus: 'registered' | 'not_registered';
  discoverySource?: 'profile' | 'past_bookings' | 'contact_only';
  declaredGenres: string[];
  associatedBandGenres: string[];
  listedGenres?: string[];
  matchingGenres: string[];
  knownLocations?: Array<{city:string;country:string}>;
  bandsWorkedWith?: string[];
  matchBasis: 'promoter_selected' | 'past_bookings' | 'both' | 'contact_listing' | null;
};

export default function PromoterDiscovery() {
  const { activeProfile } = useProfileStore();
  const [genres, setGenres] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [defaultGenresFound, setDefaultGenresFound] = useState(false);
  const [text, setText] = useState('');
  const [cityInput,setCityInput] = useState('');
  const [selectedCity,setSelectedCity] = useState('');
  const [selectedCountry,setSelectedCountry] = useState('');
  const countrySource = useRef<'manual' | 'city' | null>(null);
  const [results, setResults] = useState<Promoter[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const artist = activeProfile?.entityType?.toLowerCase() === 'artist';

  useEffect(() => {
    setLoaded(false);
    setGenres([]);
    setDefaultGenresFound(false);
    setResults([]);
    setCityInput('');setSelectedCity('');setSelectedCountry('');countrySource.current=null;
    if (!artist || !activeProfile?.id) return;
    const controller = new AbortController();
    const headers = { 'X-Entity-Id': activeProfile.id };
    fetch('/api/contacts/discover-promoters', { headers, signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('Unable to load recommended genres');
        return response.json();
      })
      .then(data => {
        if (!controller.signal.aborted) {
          const suggestedGenres = Array.isArray(data.suggestedGenres) ? data.suggestedGenres : [];
          setGenres(suggestedGenres);
          setDefaultGenresFound(suggestedGenres.length > 0);
          setLoaded(true);
        }
      })
      .catch(() => { if (!controller.signal.aborted) setLoaded(true); });
    return () => controller.abort();
  }, [activeProfile?.id, artist]);

  useEffect(() => {
    if (!artist || !loaded) return;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      if (!genres.length && !text.trim() && !selectedCity && !selectedCountry) { setResults([]); setBusy(false); return; }
      setBusy(true);
      setError('');
      try {
        const params = new URLSearchParams();
        params.set('q', text.trim());
        if (selectedCity) params.set('city',selectedCity);
        if (selectedCountry) params.set('country',selectedCountry);
        // Explicit selection overrides the workspace defaults, including the empty selection.
        if (!genres.length) params.set('genre', '');
        else genres.forEach(tag => params.append('genre', tag));
        const response = await fetch('/api/contacts/discover-promoters?' + params.toString(), {
          headers: { 'X-Entity-Id': getEntityId() || activeProfile?.id || '' },
          signal: controller.signal, cache: 'no-store',
        });
        if (!response.ok) throw new Error('Could not search promoter directory');
        const data = await response.json();
        if (!controller.signal.aborted) setResults(Array.isArray(data.promoters) ? data.promoters : []);
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : 'Search unavailable');
      } finally {
        if (!controller.signal.aborted) setBusy(false);
      }
    }, 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [genres, text, selectedCity, selectedCountry, loaded, artist, activeProfile?.id]);

  if (!artist) return <p className="text-sm text-[#686258]">Switch to an artist workspace to discover promoters by genre.</p>;
  return <div className="space-y-5">
    <div>
      <h2 className="text-xl font-black">Discover promoters</h2>
      <p className="mt-2 max-w-2xl text-sm text-[#686258]">
        Automatically showing promoters who share at least one of your band's genre hashtags.
        You can change the genres or narrow results by country and city. Genres added by
        other bands to unregistered contact listings are not endorsements by those promoters.
      </p>
    </div>
    <div>
      <label className="mb-2 block text-sm font-bold">Music genres</label>
      <GenreTagPicker tags={genres} onChange={setGenres} />
      {loaded && !defaultGenresFound && !genres.length && <p className="mt-2 text-xs text-[#686258]">This workspace has no saved music genre hashtags. Add genres to your band profile to see automatic matches, or search by location.</p>}
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-bold">Country</label>
        <CountryFilter value={selectedCountry} onChange={country => { countrySource.current=country ? 'manual' : null; setSelectedCountry(country); setSelectedCity(''); setCityInput(''); }} />
      </div>
      <div>
        <label className="mb-2 block text-sm font-bold">City</label>
        <PlacesAutocomplete value={cityInput} types={['(cities)']}
          placeholder="Search city with Google Places"
          onChange={value=>{
            setCityInput(value);
            setSelectedCity('');
            if (countrySource.current === 'city') {
              countrySource.current = null;
              setSelectedCountry('');
            }
          }}
          onPlaceSelect={place=>{
            const parts=place.address_components || [];
            const city=parts.find(part=>part.types.includes('locality') || part.types.includes('postal_town'))?.long_name || place.name || '';
            const country=parts.find(part=>part.types.includes('country'))?.long_name || '';
            if (city && country && (place.types?.includes('locality') || place.types?.includes('postal_town'))) {
              const explicitlySelectedSameCountry = countrySource.current === 'manual' && selectedCountry === country;
              countrySource.current = explicitlySelectedSameCountry ? 'manual' : 'city';
              setCityInput([city,country].join(', '));setSelectedCity(city);setSelectedCountry(country);
            }
          }} />
        {selectedCity && <button type="button" onClick={()=>{
          setSelectedCity('');setCityInput('');
          if (countrySource.current === 'city') { countrySource.current = null; setSelectedCountry(''); }
        }} className="mt-1 text-xs underline">Clear city</button>}
      </div>
    </div>
    <label className="relative block">
      <span className="sr-only">Search promoter names or genres</span>
      <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#777168]" />
      <input value={text} onChange={event => setText(event.target.value)}
        className="h-12 w-full rounded-md border border-black/10 bg-white pl-11 pr-4"
        placeholder="Search promoter name or genre" maxLength={80} />
    </label>
    {busy && <p className="text-sm text-[#686258]">Finding promoters…</p>}
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {!busy && !error && results.length === 0 && (
      <p className="rounded-lg border border-black/10 p-5 text-sm text-[#686258]">
        {genres.length || text.trim() || selectedCity || selectedCountry ? 'No matching promoters were found.' : 'Choose a genre or search for a promoter.'}
      </p>
    )}
    {!busy && !error && results.length > 0 && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/10 pb-4 pt-2">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#777168]">Your promoter matches</p>
        <p className="mt-1 text-xl font-black text-[#171713]">{results.length} {results.length === 1 ? 'promoter' : 'promoters'} found</p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#eee6da] px-3 py-2 text-xs font-bold text-[#504b43]"><SlidersHorizontal size={14} />Matched to your search</span>
    </div>}
    <div className="grid gap-4 md:grid-cols-2">
      {results.map((promoter, index) => {
        const mainLocation = promoter.knownLocations?.[0];
        const locationLabel = mainLocation ? [mainLocation.city, mainLocation.country].filter(Boolean).join(', ') : 'Location not supplied';
        const isRegistered = Boolean(promoter.profileId);
        const headline = isRegistered ? promoter.name : mainLocation?.city ? `Promoter in ${mainLocation.city}` : 'Unregistered promoter';
        const evidence = promoter.matchBasis === 'both' ? 'Promoter genres and previous bookings'
          : promoter.matchBasis === 'promoter_selected' ? 'Promoter-selected genre'
          : promoter.matchBasis === 'past_bookings' ? 'Genres from previous bookings'
          : promoter.matchBasis === 'contact_listing' ? 'Genre listed by another band'
          : 'Location-based discovery';
        return <article key={promoter.profileId || `listing-${index}-${locationLabel}`}
          className="group flex h-full flex-col overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm transition-shadow hover:shadow-md">
          <div className="flex flex-1 flex-col p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#f3e6d9] text-[#b64f31]"><Building2 size={22} strokeWidth={1.8}/></span>
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[.16em] text-[#a05b41]">{isRegistered ? 'SceneGen promoter' : 'Promoter discovery'}</p>
                  <h3 className="mt-1 text-lg font-black leading-snug text-[#171713]">{headline}</h3>
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${isRegistered ? 'bg-[#e7f0e4] text-[#355a3b]' : 'bg-[#eeeae4] text-[#756d61]'}`}>{isRegistered ? 'Registered' : 'Unclaimed'}</span>
            </div>
            <div className="mt-5 flex items-start gap-2 text-sm text-[#504b43]"><MapPin size={17} className="mt-0.5 shrink-0 text-[#ff5a36]"/><span>{locationLabel}</span></div>
            {promoter.knownLocations && promoter.knownLocations.length > 1 && <p className="mt-1 pl-[25px] text-xs text-[#777168]">+{promoter.knownLocations.length - 1} other known locations</p>}
            {promoter.matchingGenres.length > 0 && <div className="mt-5 flex flex-wrap gap-2">
              {promoter.matchingGenres.map(tag => <span key={tag} className="inline-flex items-center gap-1.5 rounded-full bg-[#171713] px-3 py-1.5 text-xs font-bold text-white"><Music2 size={13}/>{tag}</span>)}
            </div>}
            {Boolean(promoter.bandsWorkedWith?.length) && <div className="mt-5 rounded-lg bg-[#f7f2ea] p-3">
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#777168]">Public booking history</p>
              <p className="mt-1 text-sm text-[#504b43]">{promoter.bandsWorkedWith?.slice(0,3).join(' · ')}</p>
            </div>}
            <div className="mt-auto pt-5">
              <div className="border-t border-black/10 pt-4">
                <p className="flex items-start gap-2 text-xs leading-relaxed text-[#756d61]"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#6c8067]"/>{evidence}. {isRegistered ? 'View the public promoter profile.' : 'Contact details stay private until shared.'}</p>
              </div>
            </div>
          </div>
          {promoter.profileId && <Link href={'/profile/' + encodeURIComponent(promoter.profileId)} className="flex min-h-12 items-center justify-between border-t border-black/10 bg-[#faf6ef] px-6 text-sm font-black text-[#171713] hover:bg-[#f1e8dc]">View public profile <ArrowUpRight size={17}/></Link>}
        </article>;
      })}
    </div>
    <p className="text-xs text-[#686258]">
      Unclaimed listings do not reveal private contact information. Connect through a registered profile when available.
    </p>
  </div>;
}
