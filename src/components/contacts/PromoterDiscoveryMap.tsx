'use client';

import { useEffect, useMemo, useState } from 'react';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { LatLngBounds, type LatLngTuple } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { publicCityMatch } from '@/lib/publicCityMatch';

type City = { city: string; country: string; count: number };
type ResolvedCity = City & {position:LatLngTuple};

function FitMap({ locations }: {locations:ResolvedCity[]}) {
  const map = useMap();
  const coords = useMemo(() => locations.map(city => city.position), [locations]);
  useEffect(() => {
    map.invalidateSize();
    if (coords.length === 1) map.setView(coords[0], 8);
    else if (coords.length > 1) map.fitBounds(new LatLngBounds(coords), {padding:[45,45],maxZoom:9});
  }, [map, coords]);
  return null;
}

export default function PromoterDiscoveryMap({ locations }: {locations:City[]}) {
  const [resolved,setResolved] = useState<Record<string,LatLngTuple>>({});
  const [loading,setLoading] = useState(false);
  const [error,setError] = useState('');
  const cities = useMemo(() => locations.slice(0,50),[locations]);
  const key = (place:City) => `${place.city.trim().toLowerCase()}|${place.country.trim().toLowerCase()}`;
  const locationKey = cities.map(key).join(';');

  useEffect(() => {
    if (!cities.length) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch('/api/import/resolve-cities', {
      method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,
      body:JSON.stringify({cities:cities.map(place=>({key:key(place),city:place.city,country:place.country}))}),
    }).then(async response => {
      if (!response.ok) throw new Error('City map lookup is unavailable');
      return response.json();
    }).then(data => {
      if (controller.signal.aborted) return;
      const positions:Record<string,LatLngTuple> = {};
      for (const point of Array.isArray(data.results) ? data.results : []) {
        if (point.status !== 'resolved' || point.partialMatch) continue;
        const requested = cities.find(place => key(place) === point.key);
        if (!requested || !publicCityMatch(requested, {city:point.city,country:point.country})) continue;
        const lat=Number(point.lat), lng=Number(point.lng);
        if (Number.isFinite(lat) && Math.abs(lat)<=90 && Number.isFinite(lng) && Math.abs(lng)<=180) positions[point.key]=[lat,lng];
      }
      setResolved(positions);
      if (!Object.keys(positions).length) setError('No verified city centres could be mapped. Use the list view.');
    }).catch(() => {if (!controller.signal.aborted) setError('Could not load promoter city locations. Use the list view.');})
      .finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  // Re-resolve only when the set of public city labels changes.
  },[locationKey]);

  const mapped = cities.flatMap(place => resolved[key(place)] ? [{...place,position:resolved[key(place)]}] : []);
  if (!cities.length) return <p className="rounded-lg border border-black/10 p-5 text-sm">These promoters have no public city locations to map.</p>;
  return <div className="space-y-2">
    <p className="text-xs text-[#686258]">Markers show approximate city centres, never a promoter's private address. {cities.length > mapped.length ? `${mapped.length} of ${cities.length} cities mapped.` : ''}</p>
    {loading && <p className="text-sm text-[#686258]">Locating city centres…</p>}
    {error && <p role="alert" className="text-sm text-[#9b4a39]">{error}</p>}
    {mapped.length > 0 && <div className="h-[27rem] overflow-hidden rounded-xl border border-black/10 bg-[#eee6da]">
      <MapContainer center={mapped[0].position} zoom={5} scrollWheelZoom className="h-full w-full">
        <FitMap locations={mapped}/>
        <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {mapped.map(place => <CircleMarker key={key(place)} center={place.position} radius={10} pathOptions={{color:'#b95335',fillColor:'#ef6747',fillOpacity:0.8,weight:2}}>
          <Popup><strong>{place.city}, {place.country}</strong><div>{place.count} {place.count===1?'matching promoter listing':'matching promoter listings'}</div><small>Approximate city centre</small></Popup>
        </CircleMarker>)}
      </MapContainer>
    </div>}
  </div>;
}
