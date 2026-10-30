'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Bell, Building2, Check, FileText, ShieldCheck, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import DaySheetCollaborators from '@/components/manage/DaySheetCollaborators';
import ContactLocationPicker, { type ContactLocation } from '@/components/contacts/ContactLocationPicker';
import { DocumentUpload } from '@/components/profile/DocumentUpload';
import { useProfileStore } from '@/store/useProfileStore';
import { NativePushSettings } from '@/components/settings/native-push-settings';
import { DeleteAccountPanel } from '@/components/settings/delete-account-panel';
import { GenreTagPicker } from '@/components/settings/genre-tag-picker';
import { PromoterIntroductionsSettings } from '@/components/contacts/PromoterIntroductionsSettings';

type Tab = 'workspace' | 'documents' | 'access' | 'personal';
type Account = { id: string; email: string; name: string; timezone?: string | null; preferences?: { emailNotifications?: boolean; calendarReminders?: boolean } };
type WorkspaceAsset = { fileId: string; uri: string; fileName?: string | null; mimeType?: string | null };
type Workspace = { name: string; entityType?: string; city?: string | null; state?: string | null; country?: string | null; latitude?: number | null; longitude?: number | null; bio?: string | null; tags?: string[]; socialLinks?: Record<string, string>; videoUrl?: string | null; musicUrl?: string | null; assets?: WorkspaceAsset[] };

const tabs: Array<{ id: Tab; label: string; icon: typeof Building2 }> = [
  { id: 'workspace', label: 'Workspace', icon: Building2 },
  { id: 'documents', label: 'Documents', icon: FileText },
  { id: 'access', label: 'Access', icon: ShieldCheck },
  { id: 'personal', label: 'Personal', icon: UserRound },
];
const inputClass = 'h-12 w-full rounded-md border border-black/10 bg-white px-4 text-base outline-none focus:border-[#ff5a36] focus:ring-2 focus:ring-[#ff5a36]/15 disabled:bg-black/5 disabled:text-black/45 sm:text-sm';

