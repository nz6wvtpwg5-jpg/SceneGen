'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Clock3, Copy, Layers3, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getEntityId } from '@/lib/entity';
import { useConfirmDialog } from '@/components/ui/confirm-dialog-provider';

type TemplateKind = 'show_day' | 'travel_day' | 'festival_day' | 'off_day';
type ScheduleTemplate = {
  id: string; name: string; templateKind: TemplateKind; builtIn: boolean;
  loadInTime?: string | null; soundCheckTime?: string | null; doorTime?: string | null;
  startTime?: string | null; endTime?: string | null; events: Array<{ title: string }>;
};
type ShowOption = { id: string; showDate?: string; venueName?: string; venueCity?: string; showType?: string };
type Mode = 'fill_empty' | 'replace';

const kindLabels: Record<TemplateKind, string> = {
  show_day: 'Show day', travel_day: 'Travel day', festival_day: 'Festival day', off_day: 'Off day',
};

function message(data: unknown, fallback: string) {
  if (!data || typeof data !== 'object' || !('error' in data)) return fallback;
  const error = (data as { error?: unknown }).error;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return typeof error === 'string' ? error : fallback;
}

function showLabel(show: ShowOption) {
  const date = show.showDate ? new Date(`${show.showDate.slice(0, 10)}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'No date';
  const place = show.venueName || show.venueCity || (show.showType === 'off_day' ? 'Off day' : show.showType === 'travel_day' ? 'Travel day' : 'Venue TBC');
  return `${date} — ${place}`;
}

export default function ScheduleTemplates({ showId, canEdit, canManageTemplates, onChanged }: {
  showId: string; canEdit: boolean; canManageTemplates: boolean; onChanged: () => void;
}) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [shows, setShows] = useState<ShowOption[]>([]);
  const [recommendedKind, setRecommendedKind] = useState<TemplateKind>('show_day');
  const [selectedId, setSelectedId] = useState('');
  const [mode, setMode] = useState<Mode>('fill_empty');
  const [sourceShowId, setSourceShowId] = useState('');
  const [shiftMinutes, setShiftMinutes] = useState(30);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<TemplateKind>('show_day');
  const [saving, setSaving] = useState(false);
  const confirmDialog = useConfirmDialog();
  const entityId = getEntityId();
  const headers = useMemo<HeadersInit>(() => ({ ...(entityId ? { 'X-Entity-Id': entityId } : {}) }), [entityId]);

  const load = useCallback(async () => {
    const [templateResponse, showsResponse] = await Promise.all([
      fetch(`/api/day-sheet-templates?showId=${encodeURIComponent(showId)}`, { cache: 'no-store', credentials: 'include', headers }),
      fetch('/api/shows', { cache: 'no-store', credentials: 'include', headers }),
    ]);
    const templateData = await templateResponse.json();
    const showsData = await showsResponse.json();
    if (!templateResponse.ok) throw new Error(message(templateData, 'Templates could not be loaded'));
    const next = (templateData.templates || []) as ScheduleTemplate[];
    const recommended = (templateData.recommendedKind || 'show_day') as TemplateKind;
    setTemplates(next); setRecommendedKind(recommended); setKind(recommended);
    setSelectedId((current) => current || next.find((template) => template.templateKind === recommended)?.id || next[0]?.id || '');
    if (showsResponse.ok) setShows(((showsData.shows || []) as ShowOption[]).filter((show) => show.id !== showId));
  }, [headers, showId]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load().catch((error) => toast.error(error.message)), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function mutate(url: string, body: unknown, success: string) {
    setSaving(true);
    try {
      const response = await fetch(url, { method: 'POST', credentials: 'include', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(message(data, success));
      onChanged();
      window.dispatchEvent(new Event('scenegen:schedule-changed'));
      toast.success(success);
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Schedule could not be updated'); }
    finally { setSaving(false); }
  }

  async function applySelected() {
    const selected = templates.find((template) => template.id === selectedId);
    if (!selected) return;
    if (mode === 'replace') {
      const confirmed = await confirmDialog({
        title: `Replace this schedule with “${selected.name}”?`,
        description: 'Times supplied by the template will replace matching day-sheet times. Existing custom itinerary events will be removed and replaced. Venue, contacts, finances and show notes are never changed.',
        confirmLabel: 'Replace schedule', tone: 'destructive',
      });
      if (!confirmed) return;
    }
    await mutate(`/api/day-sheet-templates/${encodeURIComponent(selected.id)}/apply`, { showId, mode }, mode === 'replace' ? 'Schedule replaced' : 'Missing schedule details filled');
  }

  async function copySchedule() {
    if (!sourceShowId) return;
    if (mode === 'replace') {
      const source = shows.find((show) => show.id === sourceShowId);
      const confirmed = await confirmDialog({
        title: `Copy and replace from ${source ? showLabel(source) : 'the selected date'}?`,
        description: 'Supplied run-of-show times and custom events will replace this schedule. Show-specific venue, contact, financial and notes fields stay untouched.',
        confirmLabel: 'Copy and replace', tone: 'destructive',
      });
      if (!confirmed) return;
    }
    await mutate(`/api/shows/${encodeURIComponent(showId)}/schedule/copy`, { sourceShowId, mode }, 'Schedule copied');
  }

  async function shiftSchedule() {
    if (!Number.isInteger(shiftMinutes) || shiftMinutes === 0 || Math.abs(shiftMinutes) > 720) return toast.error('Enter a whole number from -720 to 720');
    const direction = shiftMinutes > 0 ? `${shiftMinutes} minutes later` : `${Math.abs(shiftMinutes)} minutes earlier`;
    const confirmed = await confirmDialog({
      title: `Move the whole schedule ${direction}?`,
      description: 'Run-of-show times and every custom itinerary event will move together, including events that cross midnight.',
      confirmLabel: 'Shift all times',
    });
    if (!confirmed) return;
    await mutate(`/api/shows/${encodeURIComponent(showId)}/schedule/shift`, { minutes: shiftMinutes }, `Schedule moved ${direction}`);
  }

  async function saveTemplate() {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const response = await fetch('/api/day-sheet-templates', { method: 'POST', credentials: 'include', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ showId, name: name.trim(), templateKind: kind }) });
      const data = await response.json();
      if (!response.ok) throw new Error(message(data, 'Template could not be saved'));
      setName(''); await load(); toast.success('Template saved for the organisation');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Template could not be saved'); }
    finally { setSaving(false); }
  }

  async function removeTemplate(template: ScheduleTemplate) {
    const confirmed = await confirmDialog({ title: `Delete “${template.name}”?`, description: 'This removes the template from the organisation library. Existing day sheets are unaffected.', confirmLabel: 'Delete template', tone: 'destructive' });
    if (!confirmed) return;
    const response = await fetch(`/api/day-sheet-templates/${encodeURIComponent(template.id)}`, { method: 'DELETE', credentials: 'include', headers });
    if (!response.ok) { const data = await response.json().catch(() => null); return toast.error(message(data, 'Template could not be deleted')); }
    if (selectedId === template.id) setSelectedId('');
    await load(); toast.success('Template deleted');
  }

  const selected = templates.find((template) => template.id === selectedId);

  return <section className="day-sheet-no-print rounded-[22px] border border-[#d8d0c3] bg-[#fffaf2] p-4 shadow-[0_18px_50px_rgba(45,37,24,.07)] sm:rounded-lg sm:p-6 md:p-7">
    <div className="flex items-start gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#171713] text-white"><Layers3 size={18} /></span><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#e74428]">Repeatable schedules</p><h2 className="mt-1 text-2xl font-black">Templates and time tools</h2><p className="mt-2 text-sm text-[#686258]">Reuse operational times and itinerary events. Venue, contacts, finances and show notes are always excluded.</p></div></div>

    <div className="mt-6 grid gap-4 lg:grid-cols-3">
      <div className="rounded-xl border border-[#ddd4c7] bg-white/65 p-4">
        <h3 className="font-black">Apply a template</h3>
        <label className="mt-3 block text-xs font-bold uppercase tracking-[.12em] text-[#625e55]">Organisation library<select value={selectedId} onChange={(event) => setSelectedId(event.target.value)} className="mt-2 h-12 w-full rounded-md border border-[#cfc6b9] bg-white px-3 text-base sm:text-sm">{templates.map((template) => <option key={template.id} value={template.id}>{template.name}{template.templateKind === recommendedKind ? ' — recommended' : ''}{template.builtIn ? ' — built in' : ''}</option>)}</select></label>
        {selected && <div className="mt-2 text-xs text-[#686258]"><p>{kindLabels[selected.templateKind]} · {selected.events?.length || 0} custom events{selected.builtIn ? ' · Starting point—review its times before use.' : ''}</p><p className="mt-1 font-semibold">{[
          selected.loadInTime && `Load-in ${selected.loadInTime.slice(0, 5)}`,
          selected.soundCheckTime && `Soundcheck ${selected.soundCheckTime.slice(0, 5)}`,
          selected.doorTime && `Doors ${selected.doorTime.slice(0, 5)}`,
          selected.startTime && `Stage ${selected.startTime.slice(0, 5)}`,
          selected.endTime && `Finish ${selected.endTime.slice(0, 5)}`,
        ].filter(Boolean).join(' · ') || 'No core show times; itinerary events only.'}</p></div>}
        <div className="mt-3 grid grid-cols-2 gap-2" role="group" aria-label="Template application mode"><button type="button" onClick={() => setMode('fill_empty')} className={`min-h-11 rounded-md border px-3 text-sm font-bold ${mode === 'fill_empty' ? 'border-[#171713] bg-[#171713] text-white' : 'border-[#cfc6b9]'}`}>Fill gaps</button><button type="button" onClick={() => setMode('replace')} className={`min-h-11 rounded-md border px-3 text-sm font-bold ${mode === 'replace' ? 'border-[#9b4939] bg-[#fff1ec] text-[#8b3021]' : 'border-[#cfc6b9]'}`}>Replace</button></div>
        <p className="mt-2 text-xs text-[#686258]">{mode === 'fill_empty' ? 'Keeps existing information and adds only missing times or events.' : 'Replaces supplied schedule times and custom events after confirmation.'}</p>
        <button type="button" disabled={!canEdit || !selectedId || saving} onClick={() => void applySelected()} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#e74428] px-4 font-black text-white disabled:opacity-40"><Layers3 size={16} /> Apply template</button>
      </div>

      <div className="rounded-xl border border-[#ddd4c7] bg-white/65 p-4">
        <h3 className="font-black">Copy another date</h3>
        <label className="mt-3 block text-xs font-bold uppercase tracking-[.12em] text-[#625e55]">Source day<select value={sourceShowId} onChange={(event) => setSourceShowId(event.target.value)} className="mt-2 h-12 w-full rounded-md border border-[#cfc6b9] bg-white px-3 text-base sm:text-sm"><option value="">Choose a day sheet</option>{shows.map((show) => <option key={show.id} value={show.id}>{showLabel(show)}</option>)}</select></label>
        <p className="mt-2 text-xs text-[#686258]">Uses the same {mode === 'fill_empty' ? 'fill-gaps' : 'replace'} mode selected alongside.</p>
        <button type="button" disabled={!canEdit || !sourceShowId || saving} onClick={() => void copySchedule()} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md border border-[#171713] px-4 font-black disabled:opacity-40"><Copy size={16} /> Copy schedule</button>

        <div className="mt-6 border-t border-[#ddd4c7] pt-5"><h3 className="font-black">Shift every time</h3><div className="mt-3 flex gap-2"><input aria-label="Minutes to shift; use a negative number for earlier" type="number" min={-720} max={720} step={5} value={shiftMinutes} onChange={(event) => setShiftMinutes(Number(event.target.value))} className="h-12 min-w-0 flex-1 rounded-md border border-[#cfc6b9] bg-white px-3 text-base"/><button type="button" disabled={!canEdit || saving || !shiftMinutes} onClick={() => void shiftSchedule()} className="flex min-h-12 items-center gap-2 rounded-md border border-[#171713] px-4 font-black disabled:opacity-40"><Clock3 size={16}/> Shift</button></div><p className="mt-2 text-xs text-[#686258]">Positive moves later; negative moves earlier.</p></div>
      </div>

      <div className="rounded-xl border border-[#ddd4c7] bg-white/65 p-4">
        <h3 className="font-black">Save this schedule</h3>
        <label className="mt-3 block text-xs font-bold uppercase tracking-[.12em] text-[#625e55]">Template name<input maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Headline club show" className="mt-2 h-12 w-full rounded-md border border-[#cfc6b9] bg-white px-3 text-base sm:text-sm" /></label>
        <label className="mt-3 block text-xs font-bold uppercase tracking-[.12em] text-[#625e55]">Day type<select value={kind} onChange={(event) => setKind(event.target.value as TemplateKind)} className="mt-2 h-12 w-full rounded-md border border-[#cfc6b9] bg-white px-3 text-base sm:text-sm">{Object.entries(kindLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <button type="button" disabled={!canEdit || !name.trim() || saving} onClick={() => void saveTemplate()} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-[#171713] px-4 font-black text-white disabled:opacity-40"><Save size={16}/> Save to library</button>
        {canManageTemplates && templates.some((template) => !template.builtIn) && <div className="mt-5 border-t border-[#ddd4c7] pt-4"><p className="text-xs font-black uppercase tracking-[.12em] text-[#625e55]">Custom templates</p><div className="mt-2 space-y-1">{templates.filter((template) => !template.builtIn).map((template) => <div key={template.id} className="flex min-h-11 items-center justify-between gap-2"><span className="min-w-0 truncate text-sm font-semibold">{template.name}</span><button type="button" onClick={() => void removeTemplate(template)} className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-[#9b4939] hover:bg-[#fff1ec]" aria-label={`Delete ${template.name}`}><Trash2 size={16}/></button></div>)}</div></div>}
      </div>
    </div>
    {!canEdit && <p className="mt-4 rounded-md bg-[#f2ebe0] p-3 text-sm text-[#686258]">You can view the organisation template library, but this membership is read-only.</p>}
  </section>;
}
