'use client';

import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { LatLngBounds, type LatLngTuple } from 'leaflet';
import { getEntityId } from '@/lib/entity';
import 'leaflet/dist/leaflet.css';

type Country = { country: string; currency: string | null; visits: number; totalFee: string; averageFee: string; highestFee: string; paidShows: number; latitude: string | null; longitude: string | null };
type City = { country: string; city: string; visits: number; latitude: string | null; longitude: string | null };
type Contact = { contactId: string; showId: string; displayName: string; organization?: string; venueName?: string; city?: string; country?: string; latitude: string; longitude: string; associatedShows: number };
type ShowPoint = { showId: string; venueName?: string; city?: string; country?: string; latitude: string | null; longitude: string | null; contactId: string | null; displayName: string | null; organization: string | null; linkedContacts: number };
type Intelligence = { currencies: string[]; countries: Country[]; cities: City[]; contactPoints: Contact[]; showPoints: ShowPoint[]; unmappedContacts: number };
type View = 'contacts' | 'countries' | 'cities';

const centres: Record<string, LatLngTuple> = {
  usa:[39.83,-98.58], 'united states':[39.83,-98.58], 'united states of america':[39.83,-98.58],
  spain:[40.42,-3.70], netherlands:[52.13,5.29], norway:[61,8],
  'united kingdom':[54,-2], france:[46.6,1.89], germany:[51.17,10.45],
  belgium:[50.5,4.47], italy:[42.83,12.83], portugal:[39.4,-8.22],
  ireland:[53.4,-8], sweden:[62,15], finland:[64,26], denmark:[56,10],
  austria:[47.5,14.5], switzerland:[46.8,8.2], poland:[52,19],
  czechia:[49.8,15.5], 'czech republic':[49.8,15.5], canada:[56,-106],
  australia:[-25,133], japan:[36,138], mexico:[23,-102], brazil:[-10,-55],
};
const normal = (value: string) => value.trim().toLocaleLowerCase();
const keyCity = (city: City) => normal(city.country) + '|' + normal(city.city);
const coords = (lat: unknown, lng: unknown): LatLngTuple | null => {
  if (lat === null || lat === undefined || lng === null || lng === undefined || lat === '' || lng === '') return null;
  const a = Number(lat), b = Number(lng);
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180 ? [a,b] : null;
};

function FitCityLocations({ points }: { points: LatLngTuple[] }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (points.length === 1) map.setView(points[0], 8);
    else if (points.length > 1) map.fitBounds(new LatLngBounds(points), { padding:[55,55], maxZoom:8 });
    else map.setView([45,5],3);
  }, [map,points]);
  return null;
}

