'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search, Music2, MapPin, Building2, ArrowUpRight, ShieldCheck, SlidersHorizontal, RotateCcw, Bookmark, BookmarkCheck } from 'lucide-react';
import { useProfileStore } from '@/store/useProfileStore';
import { GenreTagPicker } from '@/components/settings/genre-tag-picker';
import PlacesAutocomplete from '@/components/ui/PlacesAutocomplete';
import CountryFilter from '@/components/contacts/CountryFilter';
import { discoverySummary, sortDiscoveryResults, type DiscoverySort } from '@/lib/promoterDiscoveryView';
import { publicDiscoveryCities } from '@/lib/promoterDiscoveryLocations';
import { upcomingShowCities } from '@/lib/promoterTourCities';
import { PromoterIntroductionComposer } from '@/components/contacts/PromoterIntroductionComposer';
import { SentPromoterIntroductions } from '@/components/contacts/SentPromoterIntroductions';
const PromoterDiscoveryMap = dynamic(() => import('@/components/contacts/PromoterDiscoveryMap'), {ssr:false,loading:()=> <p className="text-sm text-[#686258]">Loading map…</p>});

type Promoter = {
  name: string;
  profileId: string | null;
  discoveryKey?: string | null;
  availability?: 'available' | 'unavailable';
  acceptingIntroductions?: boolean;
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

type SavedPromoter = { id: string; discoveryKey: string; promoter: Promoter; status: 'available' | 'unavailable'; createdAt: string };

export default function PromoterDiscovery() {
  const { activeProfile } = useProfileStore();
  const [genres, setGenres] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [defaultGenresFound, setDefaultGenresFound] = useState(false);
  const [bandGenres, setBandGenres] = useState<string[]>([]);
  const [sort, setSort] = useState<DiscoverySort>('relevance');
  const [viewMode,setViewMode] = useState<'discover'|'saved'|'sent'>('discover');
  const [resultView,setResultView] = useState<'list'|'map'>('list');
  const [saved,setSaved] = useState<SavedPromoter[]>([]);
  const [savingKey,setSavingKey] = useState<string | null>(null);
  const [contactPromoter,setContactPromoter] = useState<{id:string;name:string}|null>(null);
  const [saveError,setSaveError] = useState('');
  const [tourCities,setTourCities] = useState<Array<{city:string;country:string;date:string}>>([]);
  const [text, setText] = useState('');
  const [cityInput,setCityInput] = useState('');
  const [selectedCity,setSelectedCity] = useState('');
  const [selectedCountry,setSelectedCountry] = useState('');
  const countrySource = useRef<'manual' | 'city' | null>(null);
  const currentWorkspaceRef = useRef(activeProfile?.id);
  currentWorkspaceRef.current = activeProfile?.id;
  const [results, setResults] = useState<Promoter[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const artist = activeProfile?.entityType?.toLowerCase() === 'artist';

  useEffect(() => {
    setLoaded(false);
    setGenres([]);
    setBandGenres([]);
    setSort('relevance');
    setViewMode('discover');
    setResultView('list');
    setSaved([]);
    setContactPromoter(null);
    setSaveError('');
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
          setBandGenres(suggestedGenres);
          setDefaultGenresFound(suggestedGenres.length > 0);
          setLoaded(true);
        }
      })
      .catch(() => { if (!controller.signal.aborted) setLoaded(true); });
    return () => controller.abort();
  }, [activeProfile?.id, artist]);

  useEffect(() => {
    if (!artist || !activeProfile?.id) return;
    const controller = new AbortController();
    fetch('/api/contacts/promoter-shortlist', {
      headers:{'X-Entity-Id':activeProfile.id},signal:controller.signal,cache:'no-store',
    }).then(async response => {
      if (!response.ok) throw new Error('Unable to load saved promoters');
      return response.json();
    }).then(data => { if (!controller.signal.aborted) setSaved(Array.isArray(data.saved) ? data.saved : []); })
      .catch(() => { if (!controller.signal.aborted) setSaveError('Could not load your shortlist.'); });
    return () => controller.abort();
  }, [artist, activeProfile?.id]);

  useEffect(() => {
    if (!artist || !activeProfile?.id) return;
    const controller=new AbortController();
    fetch('/api/shows', {headers:{'X-Entity-Id':activeProfile.id},signal:controller.signal,cache:'no-store'})
      .then(async response => {if (!response.ok) throw new Error('Shows unavailable'); return response.json();})
      .then(data => {
        if (controller.signal.aborted) return;
        const today=new Date().toISOString().slice(0,10);
        setTourCities(upcomingShowCities(Array.isArray(data.shows) ? data.shows : [],today));
      }).catch(()=>{if (!controller.signal.aborted) setTourCities([]);});
    return ()=>controller.abort();
  },[artist,activeProfile?.id]);

  async function toggleSave(promoter: Promoter) {
    if (!promoter.discoveryKey || !activeProfile?.id || savingKey) return;
    const workspaceId = activeProfile.id;
    const prior = saved.find(item => item.discoveryKey === promoter.discoveryKey);
    setSaveError('');
    setSavingKey(promoter.discoveryKey);
    try {
      const response = await fetch(prior
        ? `/api/contacts/promoter-shortlist/${encodeURIComponent(prior.id)}`
        : '/api/contacts/promoter-shortlist', {
        method:prior ? 'DELETE' : 'POST',
        headers:{'Content-Type':'application/json','X-Entity-Id':workspaceId},
        ...(prior ? {} : {body:JSON.stringify({discoveryKey:promoter.discoveryKey,genres,city:selectedCity,country:selectedCountry,query:text})}),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || 'Could not update shortlist');
      if (currentWorkspaceRef.current !== workspaceId) return;
      if (prior) setSaved(items => items.filter(item => item.id !== prior.id));
      else setSaved(items => [...items.filter(item => item.discoveryKey !== body.discoveryKey),{
        id:body.id,discoveryKey:body.discoveryKey,promoter:body.promoter,status:'available',createdAt:new Date().toISOString(),
      }]);
    } catch (caught) {
      if (currentWorkspaceRef.current === workspaceId) setSaveError(caught instanceof Error ? caught.message : 'Could not update shortlist');
    } finally {
      if (currentWorkspaceRef.current === workspaceId) setSavingKey(null);
    }
  }

  useEffect(() => {
    if (!artist || !loaded || !activeProfile?.id) return;
    const workspaceId = activeProfile.id;
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
          headers: { 'X-Entity-Id': workspaceId },
          signal: controller.signal, cache: 'no-store',
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(response.status === 429
            ? 'You have made too many promoter searches. Please try again in about 15 minutes.'
            : payload?.error?.message || 'Could not search promoter directory');
        }
        const data = await response.json();
        if (!controller.signal.aborted && currentWorkspaceRef.current === workspaceId) setResults(Array.isArray(data.promoters) ? data.promoters : []);
      } catch (caught) {
        if (!controller.signal.aborted && currentWorkspaceRef.current === workspaceId) setError(caught instanceof Error ? caught.message : 'Search unavailable');
      } finally {
        if (!controller.signal.aborted && currentWorkspaceRef.current === workspaceId) setBusy(false);
      }
    }, 350);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [genres, text, selectedCity, selectedCountry, loaded, artist, activeProfile?.id]);

  const summary = discoverySummary(results);
  const sortedResults = sortDiscoveryResults(results, sort);
  const displayResults = viewMode === 'saved'
    ? saved.map(item => ({...item.promoter,discoveryKey:item.discoveryKey,availability:item.status}))
    : sortedResults;
  const genresModified = genres.length !== bandGenres.length || genres.some(tag => !bandGenres.includes(tag));

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
    <div className="flex flex-wrap gap-2 border-b border-black/10 pb-3" role="tablist" aria-label="Promoter discovery views">
      <button type="button" role="tab" aria-selected={viewMode === 'discover'} onClick={() => setViewMode('discover')}
        className={`min-h-11 rounded-full px-5 text-sm font-bold ${viewMode === 'discover' ? 'bg-[#171713] text-white' : 'bg-[#eee6da] text-[#504b43]'}`}>Explore promoters</button>
      <button type="button" role="tab" aria-selected={viewMode === 'saved'} onClick={() => setViewMode('saved')}
        className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold ${viewMode === 'saved' ? 'bg-[#171713] text-white' : 'bg-[#eee6da] text-[#504b43]'}`}><Bookmark size={15}/> My shortlist ({saved.length})</button>
      <button type="button" role="tab" aria-selected={viewMode === 'sent'} onClick={() => setViewMode('sent')}
        className={`min-h-11 rounded-full px-5 text-sm font-bold ${viewMode === 'sent' ? 'bg-[#171713] text-white' : 'bg-[#eee6da] text-[#504b43]'}`}>Sent enquiries</button>
    </div>
    {viewMode === 'discover' && <>
    <div>
      <label className="mb-2 block text-sm font-bold">Music genres</label>
      <GenreTagPicker tags={genres} onChange={setGenres} />
      {loaded && genresModified && <button type="button" onClick={() => setGenres([...bandGenres])} className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#b64f31] hover:underline"><RotateCcw size={13} /> Reset to my band's genres</button>}
      {loaded && !defaultGenresFound && !genres.length && <p className="mt-2 text-xs text-[#686258]">This workspace has no saved music genre hashtags. Add genres to your band profile to see community matches. You can still search registered promoters by name or location.</p>}
    </div>
    {tourCities.length > 0 && <label className="block rounded-lg border border-black/10 bg-[#f7f0e6] p-3">
      <span className="mb-1 block text-[10px] font-black uppercase tracking-[.15em] text-[#86654e]">Discover by upcoming show city</span>
      <select value={tourCities.some(item=>item.city===selectedCity && item.country===selectedCountry) ? `${selectedCity}|${selectedCountry}` : ''}
        onChange={event=>{
          const selected=tourCities.find(item=>`${item.city}|${item.country}`===event.target.value);
          if (!selected) {setSelectedCity('');setCityInput('');if (countrySource.current==='city'){setSelectedCountry('');countrySource.current=null;}return;}
          countrySource.current='city';
          setSelectedCity(selected.city);setSelectedCountry(selected.country);setCityInput(`${selected.city}, ${selected.country}`);
        }}
        className="h-11 w-full rounded-md border border-black/15 bg-white px-3 text-sm font-semibold text-[#171713]">
        <option value="">Choose a city from your upcoming shows</option>
        {tourCities.map(item=><option key={`${item.city}|${item.country}`} value={`${item.city}|${item.country}`}>{item.date} · {item.city}, {item.country}</option>)}
      </select>
      <span className="mt-1 block text-xs text-[#756d61]">Find matching promoters in the same city as a planned show. Nearby radius search is not yet available.</span>
    </label>}
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
    {viewMode === 'discover' && busy && <p className="text-sm text-[#686258]">Finding promoters…</p>}
    {viewMode === 'discover' && error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    {viewMode === 'discover' && !busy && !error && results.length === 0 && (
      <p className="rounded-lg border border-black/10 p-5 text-sm text-[#686258]">
        {genres.length || text.trim() || selectedCity || selectedCountry ? 'No matching promoters were found.' : 'Choose a genre or search for a promoter.'}
      </p>
    )}
    {viewMode === 'discover' && !error && loaded && (results.length > 0 || busy) && <div className="space-y-4 border-b border-black/10 pb-5 pt-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[.18em] text-[#777168]">Your promoter matches</p>
          <p aria-live="polite" className="mt-1 text-xl font-black text-[#171713]">{busy ? 'Updating matches…' : `${summary.matches} ${summary.matches === 1 ? 'promoter' : 'promoters'} found`}</p>
        </div>
        <label className="flex items-center gap-2 text-xs font-bold text-[#504b43]">
          Sort by
          <select value={sort} onChange={event => setSort(event.target.value as DiscoverySort)} className="min-h-11 rounded-md border border-black/15 bg-white px-3 text-sm font-bold text-[#171713]" aria-label="Sort promoters">
            <option value="relevance">Best match</option>
            <option value="location">Location</option>
            <option value="name">Name</option>
          </select>
        </label>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3" aria-label="Discovery summary">
        <div className="rounded-lg bg-[#f2e9dd] p-3"><p className="text-2xl font-black text-[#171713]">{summary.matches}</p><p className="text-[11px] font-bold text-[#756d61]">Promoters</p></div>
        <div className="rounded-lg bg-[#f2e9dd] p-3"><p className="text-2xl font-black text-[#171713]">{summary.registered}</p><p className="text-[11px] font-bold text-[#756d61]">Registered</p></div>
        <div className="rounded-lg bg-[#f2e9dd] p-3"><p className="text-2xl font-black text-[#171713]">{summary.locations}</p><p className="text-[11px] font-bold text-[#756d61]">Known cities</p></div>
      </div>
      <div className="inline-flex rounded-lg bg-[#eee6da] p-1" aria-label="Discovery result view">
        <button type="button" aria-pressed={resultView==='list'} onClick={()=>setResultView('list')} className={`min-h-10 rounded-md px-5 text-xs font-bold ${resultView==='list'?'bg-[#171713] text-white':'text-[#504b43]'}`}>List</button>
        <button type="button" aria-pressed={resultView==='map'} onClick={()=>setResultView('map')} className={`min-h-10 rounded-md px-5 text-xs font-bold ${resultView==='map'?'bg-[#171713] text-white':'text-[#504b43]'}`}>Map</button>
      </div>
      <div className="flex flex-wrap gap-3 text-[11px] text-[#686258]">
        <span><strong className="text-[#171713]">Registered:</strong> claimed SceneGen profile</span>
        <span><strong className="text-[#171713]">Booking evidence:</strong> confirmed historical shows</span>
        <span><strong className="text-[#171713]">Community-listed:</strong> an unverified band's genre listing</span>
      </div>
    </div>}
    </>}
    {saveError && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}
    {viewMode === 'saved' && <div className="rounded-lg bg-[#f2e9dd] px-4 py-3 text-sm font-semibold text-[#504b43]">{saved.length ? `${saved.length} saved ${saved.length === 1 ? 'promoter' : 'promoters'} for this band. Private contact details remain hidden.` : 'No promoters saved yet. Explore matches and use Save to shortlist them.'}</div>}
    {viewMode === 'discover' && resultView === 'map' && <PromoterDiscoveryMap locations={publicDiscoveryCities(sortedResults)} />}
    {viewMode === 'sent' && activeProfile?.id && <SentPromoterIntroductions key={activeProfile.id} entityId={activeProfile.id}/> }
    {(viewMode === 'saved' || (viewMode === 'discover' && resultView === 'list')) && <div className="grid gap-4 md:grid-cols-2">
      {displayResults.map((promoter, index) => {
        const mainLocation = promoter.knownLocations?.[0];
        const locationLabel = mainLocation ? [mainLocation.city, mainLocation.country].filter(Boolean).join(', ') : 'Location not supplied';
        const unavailable = promoter.availability === 'unavailable';
        const isRegistered = Boolean(promoter.profileId) && !unavailable;
        const headline = unavailable ? 'No longer available' : isRegistered ? promoter.name : mainLocation?.city ? `Promoter in ${mainLocation.city}` : 'Unregistered promoter';
        const evidence = unavailable ? 'This saved listing can no longer be verified in the directory.' : promoter.matchBasis === 'both' ? 'Promoter genres and previous bookings'
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
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black ${isRegistered ? 'bg-[#e7f0e4] text-[#355a3b]' : 'bg-[#eeeae4] text-[#756d61]'}`}>{unavailable ? 'Unavailable' : isRegistered ? 'Registered' : 'Community-listed'}</span>
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
                <p className="flex items-start gap-2 text-xs leading-relaxed text-[#756d61]"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-[#6c8067]"/>{evidence}. {unavailable ? 'Its previous location, genres and booking details are hidden.' : isRegistered ? 'View the public promoter profile.' : 'Contact details stay private until shared.'}</p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-black/10 bg-[#faf6ef] px-4 py-2 sm:px-6">
            {!unavailable && promoter.profileId ? <Link href={'/profile/' + encodeURIComponent(promoter.profileId)} className="inline-flex min-h-11 items-center gap-1 text-sm font-black text-[#171713]">View public profile <ArrowUpRight size={17}/></Link> : <span className="text-xs text-[#756d61]">{unavailable ? 'Old listing information hidden' : 'Private identity protected'}</span>}
            {!unavailable && isRegistered && promoter.acceptingIntroductions && promoter.profileId && <button type="button" onClick={()=>setContactPromoter({id:promoter.profileId!,name:promoter.name})}
              className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[#171713] px-4 text-sm font-bold text-white">Request introduction</button>}
            {promoter.discoveryKey && <button type="button" disabled={Boolean(savingKey)} onClick={() => void toggleSave(promoter)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/15 bg-white px-4 text-sm font-bold text-[#171713] disabled:opacity-50">
              {unavailable ? <><BookmarkCheck size={16}/> Remove from shortlist</> : saved.some(item => item.discoveryKey === promoter.discoveryKey) ? <><BookmarkCheck size={16}/> Saved</> : <><Bookmark size={16}/> Save</>}
            </button>}
          </div>
        </article>;
      })}
    </div>}
    {artist && activeProfile?.id && <PromoterIntroductionComposer key={activeProfile.id} entityId={activeProfile.id} selected={contactPromoter} onClose={()=>setContactPromoter(null)}/>}
    <p className="text-xs text-[#686258]">
      Unclaimed listings do not reveal private contact information. Connect through a registered profile when available.
    </p>
  </div>;
}
