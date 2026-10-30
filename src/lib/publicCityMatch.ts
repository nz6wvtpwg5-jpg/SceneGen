/** Reject geocoder results outside the requested PUBLIC city/country. */
export function publicCityMatch(requested: { city:string;country:string }, returned: {city:string;country:string}) {
  const normalize=(value:string)=>String(value||'').trim().toLowerCase().normalize('NFKD')
    .replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]/g,'');
  const aliases=(value:string)=> {
    const key=normalize(value);
    if(['usa','us','unitedstates','unitedstatesofamerica'].includes(key)) return 'unitedstates';
    if(['uk','gb','greatbritain','unitedkingdom'].includes(key)) return 'unitedkingdom';
    return key;
  };
  return Boolean(normalize(requested.city)) && normalize(requested.city)===normalize(returned.city)
    && Boolean(aliases(requested.country)) && aliases(requested.country)===aliases(returned.country);
}