export default function SettingsPage() {
  const { activeProfile, setActiveProfile } = useProfileStore();
  const canManageWorkspace = Boolean(activeProfile?.membershipRole && ['owner', 'admin'].includes(activeProfile.membershipRole));
  const availableTabs = canManageWorkspace ? tabs : tabs.filter((item) => item.id === 'personal');
  const [tab, setTab] = useState<Tab>(() => {
    const requested = typeof window === 'undefined' ? null : new URLSearchParams(window.location.search).get('tab');
    return requested === 'workspace' || requested === 'documents' || requested === 'access' || requested === 'personal' ? requested : 'workspace';
  });
  const activeTab: Tab = canManageWorkspace ? tab : 'personal';
  const activeProfileId = activeProfile?.id;
  const activeProfileType = activeProfile?.entityType;
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [workspaceBusy, setWorkspaceBusy] = useState(false);
  const [accountBusy, setAccountBusy] = useState(false);
  const [locationDirty, setLocationDirty] = useState(false);
  const [locationPending, setLocationPending] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!activeProfileId || !canManageWorkspace) return;
    const type = activeProfileType?.toLowerCase() === 'promoter' ? 'promoter' : 'artist';
    const response = await fetch(`/api/${type}/get/${encodeURIComponent(activeProfileId)}`, {
      cache: 'no-store',
      headers: { 'X-Entity-Id': activeProfileId },
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || body.error || 'Unable to load workspace settings');
    setWorkspace(body);
    setLocationDirty(false);
    setLocationPending(false);
  }, [activeProfileId, activeProfileType, canManageWorkspace]);

  useEffect(() => { void loadWorkspace().catch((error) => toast.error(error.message)); }, [loadWorkspace]);
  useEffect(() => { fetch('/api/user', { cache: 'no-store' }).then(async (response) => {
    const body = await response.json();
    if (!response.ok) throw new Error(body.error?.message || body.error || 'Unable to load personal settings');
    setAccount(body);
  }).catch((error) => toast.error(error.message)); }, []);

  function selectTab(next: Tab) {
    setTab(next);
    window.history.replaceState(null, '', `/settings?tab=${next}`);
  }

  function moveTab(current: Tab, direction: number) {
    const currentIndex = availableTabs.findIndex((item) => item.id === current);
    const next = availableTabs[(currentIndex + direction + availableTabs.length) % availableTabs.length].id;
    selectTab(next);
    document.getElementById(`settings-tab-${next}`)?.focus();
  }

  const updateLocation = useCallback((location: ContactLocation) => {
    setLocationDirty(true);
    setWorkspace((current) => current ? { ...current, city: location.city, state: location.region, country: location.country, latitude: location.latitude, longitude: location.longitude } : current);
  }, []);

  async function saveWorkspace() {
    if (!activeProfile?.id || !workspace || (locationDirty && locationPending) || !workspace.name.trim()) return;
    setWorkspaceBusy(true);
    try {
      const body: Record<string, unknown> = {
        name: workspace.name.trim(), city: workspace.city || '', state: workspace.state || '', country: workspace.country || '',
        bio: workspace.bio, tags: workspace.tags || [], socialLinks: workspace.socialLinks || {},
        videoUrl: workspace.videoUrl, musicUrl: workspace.musicUrl,
      };
      if (locationDirty) {
        body.latitude = workspace.latitude ?? null;
        body.longitude = workspace.longitude ?? null;
      }
      const response = await fetch(`/api/entities/${encodeURIComponent(activeProfile.id)}/profile`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Entity-Id': activeProfile.id }, body: JSON.stringify(body),
      });
      const saved = await response.json();
      if (!response.ok) throw new Error(saved.error?.message || saved.error || 'Unable to save workspace');
      setWorkspace((current) => current ? { ...current, ...saved } : saved);
      setLocationDirty(false);
      setLocationPending(false);
      setActiveProfile({ ...activeProfile, name: saved.name, city: saved.city || undefined, country: saved.country || undefined,
        latitude: saved.latitude == null ? undefined : Number(saved.latitude), longitude: saved.longitude == null ? undefined : Number(saved.longitude) });
      toast.success('Workspace settings saved');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save workspace'); }
    finally { setWorkspaceBusy(false); }
  }

  async function savePersonal() {
    if (!account?.name.trim()) return;
    setAccountBusy(true);
    try {
      const response = await fetch('/api/user', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: account.name, timezone: account.timezone, preferences: account.preferences }) });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error?.message || body.error || 'Unable to save personal settings');
      setAccount(body);
      toast.success('Personal settings saved');
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Unable to save personal settings'); }
    finally { setAccountBusy(false); }
  }

  return <main className="scene-page min-h-full overflow-y-auto pb-24 sm:pb-8">
    <div className="mx-auto max-w-6xl">
      <header className="border-b border-black/10 pb-6 sm:pb-7"><p className="scene-kicker">Workspace control</p><h1 className="scene-title">Settings</h1><p className="scene-copy">Manage your live operation, access and personal preferences in one place.</p></header>
      <div className="sticky top-16 z-20 -mx-4 mt-4 overflow-hidden border-y border-black/5 bg-[#f3ede3]/95 px-4 py-2 backdrop-blur sm:static sm:mx-0 sm:mt-6 sm:border-0 sm:bg-transparent sm:p-0" role="tablist" aria-label="Settings sections"><div className={`grid w-full min-w-0 gap-1 rounded-lg bg-[#e8e0d4] p-1 ${canManageWorkspace ? 'grid-cols-4' : 'grid-cols-1'}`}>{availableTabs.map(({ id, label, icon: Icon }) => <button key={id} id={`settings-tab-${id}`} type="button" role="tab" aria-selected={activeTab === id} aria-controls={`settings-panel-${id}`} tabIndex={activeTab === id ? 0 : -1} onClick={() => selectTab(id)} onKeyDown={(event) => { if (event.key === 'ArrowRight') moveTab(id, 1); if (event.key === 'ArrowLeft') moveTab(id, -1); }} className={`flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-1 text-[10px] font-black transition sm:min-h-12 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm ${activeTab === id ? 'bg-[#171713] text-white shadow-sm' : 'text-[#686258] hover:bg-white/60'}`}><Icon className="h-4 w-4 shrink-0 sm:h-[17px] sm:w-[17px]" />{label}</button>)}</div></div>

      {activeTab === 'workspace' && <section id="settings-panel-workspace" role="tabpanel" aria-labelledby="settings-tab-workspace" className="mt-5 rounded-lg border border-black/10 bg-[#fffaf2] shadow-sm">
        <SectionHeading kicker="Operational identity" title="Workspace" copy="The identity and home base used throughout routing, shows and shared operational records." />
        {workspace && activeProfile ? <div className="grid gap-7 border-t border-black/10 p-6 md:grid-cols-[minmax(0,1fr)_280px] md:p-8"><div className="space-y-6">
          <Field label="Workspace name"><input maxLength={255} value={workspace.name || ''} onChange={(event) => setWorkspace({ ...workspace, name: event.target.value })} className={inputClass} /></Field>
          <ContactLocationPicker location={{ city: workspace.city || '', region: workspace.state || '', country: workspace.country || '', latitude: workspace.latitude ?? null, longitude: workspace.longitude ?? null }} onChange={updateLocation} onPendingChange={(pending) => setLocationPending(locationDirty && pending)} />
          <Field label="Biography"><textarea rows={5} maxLength={5000} value={workspace.bio || ''} onChange={(event) => setWorkspace({ ...workspace, bio: event.target.value })} className="w-full rounded-md border border-black/10 bg-white p-4 text-base outline-none focus:border-[#ff5a36] sm:text-sm" /></Field>
          <Field label="Music genres"><GenreTagPicker tags={workspace.tags || []} onChange={(tags) => setWorkspace({ ...workspace, tags })} /></Field>
          <div className="grid gap-4 sm:grid-cols-2"><Field label="Video URL"><input value={workspace.videoUrl || ''} onChange={(event) => setWorkspace({ ...workspace, videoUrl: event.target.value })} className={inputClass} /></Field><Field label="Music URL"><input value={workspace.musicUrl || ''} onChange={(event) => setWorkspace({ ...workspace, musicUrl: event.target.value })} className={inputClass} /></Field></div>
          <div className="grid gap-4 sm:grid-cols-2">{['facebook', 'instagram', 'spotify', 'bandcamp'].map((network) => <Field key={network} label={`${network} URL`}><input value={workspace.socialLinks?.[network] || ''} onChange={(event) => setWorkspace({ ...workspace, socialLinks: { ...workspace.socialLinks, [network]: event.target.value } })} className={inputClass} /></Field>)}</div>
          <button type="button" disabled={workspaceBusy || (locationDirty && locationPending) || !workspace.name.trim()} onClick={() => void saveWorkspace()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ff5a36] px-6 text-sm font-black text-white disabled:opacity-45 sm:w-auto"><Check size={16} />{workspaceBusy ? 'Saving...' : 'Save workspace'}</button>
        {activeProfile.entityType?.toLowerCase()==='promoter' && <PromoterIntroductionsSettings key={activeProfile.id} entityId={activeProfile.id}/>}</div><aside className="h-fit rounded-lg bg-[#171713] p-5 text-white"><p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#ff7255]">Active workspace</p><p className="mt-4 text-2xl font-black">{workspace.name}</p><p className="mt-1 text-sm capitalize text-white/55">{activeProfile.entityType}</p><div className="mt-6 border-t border-white/10 pt-4 text-sm text-white/65"><p>{[workspace.city, workspace.state, workspace.country].filter(Boolean).join(', ') || 'Home base not supplied'}</p><p className="mt-2 text-xs text-white/40">Used for workspace identity and routing context.</p></div></aside></div> : <Loading copy="Loading workspace settings..." />}
      </section>}

      {activeTab === 'documents' && <section id="settings-panel-documents" role="tabpanel" aria-labelledby="settings-tab-documents" className="mt-5 rounded-lg border border-black/10 bg-[#fffaf2] shadow-sm">
        <SectionHeading kicker="Reusable tour files" title="Workspace documents" copy="Keep the current master versions here. Replacing a file updates the workspace copy without changing documents already attached to an individual show." />
        {workspace && activeProfile ? <div className="border-t border-black/10 p-6 md:p-8">
          <div className="grid gap-4 md:grid-cols-2">
            {[
              ['techRider', 'Technical rider', 'The current technical requirements for promoters and production teams.'],
              ['hospitalityRider', 'Hospitality rider', 'The current backstage and hospitality requirements.'],
              ['stagePlot', 'Stage plot', 'The latest stage layout and equipment positions.'],
              ['inputList', 'Input list', 'The current channel, microphone and patch requirements.'],
              ['pressKit', 'Press kit', 'A reusable information pack for promoters and media.'],
            ].map(([fileId, title, description]) => {
              const asset = workspace.assets?.find((candidate) => candidate.fileId === fileId);
              return <DocumentUpload key={fileId} entityId={activeProfile.id} fileId={fileId} title={title} description={description} existingFile={asset?.uri} existingFileName={asset?.fileName} onUploaded={(uri, fileName) => setWorkspace((current) => current ? { ...current, assets: [...(current.assets || []).filter((candidate) => candidate.fileId !== fileId), { fileId, uri, fileName }] } : current)} />;
            })}
          </div>
          <div className="mt-6 rounded-lg border border-black/10 bg-[#f0e9dd] p-4 text-xs leading-5 text-[#686258]"><strong className="text-[#171713]">Workspace masters are private.</strong> Day-sheet collaborators only receive documents deliberately assigned through a show&apos;s document vault.</div>
        </div> : <Loading copy="Loading workspace documents..." />}
      </section>}

      {activeTab === 'access' && <div id="settings-panel-access" role="tabpanel" aria-labelledby="settings-tab-access" className="mt-5"><div className="mb-5 rounded-lg border border-black/10 bg-[#fffaf2] p-5 sm:p-6"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff5a36]">Permissions</p><h2 className="mt-2 text-2xl font-black">External access</h2><p className="mt-2 text-sm text-[#686258]">Invite and control agents, promoters or crew without exposing the rest of the workspace.</p></div><DaySheetCollaborators /></div>}

      {activeTab === 'personal' && <section id="settings-panel-personal" role="tabpanel" aria-labelledby="settings-tab-personal" className="mt-5 rounded-lg border border-black/10 bg-[#fffaf2] shadow-sm"><SectionHeading kicker="Your SceneGen login" title="Personal settings" copy="These preferences belong to you, not to the active workspace." />{account ? <div className="space-y-6 border-t border-black/10 p-5 sm:p-6 md:p-8"><div className="grid gap-4 md:grid-cols-2"><Field label="Name"><input value={account.name || ''} maxLength={100} onChange={(event) => setAccount({ ...account, name: event.target.value })} className={inputClass} /></Field><Field label="Email"><input value={account.email} disabled className={inputClass} /></Field></div><Field label="Time zone"><input value={account.timezone || ''} placeholder="Europe/London" maxLength={100} onChange={(event) => setAccount({ ...account, timezone: event.target.value })} className={inputClass} /><p className="mt-2 text-xs text-[#777168]">Use an IANA time zone such as Europe/London or America/New_York.</p></Field><div className="grid gap-3 md:grid-cols-2"><Preference checked={account.preferences?.emailNotifications ?? true} onChange={(checked) => setAccount({ ...account, preferences: { ...account.preferences, emailNotifications: checked } })} title="Email notifications" copy="Receive operational updates by email." /><Preference checked={account.preferences?.calendarReminders ?? true} onChange={(checked) => setAccount({ ...account, preferences: { ...account.preferences, calendarReminders: checked } })} title="Calendar reminders" copy="Receive reminders for connected calendar activity." /></div><NativePushSettings /><button type="button" disabled={accountBusy || !account.name.trim()} onClick={() => void savePersonal()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#ff5a36] px-6 text-sm font-black text-white disabled:opacity-45 sm:w-auto"><Check size={16} />{accountBusy ? 'Saving...' : 'Save personal settings'}</button><DeleteAccountPanel /></div> : <Loading copy="Loading personal settings..." />}</section>}
    </div>
  </main>;
}

function SectionHeading({ kicker, title, copy }: { kicker: string; title: string; copy: string }) {
  return <div className="p-5 sm:p-6 md:p-8"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#ff5a36]">{kicker}</p><h2 className="mt-2 text-3xl font-black">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#686258]">{copy}</p></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-2 block text-[10px] font-black uppercase tracking-[0.16em] text-[#777168]">{label}</span>{children}</label>;
}

function Preference({ checked, onChange, title, copy }: { checked: boolean; onChange: (checked: boolean) => void; title: string; copy: string }) {
  return <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-black/10 bg-white p-4"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-0.5 h-5 w-5 accent-[#ff5a36]" /><span><strong className="flex items-center gap-2 text-sm"><Bell size={15} />{title}</strong><span className="mt-1 block text-xs text-[#777168]">{copy}</span></span></label>;
}

function Loading({ copy }: { copy: string }) {
  return <div className="border-t border-black/10 p-8 text-sm text-[#686258]">{copy}</div>;
}
