'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Music2 } from 'lucide-react';
import { getEntityId } from '@/lib/entity';
import { useProfileStore } from '@/store/useProfileStore';
import { GenreTagPicker } from '@/components/settings/genre-tag-picker';
import PlacesAutocomplete from '@/components/ui/PlacesAutocomplete';

type Promoter = {
  name: string;
  profileId: string | null;
  registrationStatus: 'registered' | 'not_registered';
  discoverySource?: 'profile' | 'past_bookings' | 'contact_only';
  declaredGenres: string[];
  associatedBandGenres: string[];
  matchingGenres: string[];
  knownLocations?: Array<{city:string;country:string}>;
  bandsWorkedWith?: string[];
  matchBasis: 'promoter_selected' | 'past_bookings' | 'both' | null;
};

export default function PromoterDiscovery() {
  const { activeProfile } = useProfileStore();
  const [genres, setGenres] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState('');
  const [cityInput,setCityInput] = useState('');
  const [countryInput,setCountryInput] = useState('');
  const [selectedCity,setSelectedCity] = useState('');
  const [selectedCountry,setSelectedCountry] = useState('');
  const [results, setResults] = useState<Promoter[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const artist = activeProfile?.entityType?.toLowerCase() === 'artist';

  useEffect(() => {
    setLoaded(false);
    setGenres([]);
    setResults([]);
    setCityInput('');setCountryInput('');setSelectedCity('');setSelectedCountry('');
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
          setGenres(Array.isArray(data.suggestedGenres) ? data.suggestedGenres : []);
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
        Find promoters by your band's genres, genres promoters have selected themselves,
        or the music played by bands they've worked with. A booking association is not
        a promoter's personal endorsement.
      </p>
    </div>
    <div>
      <label className="mb-2 block text-sm font-bold">Music genres</label>
      <GenreTagPicker tags={genres} onChange={setGenres} />
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="mb-2 block text-sm font-bold">Country</label>
        <PlacesAutocomplete value={countryInput} types={['(regions)']}
          placeholder="Search country with Google Places"
          onChange={value=>{setCountryInput(value);setSelectedCountry('');setSelectedCity('');setCityInput('');}}
          onPlaceSelect={place=>{
            const country=place.address_components?.find(part=>part.types.includes('country'))?.long_name || '';
            if (country && place.types?.includes('country')) {setCountryInput(country);setSelectedCountry(country);}
          }} />
        {selectedCountry && <button type="button" onClick={()=>{setSelectedCountry('');setCountryInput('');setSelectedCity('');setCityInput('');}} className="mt-1 text-xs underline">Clear country</button>}
      </div>
      <div>
        <label className="mb-2 block text-sm font-bold">City</label>
        <PlacesAutocomplete value={cityInput} types={['(cities)']}
          placeholder="Search city with Google Places"
          onChange={value=>{setCityInput(value);setSelectedCity('');}}
          onPlaceSelect={place=>{
            const parts=place.address_components || [];
            const city=parts.find(part=>part.types.includes('locality') || part.types.includes('postal_town'))?.long_name || place.name || '';
            const country=parts.find(part=>part.types.includes('country'))?.long_name || '';
            if (city && country && (place.types?.includes('locality') || place.types?.includes('postal_town'))) {
              setCityInput([city,country].join(', '));setSelectedCity(city);setSelectedCountry(country);setCountryInput(country);
            }
          }} />
        {selectedCity && <button type="button" onClick={()=>{setSelectedCity('');setCityInput('');}} className="mt-1 text-xs underline">Clear city</button>}
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
    <div className="grid gap-3">
      {results.map((promoter, index) => (
        <article key={promoter.profileId || promoter.name + ':' + index}
          className="rounded-lg border border-black/10 bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-black">{promoter.name}</h3>
              <p className="mt-1 text-xs text-[#686258]">
                {promoter.profileId ? 'Registered SceneGen promoter' : promoter.discoverySource === 'contact_only' ? 'Known promoter location · Unregistered' : 'Discovered from historical bookings · Unclaimed'}
              </p>
            </div>
            {promoter.profileId && <Link href={'/profile/' + encodeURIComponent(promoter.profileId)}
              className="rounded-full bg-[#171713] px-4 py-2 text-sm font-bold text-white">View profile</Link>}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {promoter.matchingGenres.map(tag => <span key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-[#eee6da] px-3 py-1 text-xs font-bold">
              <Music2 size={12} />{tag}</span>)}
          </div>
          {Boolean(promoter.knownLocations?.length) && <p className="mt-3 text-sm text-[#504b43]">{promoter.discoverySource === 'contact_only' ? 'Location' : 'Known show locations'}: {promoter.knownLocations?.map(place=>[place.city,place.country].filter(Boolean).join(', ')).join(' · ')}</p>}
          {Boolean(promoter.bandsWorkedWith?.length) && <p className="mt-2 text-sm text-[#504b43]">Bands worked with recently include {promoter.bandsWorkedWith?.join(', ')}</p>}
          <p className="mt-3 text-xs text-[#686258]">
            {promoter.matchBasis === 'both' ? 'Matches promoter-selected genres and previous bookings'
              : promoter.matchBasis === 'promoter_selected' ? 'Matches the promoter’s selected genres'
              : promoter.matchBasis === 'past_bookings' ? 'Matches genres of bands from previous bookings'
              : 'Search result'}
          </p>
        </article>
      ))}
    </div>
    <p className="text-xs text-[#686258]">
      Unclaimed listings do not reveal private contact information. Connect through a registered profile when available.
    </p>
  </div>;
}
