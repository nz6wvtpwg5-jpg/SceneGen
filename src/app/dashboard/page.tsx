'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { signIn, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ArrowUpRight, CalendarDays, CheckCircle2, CircleAlert, Clock3,
  MapPin, Plus, Route, Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TrialExpiryBanner } from '@/components/trial/TrialExpiryBanner';
import { MobileTodayDashboard } from '@/components/dashboard/mobile-today-dashboard';
import { useNotifications } from '@/hooks/useNotifications';
import { useOnboardingRedirect } from '@/hooks/useOnboardingRedirect';
import { useProfileStore } from '@/store/useProfileStore';

type Entity = { id: string; name: string; entityType?: string; entity_type?: string; administratorId?: string; administrator_id?: string; membershipRole?: string; membership_role?: string };
type Show = { id: string; showDate?: string; date?: string; venueName?: string; venueAddress?: string; venueCity?: string; city?: string; venueCountry?: string; country?: string; status?: string; loadInTime?: string; soundCheckTime?: string; doorTime?: string; doorsTime?: string; showTime?: string; startTime?: string; endTime?: string; contactName?: string; contactPhone?: string; readinessPercentage?: number };
type Tour = { id: string; name?: string; status?: string; startDate?: string; endDate?: string; showCount?: number };
type Contact = { id: string; contactName?: string; contactType?: string; status?: string };

const arrayFrom = <T,>(data: unknown, key: string): T[] => {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object' && Array.isArray((data as Record<string, unknown>)[key])) return (data as Record<string, unknown>)[key] as T[];
  return [];
};

