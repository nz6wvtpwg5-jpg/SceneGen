'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bell, Check, CheckCheck, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useNotifications, type SceneGenNotification } from '@/hooks/useNotifications';

type NotificationView = 'unread' | 'all';

function isToday(value: string) {
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear()
    && date.getMonth() === today.getMonth()
    && date.getDate() === today.getDate();
}

function notificationTime(value: string) {
  const date = new Date(value);
  return isToday(value)
    ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString([], { day: 'numeric', month: 'short', year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric' });
}

export default function NotificationsPage() {
  const { notifications, unreadCount, isLoading, refresh, markRead } = useNotifications(100);
  const [view, setView] = useState<NotificationView>('unread');
  const [workingId, setWorkingId] = useState<string | null>(null);
  const visible = useMemo(() => view === 'unread' ? notifications.filter((item) => !item.read) : notifications, [notifications, view]);
  const today = visible.filter((item) => isToday(item.createdAt));
  const earlier = visible.filter((item) => !isToday(item.createdAt));

  async function safely(action: () => Promise<void>, id: string) {
    if (workingId) return;
    setWorkingId(id);
    try { await action(); }
    catch (caught) {
      console.error('Notification update failed:', caught);
      toast.error('Could not update notifications. Check your connection and try again.');
    } finally { setWorkingId(null); }
  }

  return <main className="scene-page min-h-[calc(100dvh-5rem)] pb-28 md:pb-8">
    <header className="flex flex-col gap-5 border-b border-black/10 pb-6 sm:flex-row sm:items-end sm:justify-between sm:pb-8">
      <div><p className="scene-kicker">Recent signals</p><h1 className="scene-title">Notifications</h1><p className="scene-copy">Changes, approvals and updates that need your attention.</p></div>
      <div className="grid grid-cols-[3rem_1fr] gap-2 sm:flex">
        <Button aria-label="Refresh notifications" variant="outline" disabled={isLoading} onClick={() => void safely(refresh, 'refresh')} className="min-h-12 px-0 sm:px-4"><RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /><span className="hidden sm:ml-2 sm:inline">Refresh</span></Button>
        {unreadCount > 0 && <Button variant="secondary" disabled={Boolean(workingId)} onClick={() => void safely(() => markRead(), 'all')} className="min-h-12"><CheckCheck className="mr-2 h-4 w-4" />Mark all read</Button>}
      </div>
    </header>

    <div className="mt-5 grid grid-cols-2 rounded-xl bg-[#e5ddd1] p-1" role="tablist" aria-label="Notification filters">
      <button type="button" role="tab" aria-selected={view === 'unread'} onClick={() => setView('unread')} className={`min-h-12 rounded-lg px-4 text-sm font-black ${view === 'unread' ? 'bg-[#171713] text-white shadow-sm' : 'text-[#686258]'}`}>Unread ({unreadCount})</button>
      <button type="button" role="tab" aria-selected={view === 'all'} onClick={() => setView('all')} className={`min-h-12 rounded-lg px-4 text-sm font-black ${view === 'all' ? 'bg-[#171713] text-white shadow-sm' : 'text-[#686258]'}`}>All ({notifications.length})</button>
    </div>

    {isLoading && notifications.length === 0 ? <div className="mt-6 space-y-3">{[0, 1, 2].map((item) => <div key={item} className="h-28 animate-pulse rounded-xl bg-[#e5ddd1]" />)}</div>
      : visible.length === 0 ? <div className="scene-panel mt-6 rounded-[22px] px-6 py-16 text-center"><Bell className="mx-auto mb-5 h-8 w-8 text-[#ff5a36]" /><p className="text-2xl font-black tracking-[-0.03em]">{view === 'unread' ? 'You’re all caught up.' : 'Nothing needs your attention.'}</p><p className="mt-2 text-sm text-text-secondary">{view === 'unread' ? 'New activity will appear here as it happens.' : 'Your workspace activity will land here.'}</p></div>
      : <div className="mt-6 space-y-8">
        {today.length > 0 && <NotificationGroup title="Today" notifications={today} workingId={workingId} onMarkRead={(notification) => safely(() => markRead(notification.id), notification.id)} />}
        {earlier.length > 0 && <NotificationGroup title="Earlier" notifications={earlier} workingId={workingId} onMarkRead={(notification) => safely(() => markRead(notification.id), notification.id)} />}
      </div>}
  </main>;
}

function NotificationGroup({ title, notifications, workingId, onMarkRead }: { title: string; notifications: SceneGenNotification[]; workingId: string | null; onMarkRead: (notification: SceneGenNotification) => Promise<void> }) {
  return <section><h2 className="mb-3 text-sm font-black uppercase tracking-[.16em] text-[#777168]">{title}</h2><div className="space-y-3">{notifications.map((notification) => <article key={notification.id} className={`overflow-hidden rounded-xl border shadow-sm ${notification.read ? 'border-black/10 bg-[#fffaf2]' : 'border-[#ff5a36]/35 bg-white'}`}>
    <div className="flex gap-3 p-4 sm:p-5">
      <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${notification.read ? 'bg-[#eee6da] text-[#777168]' : 'bg-[#ff5a36]/10 text-[#e54525]'}`}>{notification.read ? <Check size={18} /> : <Bell size={18} />}</div>
      <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-3"><h3 className="font-black leading-5 text-foreground">{notification.title}</h3><time className="shrink-0 text-xs font-semibold text-text-muted">{notificationTime(notification.createdAt)}</time></div><p className="mt-1.5 text-sm leading-5 text-text-secondary">{notification.message}</p></div>
    </div>
    <div className="grid grid-cols-2 border-t border-black/10 bg-[#fffaf2]">
      {!notification.read ? <button type="button" disabled={Boolean(workingId)} onClick={() => void onMarkRead(notification)} className="min-h-12 border-r border-black/10 px-3 text-sm font-bold text-[#686258] disabled:opacity-50">{workingId === notification.id ? 'Updating…' : 'Mark read'}</button> : <span className="flex min-h-12 items-center justify-center border-r border-black/10 px-3 text-sm text-[#8a847a]">Read</span>}
      {notification.actionUrl ? <Link className="flex min-h-12 items-center justify-center gap-2 px-3 text-sm font-black text-[#e54525]" href={notification.actionUrl} onClick={() => { if (!notification.read) void onMarkRead(notification); }}>Open <ArrowRight size={16} /></Link> : <span className="flex min-h-12 items-center justify-center px-3 text-sm text-[#8a847a]">No action needed</span>}
    </div>
  </article>)}</div></section>;
}
