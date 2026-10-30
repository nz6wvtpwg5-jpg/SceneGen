type PlannedShow = {
  id?:string; showDate?:string; venueCity?:string; venueCountry?:string;
  showType?:string; status?:string; tourId?:string;
};
export function upcomingShowCities(shows:PlannedShow[],today:string) {
  const unique=new Map<string,{city:string;country:string;date:string}>();
  for(const show of shows) {
    const date=String(show.showDate || '').slice(0,10);
    const city=String(show.venueCity || '').trim(),country=String(show.venueCountry || '').trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date<today || !city || !country || /^tbd$/i.test(city)) continue;
    if (['cancelled','canceled'].includes(String(show.status||'').toLowerCase())) continue;
    if (['off_day','travel_day'].includes(String(show.showType||'').toLowerCase())) continue;
    const key=city.toLowerCase()+'|'+country.toLowerCase();
    const existing=unique.get(key);
    if (!existing || date<existing.date) unique.set(key,{city,country,date});
  }
  return [...unique.values()].sort((a,b)=>a.date.localeCompare(b.date) || a.city.localeCompare(b.city));
}