const displayDate = (value?: string, format: 'short' | 'long' = 'short') => {
  if (!value) return { day: '—', month: 'Unscheduled', full: 'Date not set' };
  const date = new Date(`${value.split('T')[0]}T12:00:00`);
  if (Number.isNaN(date.getTime())) return { day: '—', month: 'Unscheduled', full: 'Date not set' };
  return {
    day: new Intl.DateTimeFormat('en-GB', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(date).toUpperCase(),
    full: new Intl.DateTimeFormat('en-GB', format === 'long' ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short' }).format(date),
  };
};

export default function Dashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { isChecking } = useOnboardingRedirect();
  const { activeProfile, setActiveProfile } = useProfileStore();
  const { notifications, unreadCount } = useNotifications(6);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [entity, setEntity] = useState<Entity | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);

  useEffect(() => {
    if (status === 'loading' || isChecking) return;
    if (status !== 'authenticated' || !session?.user?.id) {
      setError('Your session has ended. Sign in again to reopen the workspace.');
      setLoading(false);
      return;
    }

    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        const entityResponse = await fetch('/api/user/entities', { cache: 'no-store' });
        if (!entityResponse.ok) throw new Error('The workspace could not be loaded.');
        const entities = await entityResponse.json();
        const current = Array.isArray(entities)
          ? (entities.find((candidate: Entity) => candidate.id === activeProfile?.id) || entities[0]) as Entity | undefined
          : undefined;
        if (!current) {
          if (!cancelled) { setEntity(null); setActiveProfile(null); }
          return;
        }
        const normalized: Entity = {
          ...current,
          entityType: current.entityType || current.entity_type,
          administratorId: current.administratorId || current.administrator_id,
          membershipRole: current.membershipRole || current.membership_role,
        };
        if (cancelled) return;
        setEntity(normalized);
        setActiveProfile(normalized as Parameters<typeof setActiveProfile>[0]);

        const headers = { 'X-Entity-Id': current.id };
        const get = async (url: string) => {
          const response = await fetch(url, { headers, cache: 'no-store' });
          return response.ok ? response.json() : null;
        };
        const [showData, tourData, contactData] = await Promise.all([
          get('/api/shows'), get('/api/tours'), get('/api/contacts'),
        ]);
        if (!cancelled) {
          setShows(arrayFrom<Show>(showData, 'shows'));
          setTours(arrayFrom<Tour>(tourData, 'tours'));
          setContacts(arrayFrom<Contact>(contactData, 'contacts'));
        }
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : 'The workspace could not be loaded.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [activeProfile?.id, isChecking, session?.user?.id, setActiveProfile, status]);

  const upcomingShows = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return shows.filter((show) => {
      const raw = show.showDate || show.date;
      return raw ? new Date(`${raw.split('T')[0]}T12:00:00`) >= start : false;
    }).sort((a, b) => String(a.showDate || a.date).localeCompare(String(b.showDate || b.date)));
  }, [shows]);

  const nextShow = upcomingShows[0];
  const activeTours = tours.filter((tour) => ['active', 'planning'].includes(String(tour.status || '').toLowerCase()));
  const acceptedContacts = contacts.filter((contact) => !contact.status || contact.status === 'accepted');
  const today = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());

  const actionItems = [
    !nextShow && { title: 'Add the next confirmed show', detail: 'Start the forward schedule', href: '/shows', priority: 'Now' },
    activeTours.length === 0 && { title: 'Build a tour route', detail: 'Group dates into one working itinerary', href: '/tours', priority: 'Setup' },
    acceptedContacts.length === 0 && { title: 'Add your working contacts', detail: 'Connect promoters, venues and crew', href: '/contacts', priority: 'Setup' },
    unreadCount > 0 && { title: `Read ${unreadCount} new ${unreadCount === 1 ? 'notification' : 'notifications'}`, detail: 'Keep the team aligned', href: '/notifications', priority: 'New' },
  ].filter(Boolean) as Array<{ title: string; detail: string; href: string; priority: string }>;

  if (loading || isChecking) return (
    <div className="grid min-h-full place-items-center bg-[#f2eee5] text-[#1a1916]">
      <div className="flex items-center gap-3 text-[11px] font-black uppercase tracking-[0.22em]"><span className="h-2 w-2 animate-pulse rounded-full bg-[#ff5a36]" />Opening live desk</div>
    </div>
  );

  if (error) return (
    <div className="grid min-h-full place-items-center bg-[#f2eee5] p-6 text-[#1a1916]">
      <div className="w-full max-w-md border border-[#d7d0c4] bg-[#fffaf1] p-8 shadow-[12px_12px_0_#1a1916]">
        <CircleAlert className="mb-6 h-8 w-8 text-[#ff5a36]" /><p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#ff5a36]">Workspace unavailable</p><h1 className="mt-3 text-3xl font-black tracking-[-0.04em]">SceneGen needs your attention.</h1><p className="mt-4 text-sm leading-6 text-[#70695f]">{error}</p>
        <Button onClick={() => router.push('/login?callbackUrl=%2Fdashboard')} className="mt-7 bg-[#1a1916] text-white hover:bg-[#302e29]">Sign in again</Button>
      </div>
    </div>
  );

  if (!entity) return (
    <div className="relative min-h-full overflow-hidden bg-[#f2eee5] p-7 text-[#1a1916] md:p-12">
      <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full border-[70px] border-[#ff5a36]/10" />
      <div className="relative mx-auto max-w-5xl"><TrialExpiryBanner /><p className="mt-10 text-[10px] font-black uppercase tracking-[0.24em] text-[#ff5a36]">SceneGen / New workspace</p><h1 className="mt-5 max-w-4xl text-5xl font-black leading-[.96] tracking-[-0.055em] md:text-7xl">Build the working record for every show.</h1><p className="mt-7 max-w-2xl text-lg leading-8 text-[#69635a]">One operational workspace for the artist, agent and promoter—dates, people, movements and money kept in agreement.</p><Button onClick={() => router.push('/onboarding')} className="mt-9 bg-[#ff5a36] px-6 text-white hover:bg-[#e84c2b]">Create workspace <ArrowUpRight className="ml-2 h-4 w-4" /></Button></div>
    </div>
  );

  const nextDate = displayDate(nextShow?.showDate || nextShow?.date, 'long');

  return (
    <div className="min-h-full bg-[#f2eee5] text-[#1a1916]">
      <TrialExpiryBanner />
      <MobileTodayDashboard entityName={entity.name} shows={upcomingShows} unreadCount={unreadCount} actionItems={actionItems} />
      <div className="mx-auto hidden max-w-[1560px] px-6 py-8 sm:block md:px-10 lg:px-12 lg:py-10">
        <header className="mb-8 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div><p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#ff5a36]">{entity.name} / Live desk</p><h1 className="mt-3 text-4xl font-black tracking-[-0.045em] md:text-5xl">Good to have the whole picture.</h1><p className="mt-3 flex items-center gap-2 text-sm font-medium text-[#756f65]"><Clock3 className="h-4 w-4" />{today}</p></div>
          <div className="flex gap-2"><Button variant="outline" onClick={() => router.push('/tours')} className="border-[#c9c1b4] bg-transparent text-[#1a1916] hover:bg-white"><Route className="mr-2 h-4 w-4" />New tour</Button><Button onClick={() => router.push('/shows')} className="bg-[#1a1916] text-white hover:bg-[#302e29]"><Plus className="mr-2 h-4 w-4" />Add show</Button></div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[1.55fr_.85fr]">
          <section className="relative min-h-[360px] overflow-hidden bg-[#ff5a36] p-7 text-white md:p-9">
            <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.35)_1px,transparent_1px)] [background-size:44px_44px]" />
            <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full border-[55px] border-white/10" />
            <div className="relative flex h-full flex-col">
              <div className="flex items-center justify-between"><p className="text-[10px] font-black uppercase tracking-[0.25em] text-white/75">Next movement</p><span className="rounded-full border border-white/30 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em]">{nextShow ? 'Confirmed schedule' : 'Schedule open'}</span></div>
              {nextShow ? <>
                <div className="mt-10 flex items-end gap-5"><span className="text-[92px] font-black leading-[.78] tracking-[-0.08em] md:text-[130px]">{nextDate.day}</span><span className="pb-2 text-2xl font-black">{nextDate.month}</span></div>
                <div className="mt-auto flex flex-col justify-between gap-6 border-t border-white/30 pt-6 md:flex-row md:items-end"><div><p className="text-3xl font-black tracking-[-0.035em]">{nextShow.venueCity || nextShow.city || 'City pending'}</p><p className="mt-2 flex items-center gap-2 text-sm text-white/75"><MapPin className="h-4 w-4" />{nextShow.venueName || 'Venue pending'}{(nextShow.venueCountry || nextShow.country) ? ` · ${nextShow.venueCountry || nextShow.country}` : ''}</p></div><Link href="/shows" className="flex items-center gap-2 text-sm font-black">Open show file <ArrowUpRight className="h-4 w-4" /></Link></div>
              </> : <>
                <div className="my-auto max-w-2xl"><p className="text-5xl font-black leading-[.95] tracking-[-0.05em] md:text-7xl">Nothing on deck.<br />Make the next move.</p><p className="mt-6 max-w-lg text-base leading-7 text-white/75">Add a confirmed date and SceneGen will turn it into the next operational focus for your team.</p></div>
                <button type="button" onClick={() => router.push('/shows')} className="relative flex w-fit items-center gap-3 border-b-2 border-white pb-2 text-sm font-black">Add the next show <ArrowRight className="h-4 w-4" /></button>
              </>}
            </div>
          </section>

          <section className="flex min-h-[360px] flex-col bg-[#1a1916] p-7 text-[#f8f3e9] md:p-8">
            <div className="flex items-center justify-between"><div><p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ff7756]">Action board</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">What needs moving</h2></div><span className="grid h-9 min-w-9 place-items-center rounded-full bg-white/10 text-sm font-black">{actionItems.length}</span></div>
            <div className="mt-7 flex-1 divide-y divide-white/10 border-y border-white/10">
              {actionItems.length ? actionItems.slice(0, 4).map((item) => <Link key={item.title} href={item.href} className="group flex items-center gap-4 py-4"><span className="w-10 text-[9px] font-black uppercase tracking-[0.14em] text-[#ff7756]">{item.priority}</span><span className="flex-1"><span className="block text-sm font-bold">{item.title}</span><span className="mt-1 block text-xs text-white/40">{item.detail}</span></span><ArrowUpRight className="h-4 w-4 text-white/30 group-hover:text-[#ff7756]" /></Link>) : <div className="flex h-full min-h-48 items-center justify-center text-center"><div><CheckCircle2 className="mx-auto h-8 w-8 text-[#78d39b]" /><p className="mt-4 font-bold">Nothing urgent</p><p className="mt-2 text-xs text-white/40">Your live desk is in good shape.</p></div></div>}
            </div>
          </section>
        </div>

        <section className="mt-5 grid border border-[#d4cdbf] bg-[#fffaf1] md:grid-cols-3">
          {[{ label: 'Shows ahead', value: upcomingShows.length, icon: CalendarDays, href: '/shows' }, { label: 'Tours moving', value: activeTours.length, icon: Route, href: '/tours' }, { label: 'Working contacts', value: acceptedContacts.length, icon: Users, href: '/contacts' }].map(({ label, value, icon: Icon, href }, index) => <Link href={href} key={label} className={`group flex min-h-32 items-center justify-between p-6 hover:bg-white ${index ? 'border-t border-[#d4cdbf] md:border-l md:border-t-0' : ''}`}><div><p className="text-4xl font-black tracking-[-0.05em]">{value}</p><p className="mt-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#7e776c]">{label}</p></div><Icon className="h-5 w-5 text-[#aaa194] group-hover:text-[#ff5a36]" /></Link>)}
        </section>

        <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.75fr]">
          <section className="border border-[#d4cdbf] bg-[#fffaf1]">
            <div className="flex items-end justify-between border-b border-[#d4cdbf] p-6"><div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#ff5a36]">Forward route</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">The next four stops</h2></div><Link href="/shows" className="text-xs font-black">Full schedule ↗</Link></div>
            {upcomingShows.length ? <div className="grid md:grid-cols-2 xl:grid-cols-4">{upcomingShows.slice(0, 4).map((show, index) => { const date = displayDate(show.showDate || show.date); return <Link href="/shows" key={show.id} className={`relative min-h-48 p-6 hover:bg-white ${index ? 'border-t border-[#d4cdbf] md:border-l md:border-t-0' : ''}`}><div className="absolute left-0 right-0 top-[74px] h-px bg-[#d4cdbf]" /><span className="relative z-10 block h-3 w-3 rounded-full border-[3px] border-[#fffaf1] bg-[#ff5a36] ring-1 ring-[#ff5a36]" /><p className="mt-8 text-2xl font-black">{date.day} <span className="text-sm">{date.month}</span></p><p className="mt-4 font-black">{show.venueCity || show.city || 'City pending'}</p><p className="mt-1 truncate text-xs text-[#81796e]">{show.venueName || 'Venue pending'}</p></Link>; })}</div> : <div className="flex min-h-56 flex-col items-start justify-center p-8"><Route className="h-7 w-7 text-[#ff5a36]" /><p className="mt-5 text-xl font-black">The route starts with one confirmed date.</p><p className="mt-2 text-sm text-[#776f64]">Add a show to begin the live itinerary.</p></div>}
          </section>

          <section className="border border-[#d4cdbf] bg-[#ded7ca]">
            <div className="border-b border-[#c9c1b4] p-6"><p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#786f64]">Recent signals</p><h2 className="mt-2 text-2xl font-black tracking-[-0.03em]">Team activity</h2></div>
            <div className="divide-y divide-[#c9c1b4]">
              {notifications.length ? notifications.slice(0, 4).map((note) => <Link href={note.actionUrl || '/notifications'} key={note.id} className="block p-5 hover:bg-[#e8e2d7]"><div className="flex gap-3"><span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${note.read ? 'bg-[#a49b8e]' : 'bg-[#ff5a36]'}`} /><div><p className="text-sm font-black">{note.title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#776f64]">{note.message}</p></div></div></Link>) : <div className="p-6"><p className="font-black">Quiet for now.</p><p className="mt-2 text-sm leading-6 text-[#776f64]">Updates from collaborators will collect here as the workspace becomes active.</p></div>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
