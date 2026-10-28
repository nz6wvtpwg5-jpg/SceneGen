'use client';

import {useEffect,useMemo,useState} from 'react';
import {getEntityId} from '@/lib/entity';
import type {Tour} from '@/types/tour';

export type GoogleEvent={id?:string;summary:string;description?:string;location?:string;start:{dateTime:string};end:{dateTime:string};source?:string};
type Kind='show'|'off_day'|'travel_day';
type Entry={sourceId:string;date:string;summary:string;venueName:string;city:string;country:string;startTime:string;showType:Kind;selected:boolean};
type Saved={tour:{id:string;name:string}|null;showId:string|null;showCount:number};
type ErrorResponse={error?:{message?:string;code?:string;showId?:string;tourId?:string}};

function datePart(value:string){return (value||'').slice(0,10);}
function eventDates(event:GoogleEvent):Entry[]{
 if(!event.id||event.source==='scenegen')return [];
 const start=datePart(event.start.dateTime),end=datePart(event.end.dateTime);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start))return [];
 const from=new Date(start+'T12:00:00Z'),until=new Date((end||start)+'T12:00:00Z');
 if(!Number.isFinite(from.getTime())||!Number.isFinite(until.getTime()))return [];
 const allDay=!event.start.dateTime.includes('T');
 const duration=Date.parse(event.end.dateTime)-Date.parse(event.start.dateTime);
 const last=allDay?new Date(until.getTime()-86400000):duration>0&&duration<2*86400000?from:until;
 const parts=(event.location||'').split(',').map(s=>s.trim()).filter(Boolean);
 const dates:string[]=[];
 for(let d=new Date(from);d<=last&&dates.length<40;d.setUTCDate(d.getUTCDate()+1))dates.push(d.toISOString().slice(0,10));
 if(!dates.length)dates.push(start);
 const startTime=/T\d{2}:\d{2}/.test(event.start.dateTime)?event.start.dateTime.split('T')[1].slice(0,5):'20:00';
 return dates.map((date,i)=>({sourceId:event.id!,date,summary:event.summary||'Untitled calendar event',
  venueName:parts.length>2?parts[0]:'',city:parts.length>2?parts[parts.length-2]:'',
  country:parts.length>2?parts[parts.length-1]:'',startTime,showType:'show',selected:dates.length===1||i===0}));
}

