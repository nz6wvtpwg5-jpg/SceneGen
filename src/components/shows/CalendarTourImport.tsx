'use client';
import {useEffect,useMemo,useState} from 'react';
import {getEntityId} from '@/lib/entity';
import type {Tour} from '@/types/tour';

type Event={id?:string;summary:string;location?:string;start:{dateTime:string};end:{dateTime:string};source?:string};
type Row={sourceId:string;date:string;summary:string;venueName:string;city:string;country:string;startTime:string;selected:boolean};
type Result={tour?:{id:string;name:string};showCount?:number;error?:{message?:string}};

function reviewedDates(event:Event):Row[]{
  if(!event.id||event.source==='scenegen'||!event.start?.dateTime)return [];
  const begin=event.start.dateTime.slice(0,10);
  const finish=event.end?.dateTime?.slice(0,10)||begin;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(begin)||!/^\d{4}-\d{2}-\d{2}$/.test(finish))return [];
  const from=new Date(begin+'T12:00:00Z'),to=new Date(finish+'T12:00:00Z');
  if(!Number.isFinite(from.getTime())||!Number.isFinite(to.getTime()))return [];
  const allDay=!event.start.dateTime.includes('T');
  const duration=Date.parse(event.end?.dateTime||'')-Date.parse(event.start.dateTime);
  const end=allDay?new Date(to.getTime()-86400000):duration>0&&duration<2*86400000?from:to;
  const dates:string[]=[];
  for(let d=new Date(from);d<=end&&dates.length<40;d.setUTCDate(d.getUTCDate()+1))dates.push(d.toISOString().slice(0,10));
  if(!dates.length)dates.push(begin);
  const location=(event.location||'').split(',').map(v=>v.trim()).filter(Boolean);
  return dates.map(date=>({sourceId:event.id!,date,summary:event.summary||'Untitled event',
    venueName:location[0]||'',city:location.length>2?location[location.length-3]:'',
    country:location.length>1?location[location.length-1]:'',
    startTime:/T\d{2}:\d{2}/.test(event.start.dateTime)?event.start.dateTime.split('T')[1].slice(0,5):'20:00',
    selected:false}));
}

