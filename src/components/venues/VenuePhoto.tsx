'use client';
import {useEffect,useState} from 'react';
import {getEntityId} from '@/lib/entity';
export default function VenuePhoto({venueId,className=''}:{venueId:string;className?:string}) {
 const [url,setUrl]=useState('');
 const [credit,setCredit]=useState('');
 useEffect(()=>{
  if(!venueId)return;
  const c=new AbortController();let objectUrl='';
  const id=getEntityId();
  fetch('/api/venues/'+encodeURIComponent(venueId)+'/photo',{headers:id?{'X-Entity-Id':id}:{},signal:c.signal})
    .then(async r=>{if(!r.ok)return null;const by=r.headers.get('x-photo-attribution');if(by)setCredit(decodeURIComponent(by));return r.blob();}).then(blob=>{
      if(blob&&!c.signal.aborted){objectUrl=URL.createObjectURL(blob);setUrl(objectUrl);}
    }).catch(()=>{});
  return ()=>{c.abort();if(objectUrl)URL.revokeObjectURL(objectUrl);setUrl('');setCredit('');};
 },[venueId]);
 return <div className={'relative overflow-hidden bg-[#e9e1d5] '+className}>
   {url?<><img src={url} alt="Venue photograph from Google Places" loading="lazy" className="h-full w-full object-cover"/><span className="absolute bottom-1 right-1 rounded bg-black/65 px-2 py-1 text-[10px] text-white">{credit ? `Photo: ${credit} · Google` : "Google Places"}</span></>:
    <div className="flex h-full min-h-20 items-center justify-center text-xs font-bold text-[#777168]">Venue</div>}
 </div>;
}
