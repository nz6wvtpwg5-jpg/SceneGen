import type {DiscoveryResult} from '@/lib/promoterDiscoveryView';
export function publicDiscoveryCities(results:DiscoveryResult[]) {
  const grouped=new Map<string,{city:string;country:string;count:number}>();
  for(const result of results) {
    const seen=new Set<string>();
    for(const place of result.knownLocations || []) {
      const city=place.city?.trim(),country=place.country?.trim();
      if (!city || !country) continue;
      const key=city.toLowerCase()+'|'+country.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      const prev=grouped.get(key);
      if(prev) prev.count++;
      else grouped.set(key,{city,country,count:1});
    }
  }
  return [...grouped.values()].sort((a,b)=>a.country.localeCompare(b.country)||a.city.localeCompare(b.city));
}