export default function CalendarTourImport({events,onClose,onSaved}:{events:Event[];onClose:()=>void;onSaved:(result:{tourId:string;name:string;showCount:number})=>void}){
 const initial=useMemo(()=>events.flatMap(reviewedDates),[events]);
 const [rows,setRows]=useState<Row[]>(initial);
 const [tours,setTours]=useState<Tour[]>([]);
 const [mode,setMode]=useState<'new'|'existing'>('new');
 const [tourId,setTourId]=useState('');
 const [name,setName]=useState('');
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState('');
 const [loadingTours,setLoadingTours]=useState(true);
 const chosen=rows.filter(r=>r.selected);
 useEffect(()=>{let active=true;const load=async()=>{
   try{
     const id=getEntityId();
     const response=await fetch('/api/tours',{headers:{...(id?{'X-Entity-Id':id}:{})},credentials:'include'});
     if(!response.ok)throw new Error('Unable to load your tours');
     const result=await response.json();
     if(active)setTours(Array.isArray(result.tours)?result.tours:[]);
   }catch(e){if(active)setError(e instanceof Error?e.message:'Unable to load your tours');}
   finally{if(active)setLoadingTours(false);}
 };void load();return()=>{active=false;};},[]);
 const update=(index:number,patch:Partial<Row>)=>setRows(old=>old.map((r,i)=>i===index?{...r,...patch}:r));
 async function save(){
  if(!chosen.length){setError('Select at least one performance.');return;}
  if(mode==='new'&&!name.trim()){setError('Enter a tour name.');return;}
  if(mode==='existing'&&!tourId){setError('Choose the existing tour.');return;}
  if(chosen.some(r=>!r.venueName.trim()||!r.city.trim()||!r.country.trim()||!r.startTime)){
   setError('Confirm venue, city, country and time for every selected show.');return;
  }
  setBusy(true);setError('');
  try{
   const id=getEntityId();
   if(!id)throw new Error('Choose your SceneGen workspace before importing.');
   const response=await fetch('/api/tours/import-calendar',{method:'POST',credentials:'include',
    headers:{'Content-Type':'application/json','X-Entity-Id':id},
    body:JSON.stringify({...(mode==='existing'?{tourId}:{name:name.trim()}),
      events:chosen.map(({selected,summary,...rest})=>rest)})});
   const data:Result=await response.json();
   if(!response.ok||!data.tour?.id)throw new Error(data.error?.message||'Unable to save tour and shows.');
   onSaved({tourId:data.tour.id,name:data.tour.name,showCount:data.showCount||chosen.length});
  }catch(e){setError(e instanceof Error?e.message:'Unable to save tour.');}
  finally{setBusy(false);}
 }
 return <div role="dialog" aria-modal="true" aria-label="Import calendar shows into a tour" className="fixed inset-0 z-[130] overflow-y-auto bg-black/70 p-3 sm:p-8">
  <div className="mx-auto max-w-4xl rounded-2xl bg-[#f7f0e5] p-5 text-[#171713] shadow-2xl sm:p-8">
   <div className="flex items-start justify-between gap-4"><div><h2 className="text-2xl font-black">Add calendar dates to a tour</h2><p className="mt-1 text-sm text-[#6d685f]">Review performances before importing. Nothing is saved until you confirm.</p></div><button type="button" onClick={onClose} disabled={busy} className="rounded-full border px-4 py-2">Close</button></div>
   <div className="mt-6 flex flex-wrap gap-5">
    <label className="flex items-center gap-2"><input type="radio" checked={mode==='new'} onChange={()=>{setMode('new');setError('');}}/> Create new tour</label>
    <label className="flex items-center gap-2"><input type="radio" checked={mode==='existing'} onChange={()=>{setMode('existing');setError('');}}/> Add to existing tour</label>
   </div>
   {mode==='new'?<label className="mt-4 block text-sm font-bold">Tour name<input className="mt-2 h-11 w-full rounded-lg border bg-white px-3" value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. CONAN December 2026" maxLength={160}/></label>
   :<label className="mt-4 block text-sm font-bold">Choose tour<select value={tourId} onChange={e=>setTourId(e.target.value)} className="mt-2 h-11 w-full rounded-lg border bg-white px-3" disabled={loadingTours}><option value="">{loadingTours?'Loading tours…':'Select a tour…'}</option>{tours.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
   <p className="my-4 text-sm font-bold">{chosen.length} selected from {rows.length} calendar dates</p>
   {rows.length===0?<p className="rounded-lg border bg-white p-4 text-sm">No Google Calendar events loaded for the displayed month. Close this window, navigate to the month with the performances and try again.</p>:null}
   <div className="max-h-[50vh] space-y-3 overflow-y-auto">{rows.map((row,i)=><section key={row.sourceId+'|'+row.date} className="rounded-lg border bg-white p-4">
    <label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={row.selected} disabled={busy} onChange={e=>update(i,{selected:e.target.checked})}/>{row.date} — {row.summary}</label>
    {row.selected&&<div className="mt-3 grid gap-2 sm:grid-cols-4">{(['venueName','city','country','startTime'] as const).map(k=><label key={k} className="text-xs font-bold capitalize">{k==='venueName'?'Venue':k==='startTime'?'Show time':k}<input required className="mt-1 h-10 w-full rounded border px-2" value={row[k]} type={k==='startTime'?'time':'text'} disabled={busy} onChange={e=>update(i,{[k]:e.target.value})}/></label>)}</div>}
   </section>)}</div>
   {error&&<p className="mt-3 text-sm font-bold text-red-700" role="alert">{error}</p>}
   <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" className="rounded-full border px-5 py-3" disabled={busy} onClick={onClose}>Cancel</button><button type="button" disabled={busy||!chosen.length} className="rounded-full bg-[#ff5a36] px-6 py-3 font-bold text-white disabled:opacity-50" onClick={save}>{busy?'Saving…':(mode==='existing'?'Add ':'Create tour with ')+chosen.length+' show'+(chosen.length===1?'':'s')}</button></div>
  </div>
 </div>;
}