export default function ContactIntelligenceMap() {
  const [data,setData] = useState<Intelligence | null>(null);
  const [view,setView] = useState<View>('contacts');
  const [selectedCountry,setSelectedCountry] = useState<string | null>(null);
  const [resolved,setResolved] = useState<Record<string,LatLngTuple>>({});
  const [geocoding,setGeocoding] = useState(false);
  const [geocodeError,setGeocodeError] = useState('');
  const [error,setError] = useState('');
  const [retry,setRetry] = useState(0);
  const [syncing,setSyncing] = useState(false);
  const [editingShow,setEditingShow] = useState<string | null>(null);
  const [contactName,setContactName] = useState('');
  const [contactEmail,setContactEmail] = useState('');
  const [contactPhone,setContactPhone] = useState('');
  const [sendInvitation,setSendInvitation] = useState(false);
  const [invitationNotice,setInvitationNotice] = useState('');
  const [savingContact,setSavingContact] = useState(false);
  const [contactError,setContactError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const headers: HeadersInit = {};
    const entityId = getEntityId();
    if (entityId) headers['X-Entity-Id'] = entityId;
    fetch('/api/contact-intelligence', {headers,signal:controller.signal})
      .then(async response => { if (!response.ok) throw new Error('Unable to load map data'); return response.json(); })
      .then((result: Intelligence) => { setData(result);setError(''); })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load map'); });
    return () => controller.abort();
  },[retry]);

  const missing = useMemo(() => (data?.cities || []).filter(city => city.city && city.country && !coords(city.latitude,city.longitude) && !resolved[keyCity(city)]),[data,resolved]);
  useEffect(() => {
    if (view !== 'cities' || !missing.length) return;
    const controller = new AbortController();
    const batch = missing.slice(0,50);
    const timer = setTimeout(async () => {
      setGeocoding(true);
      try {
        const response = await fetch('/api/import/resolve-cities', {
          method:'POST', headers:{'Content-Type':'application/json'}, signal:controller.signal,
          body:JSON.stringify({cities:batch.map(city => ({key:keyCity(city),city:city.city,country:city.country}))})
        });
        if (!response.ok) throw new Error('City location lookup failed');
        const body = await response.json();
        const found: Record<string,LatLngTuple> = {};
        for (const item of body.results || []) {
          const point = coords(item.lat,item.lng);
          if (item.status === 'resolved' && !item.partialMatch && point) found[item.key] = point;
        }
        if (!controller.signal.aborted) {
          setResolved(previous => ({...previous,...found}));
          if (Object.keys(found).length !== batch.length) setGeocodeError('Some city locations could not be resolved.');
          else setGeocodeError('');
        }
      } catch(e) {
        if (!controller.signal.aborted) setGeocodeError(e instanceof Error ? e.message : 'Unable to locate city');
      } finally { if (!controller.signal.aborted) setGeocoding(false); }
    },150);
    return () => { controller.abort();clearTimeout(timer); };
  // Resolve each incoming set of unresolved cities once, avoiding render-loop retries.
  },[view,data]);

  const countryRows = useMemo(() => {
    const byName = new Map<string,Country>();
    for (const row of data?.countries || []) {
      const key = normal(row.country);
      const prev = byName.get(key);
      if (prev) { prev.visits += row.visits; prev.paidShows += row.paidShows; }
      else byName.set(key,{...row});
    }
    return [...byName.values()];
  },[data]);
  const cityRows = useMemo(() => (data?.cities || [])
    .filter(row => !selectedCountry || normal(row.country) === normal(selectedCountry))
    .map(row => ({row,position:coords(row.latitude,row.longitude) || resolved[keyCity(row)] || null}))
    .filter((point): point is { row: City; position: LatLngTuple } => point.position !== null),[data,selectedCountry,resolved]);
  const positions = useMemo(() => cityRows.map(item=>item.position),[cityRows]);
  const contactRows = useMemo(() => (data?.showPoints || [])
    .map(row => ({row,position:coords(row.latitude,row.longitude)}))
    .filter((item): item is {row:ShowPoint;position:LatLngTuple} => item.position !== null),[data]);
  const maxVisits = Math.max(1,...countryRows.map(row=>row.visits));
  const maxCityVisits = Math.max(1,...cityRows.map(item=>item.row.visits));

  const choose = (next:View) => { setView(next);if (next === 'countries' || next === 'cities') setSelectedCountry(null); };
  const openCountry = (country:string) => { setSelectedCountry(country);setView('cities'); };

  async function addShowContact(showId:string) {
    if (!contactName.trim()) { setContactError('Enter a contact name'); return; }
    setSavingContact(true);setContactError('');
    try {
      const headers: HeadersInit = {'Content-Type':'application/json'};
      const entityId = getEntityId();
      if (entityId) headers['X-Entity-Id'] = entityId;
      const response = await fetch('/api/contacts/private/for-show', {
        method:'POST',headers,
        body:JSON.stringify({showId,displayName:contactName.trim(),email:contactEmail.trim() || null,phone:contactPhone.trim() || null,roles:['promoter'],sendInvitation:sendInvitation && Boolean(contactEmail.trim())}),
      });
      if (!response.ok) { const body=await response.json().catch(()=>({}));throw new Error(body?.error?.message || 'Unable to save contact'); }
      const outcome = await response.json();
      setInvitationNotice(sendInvitation ? (outcome.invitation?.sent ? 'Contact saved and invitation emailed.' : 'Contact saved. Invitation not sent (' + (outcome.invitation?.reason || 'unavailable') + ').') : 'Contact saved. No invitation requested.');
      const saved = await response.json();
      setInvitationNotice(sendInvitation ? (saved.invitation?.sent ? 'Contact saved and promoter invitation emailed.' : 'Contact saved. Invitation was not sent (' + (saved.invitation?.reason || 'unknown') + ').') : 'Contact saved.');
      setEditingShow(null);setContactName('');setContactEmail('');setContactPhone('');setSendInvitation(false);setSendInvitation(false);
      setRetry(value=>value+1);
    } catch(e) {setContactError(e instanceof Error?e.message:'Unable to save contact');}
    finally {setSavingContact(false);}
  }

  async function sync() {
    setSyncing(true);
    try {
      const headers: HeadersInit = {'Content-Type':'application/json'};
      const entityId = getEntityId();
      if (entityId) headers['X-Entity-Id'] = entityId;
      const response = await fetch('/api/contacts/private/import-shows',{method:'POST',headers});
      if (!response.ok) throw new Error('Unable to sync show contacts');
      setRetry(current=>current+1);
    } catch(e) { setError(e instanceof Error ? e.message : 'Sync failed'); }
    finally { setSyncing(false); }
  }

  if (error) return <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-5">{error}<button className="ml-4 underline" onClick={()=>{setError('');setRetry(current=>current+1);}}>Try again</button></div>;
  if (!data) return <div className="h-[36rem] animate-pulse rounded-lg bg-[#e5ddd1]" />;

  const mapKey = view + (view === 'cities' ? ':'+(selectedCountry || 'all') : '');
  return <section className="space-y-3" aria-label="Contact Insights">
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-black/10 bg-[#fffaf2] p-3">
      {(['contacts','countries','cities'] as View[]).map(item =>
        <button type="button" key={item} onClick={()=>choose(item)}
          aria-pressed={view===item}
          className={'rounded-full px-4 py-2 text-sm font-bold ' + (view===item?'bg-[#171713] text-white':'bg-white text-[#5f5a52]')}>
          {item==='contacts'?'Contacts & venues':item==='countries'?'Countries visited':'Cities visited'}
        </button>)}
      {view==='cities' && selectedCountry && <button type="button" className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm font-bold" onClick={()=>choose('countries')}>← Back to countries</button>}
      <button type="button" className="ml-auto rounded-full border bg-white px-4 py-2 text-sm font-bold disabled:opacity-50" disabled={syncing} onClick={()=>void sync()}>{syncing?'Syncing…':'Sync show contacts'}</button>
      <span className="text-xs text-[#777168]">{data.unmappedContacts} contacts need a location</span>
    </div>
    <div className="h-[36rem] overflow-hidden rounded-lg border border-black/10">
        <MapContainer key={mapKey} center={[45,5]} zoom={3} scrollWheelZoom className="h-full w-full">
          <TileLayer attribution="&copy; OpenStreetMap contributors" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          {view==='cities' && <FitCityLocations points={positions} />}
          {view==='countries' && countryRows.map(row => {
            const centre = centres[normal(row.country)];
            if (!centre) return null;
            return <CircleMarker key={'country:'+normal(row.country)} center={centre}
              radius={8+22*row.visits/maxVisits}
              eventHandlers={{click:()=>openCountry(row.country)}}
              pathOptions={{color:'#8f2416',fillColor:'#ff7356',fillOpacity:.7}}>
              <Popup><strong>{row.country}</strong><br />Visits: {row.visits}<br />Click to view visited cities</Popup>
            </CircleMarker>;
          })}
          {view==='cities' && cityRows.map(({row,position})=><CircleMarker key={'city:'+keyCity(row)} center={position}
            radius={5+9*row.visits/maxCityVisits} pathOptions={{color:'#b4412b',fillColor:'#ff7356',fillOpacity:.72}}>
            <Popup><strong>{row.city}, {row.country}</strong><br />Shows: {row.visits}<br />{coords(row.latitude,row.longitude)?'Recorded location':'Approximate city centre'}</Popup>
          </CircleMarker>)}
          {view==='contacts' && contactRows.map(({row,position},index)=><CircleMarker key={'show:'+row.showId+':'+(row.contactId || index)} center={position}
            radius={8} pathOptions={{color:row.contactId?'#b4412b':'#946c23',fillColor:row.contactId?'#ff7356':'#efc373',fillOpacity:.75}}>
            <Popup><strong>{row.venueName || row.city || 'Past show'}</strong><br />{row.city}, {row.country}<br />
              {row.contactId ? <>Contact: {row.displayName || row.organization || 'Linked contact'}</> : <>
                <span>No contact linked to this show</span><br />
                {editingShow===row.showId ? <div className="mt-2 flex min-w-56 flex-col gap-2">
                  <input aria-label="Contact name" placeholder="Contact name" value={contactName} onChange={e=>setContactName(e.target.value)} className="rounded border p-2" />
                  <input aria-label="Contact email" placeholder="Email (optional)" type="email" value={contactEmail} onChange={e=>setContactEmail(e.target.value)} className="rounded border p-2" />
                  <input aria-label="Contact phone" placeholder="Phone (optional)" value={contactPhone} onChange={e=>setContactPhone(e.target.value)} className="rounded border p-2" />
                  <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={sendInvitation} disabled={!contactEmail.trim()} onChange={e=>setSendInvitation(e.target.checked)} />Email invitation to claim a promoter profile</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={sendInvitation} disabled={!contactEmail.trim()} onChange={e=>setSendInvitation(e.target.checked)} />Invite promoter to claim their SceneGen profile</label>
                  {contactError && <p role="alert" className="text-red-700">{contactError}</p>}
                  <button type="button" disabled={savingContact} onClick={()=>void addShowContact(row.showId)} className="rounded bg-black p-2 text-white">{savingContact?'Saving…':'Save contact'}</button>
                  <button type="button" onClick={()=>setEditingShow(null)}>Cancel</button>
                </div> : <button type="button" className="mt-2 rounded bg-black px-3 py-2 text-white" onClick={()=>{setEditingShow(row.showId);setContactError('');}}>Add contact</button>}
              </>}
            </Popup>
          </CircleMarker>)}
        </MapContainer>
      </div>
    {invitationNotice && <p role="status" className="rounded border bg-[#fffaf2] p-3 text-sm">{invitationNotice}</p>}
    {invitationNotice && <p role="status" className="rounded-lg border bg-[#fffaf2] p-3 text-sm">{invitationNotice}</p>}
    {view==='cities' && geocoding && <p className="text-sm text-[#6d685f]">Finding missing city locations…</p>}
    {view==='cities' && geocodeError && <p role="status" className="text-sm text-[#8a5b35]">{geocodeError}</p>}
    {view==='cities' && !geocoding && cityRows.length===0 && <p className="rounded-lg border bg-[#fffaf2] p-5 text-sm">No past-show cities with resolved coordinates in this view.</p>}
    {view==='countries' && countryRows.length===0 && <p className="rounded-lg border bg-[#fffaf2] p-5 text-sm">No completed shows with country information yet.</p>}
    {view==='contacts' && contactRows.length===0 && <p className="rounded-lg border bg-[#fffaf2] p-5 text-sm">No past shows with mapped locations yet.</p>}
    {view==='countries' && countryRows.length>0 && <div className="overflow-x-auto rounded-lg border bg-[#fffaf2]">
      <table className="w-full text-left text-sm"><thead><tr><th className="p-3">Country</th><th className="p-3">Visits</th></tr></thead>
      <tbody>{[...countryRows].sort((a,b)=>b.visits-a.visits).map(row=><tr key={row.country} className="border-t border-black/10"><td className="p-3">{row.country}</td><td className="p-3">{row.visits}</td></tr>)}</tbody></table>
    </div>}
  </section>;
}