export default function CalendarConversion({events,onClose,onSaved,existingDates=[]}:{events:GoogleEvent[];onClose:()=>void;onSaved:(result:Saved)=>void;existingDates?:Array<{id:string;showDate:string;venueName?:string;venueCity?:string;notes?:string}>}){
 const seed=useMemo(()=>events.flatMap(eventDates),[events]);
 const [rows,setRows]=useState<Entry[]>(seed);
 const [mode,setMode]=useState<'standalone'|'new'|'existing'>('standalone');
 const [name,setName]=useState('');
 const [tourId,setTourId]=useState('');
 const [tours,setTours]=useState<Tour[]>([]);
 const [busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const chosen=rows.filter(row=>row.selected&&!existingDates.some(s=>datePart(s.showDate)===row.date&&(s.notes?.includes('[Google Calendar event: '+row.sourceId+']')||(row.venueName&&row.city&&s.venueName?.trim().toLowerCase()===row.venueName.toLowerCase()&&s.venueCity?.trim().toLowerCase()===row.city.toLowerCase()))));
 useEffect(()=>{let mounted=true;(async()=>{try{
  const id=getEntityId();if(!id)throw new Error('Select a SceneGen workspace first.');
  const response=await fetch('/api/tours',{credentials:'include',headers:{'X-Entity-Id':id}});
  const json=await response.json();if(!response.ok)throw new Error(json.error?.message||'Unable to load tours.');
  if(mounted)setTours(Array.isArray(json.tours)?json.tours:[]);
 }catch(e){if(mounted)setError(e instanceof Error?e.message:'Unable to load tours.');}
 finally{if(mounted)setLoading(false);}})();return()=>{mounted=false;};},[]);
 const update=(index:number,patch:Partial<Entry>)=>setRows(list=>list.map((r,i)=>i===index?{...r,...patch}:r));
 const matches=(r:Entry)=>existingDates.find(s=>datePart(s.showDate)===r.date&&(
  s.notes?.includes('[Google Calendar event: '+r.sourceId+']')||
  (r.venueName&&r.city&&s.venueName?.trim().toLowerCase()===r.venueName.toLowerCase()&&s.venueCity?.trim().toLowerCase()===r.city.toLowerCase())));
 async function save(){
  if(busy)return;
  if(!chosen.length){setError('Select at least one date.');return;}
  if(mode==='new'&&!name.trim()){setError('Enter a tour name.');return;}
  if(mode==='existing'&&!tourId){setError('Select an existing tour.');return;}
  if(chosen.some(r=>!r.summary.trim()||!/^([01]\d|2[0-3]):[0-5]\d$/.test(r.startTime))){setError('Confirm the event description and time.');return;}
  const duplicate=chosen.find(matches);
  if(duplicate){setError('A matching '+duplicate.date+' entry is already in SceneGen. Open that show instead of importing twice.');return;}
  const id=getEntityId();if(!id){setError('Select a SceneGen workspace first.');return;}
  setBusy(true);setError('');
  try{
   const response=await fetch('/api/tours/import-calendar',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json','X-Entity-Id':id},
    body:JSON.stringify({mode,...(mode==='new'?{name:name.trim()}:mode==='existing'?{tourId}:{}),
     events:chosen.map(({selected,...event})=>event)})});
   const result=(await response.json()) as Saved&ErrorResponse;
   if(!response.ok)throw new Error(result.error?.message||'Could not save these dates.');
   onSaved(result);
  }catch(e){setError(e instanceof Error?e.message:'Could not save these dates.');}finally{setBusy(false);}
 }
 return <div role="dialog" aria-modal="true" aria-label="Add Google Calendar dates to SceneGen" className="fixed inset-0 z-[150] overflow-y-auto bg-black/75 p-3 sm:p-8">
  <div className="mx-auto max-w-3xl rounded-3xl bg-[#f7f0e5] p-5 text-[#171713] shadow-2xl sm:p-8">
   <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.15em] text-[#d44f33]">Google Calendar → SceneGen</p><h2 className="mt-2 text-2xl font-black">Add to SceneGen</h2><p className="mt-1 text-sm text-[#645f57]">Your Google event stays unchanged. Only the dates you select are added to CONAN's workspace.</p></div><button type="button" className="rounded-full border px-4 py-2" onClick={onClose} disabled={busy}>Close</button></div>
   <div className="mt-6 grid gap-2 sm:grid-cols-3">{([{id:'standalone',title:'Standalone',hint:'No tour'},{id:'existing',title:'Existing tour',hint:'Add to a tour'},{id:'new',title:'New tour',hint:'Create together'}] as const).map(option=><button key={option.id} type="button" onClick={()=>{setMode(option.id);setError('');}} disabled={busy} className={'rounded-xl border-2 p-3 text-left '+(mode===option.id?'border-[#ff5a36] bg-white':'border-[#ddd5c9]')}><span className="block font-bold">{option.title}</span><span className="text-xs text-[#716a62]">{option.hint}</span></button>)}</div>
   {mode==='new'&&<label className="mt-4 block text-sm font-bold">Tour name<input maxLength={160} autoFocus className="mt-2 h-12 w-full rounded-xl border bg-white px-3" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. CONAN December 2026"/></label>}
   {mode==='existing'&&<label className="mt-4 block text-sm font-bold">Choose tour<select className="mt-2 h-12 w-full rounded-xl border bg-white px-3" value={tourId} disabled={loading} onChange={e=>setTourId(e.target.value)}><option value="">{loading?'Loading tours…':'Select a tour'}</option>{tours.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
   <div className="mt-6 flex items-center justify-between"><h3 className="font-bold">Review calendar dates</h3><span className="text-xs text-[#645f57]">{chosen.length} selected · {rows.length} available</span></div>
   {rows.length>1&&<p className="mt-1 text-xs text-[#645f57]">A multi-day event is not automatically a multi-show tour. Select each day you actually want.</p>}
   <div className="mt-3 max-h-[48vh] space-y-3 overflow-y-auto">{rows.map((row,i)=>{const existing=matches(row);return <section key={row.sourceId+'|'+row.date} className="rounded-xl border bg-white p-4">
    <label className="flex items-start gap-3 font-bold"><input type="checkbox" className="mt-1" checked={row.selected} disabled={busy||Boolean(existing)} onChange={e=>update(i,{selected:e.target.checked})}/><span>{row.date} — {row.summary}</span></label>
    {existing&&<p className="mt-2 text-xs font-bold text-amber-700">Already in SceneGen — not selectable</p>}
    {row.selected&&!existing&&<div className="mt-4 space-y-3">
     <label className="block text-xs font-bold">Date type<select className="mt-1 w-full rounded-lg border p-2" value={row.showType} onChange={e=>update(i,{showType:e.target.value as Kind})}><option value="show">Performance / show</option><option value="off_day">Off day / hold</option><option value="travel_day">Travel day</option></select></label>
     <div className="grid gap-2 sm:grid-cols-4"><label className="block text-xs font-bold">Venue<input className="mt-1 w-full rounded-lg border p-2" value={row.venueName} onChange={e=>update(i,{venueName:e.target.value})} placeholder="TBC"/></label><label className="block text-xs font-bold">City<input className="mt-1 w-full rounded-lg border p-2" value={row.city} onChange={e=>update(i,{city:e.target.value})} placeholder="TBC"/></label><label className="block text-xs font-bold">Country<input className="mt-1 w-full rounded-lg border p-2" value={row.country} onChange={e=>update(i,{country:e.target.value})} placeholder="TBC"/></label><label className="block text-xs font-bold">Time<input type="time" className="mt-1 w-full rounded-lg border p-2" value={row.startTime} onChange={e=>update(i,{startTime:e.target.value})}/></label></div>
     <label className="block text-xs font-bold">Calendar description<input className="mt-1 w-full rounded-lg border p-2" value={row.summary} onChange={e=>update(i,{summary:e.target.value})}/></label>
    </div>}
   </section>;})}</div>
   {error&&<p role="alert" className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-800">{error}</p>}
   <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" className="rounded-full border px-5 py-3" onClick={onClose} disabled={busy}>Cancel</button><button type="button" disabled={busy||chosen.length===0} onClick={save} className="rounded-full bg-[#ff5a36] px-6 py-3 font-bold text-white disabled:opacity-50">{busy?'Saving…':'Save '+chosen.length+' date'+(chosen.length===1?'':'s')+' to SceneGen'}</button></div>
  </div>
 </div>;
}
