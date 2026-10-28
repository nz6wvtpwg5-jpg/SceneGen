'use client';

import Link from 'next/link';
import { Bell } from 'lucide-react';
import { SceneGenMark } from '@/components/brand/scene-gen-mark';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfileStore } from '@/store/useProfileStore';

export function MobileHeader() {
  const { unreadCount } = useNotifications(10);
  const { activeProfile } = useProfileStore();

  return <header className="mobile-safe-top flex min-h-[64px] items-center justify-between border-b border-white/10 bg-[#11100e] px-4 text-[#f6f1e7] sm:hidden">
    <Link href="/dashboard" className="flex min-w-0 items-center gap-3" aria-label="SceneGen Today">
      <SceneGenMark className="h-9 w-9 shrink-0" />
      <span className="min-w-0"><span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#ff7756]">SceneGen</span><span className="block max-w-[13rem] truncate text-sm font-bold">{activeProfile?.name || 'Live operations'}</span></span>
    </Link>
    <Link href="/notifications" className="relative grid h-12 w-12 shrink-0 place-items-center rounded-full text-white/70 active:bg-white/10" aria-label={`${unreadCount} unread notifications`}>
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && <span className="absolute right-1 top-1 min-w-[18px] rounded-full bg-[#ff5a36] px-1 text-center text-[9px] font-black leading-[18px] text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
    </Link>
  </header>;
}
