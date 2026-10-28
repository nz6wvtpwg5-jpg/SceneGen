'use client';

import Link from 'next/link';
import { Bell, Building2, ChevronDown, LogOut, Search, UserRound } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';
import { SceneGenWordmark } from '@/components/brand/scene-gen-mark';
import { useNotifications } from '@/hooks/useNotifications';
import { useProfileStore } from '@/store/useProfileStore';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AppHeader() {
  const { data: session, status } = useSession();
  const { unreadCount } = useNotifications(10);
  const { activeProfile } = useProfileStore();
  const isAuthenticated = status === 'authenticated' && Boolean(session?.user?.id);
  const accountName = session?.user?.name?.trim() || session?.user?.email || 'Account';
  const headerName = activeProfile?.name?.trim() || accountName;
  const initial = headerName[0]?.toUpperCase() || 'A';
  // Fail closed while profile permissions are unavailable. The API remains the
  // authority; missing client state must never reveal workspace administration.
  const canManageWorkspace = Boolean(activeProfile?.membershipRole && ['owner', 'admin'].includes(activeProfile.membershipRole));

  return (
    <header className="hidden h-[72px] w-full items-center border-b border-white/10 bg-[#11100e] text-[#f6f1e7] sm:flex">
      <Link href="/dashboard" className="flex h-full w-[264px] shrink-0 items-center border-r border-white/10 px-6" aria-label="SceneGen dashboard">
        <SceneGenWordmark />
      </Link>

      <div className="flex min-w-0 flex-1 items-center justify-between gap-5 px-5 md:px-7">
        <div className="hidden min-w-0 items-center gap-3 md:flex">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/35">Workspace</span>
          <span className="h-4 w-px bg-white/10" />
          <span className="truncate text-sm font-semibold text-white/85">{activeProfile?.name || 'Your live operation'}</span>
          {activeProfile?.entityType && <span className="rounded-full border border-white/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">{activeProfile.entityType}</span>}
        </div>

        <button type="button" className="hidden w-full max-w-[340px] items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-left text-sm text-white/40 transition hover:border-white/20 hover:bg-white/[0.07] lg:flex">
          <Search className="h-4 w-4" />
          <span className="flex-1">Search SceneGen</span>
          <span className="rounded border border-white/10 px-1.5 py-0.5 text-[10px]">⌘ K</span>
        </button>

        <div className="ml-auto flex items-center gap-2">
          {isAuthenticated ? (
            <>
              <Link href="/notifications" className="relative grid h-10 w-10 place-items-center rounded-full border border-white/10 text-white/60 transition hover:bg-white/10 hover:text-white" aria-label={`${unreadCount} unread notifications`}>
                <Bell className="h-[18px] w-[18px]" />
                {unreadCount > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-[17px] rounded-full bg-[#ff5a36] px-1 text-center text-[9px] font-bold leading-[17px] text-white">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </Link>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className="flex items-center gap-2 rounded-full border border-white/10 py-1.5 pl-1.5 pr-3 text-left transition hover:bg-white/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a36]" aria-label={`Open account menu for ${headerName}`}>
                    <span className="grid h-7 w-7 place-items-center rounded-full bg-[#f6f1e7] text-xs font-black text-[#11100e]">{initial}</span>
                    <span className="hidden max-w-28 truncate text-xs font-semibold text-white/75 sm:block">{headerName}</span>
                    <ChevronDown className="hidden h-3.5 w-3.5 text-white/35 sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" sideOffset={10} className="w-64 rounded-xl border border-black/10 bg-[#fbf8f1] p-2 text-[#171713] shadow-[0_18px_50px_rgba(0,0,0,.24)]">
                  <DropdownMenuLabel className="px-3 py-2">
                    <span className="block truncate text-sm font-black">{accountName}</span>
                    {session?.user?.email && <span className="mt-1 block truncate text-xs font-normal text-[#777168]">{session.user.email}</span>}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="my-1 bg-black/10" />
                  {canManageWorkspace && <DropdownMenuItem asChild className="min-h-11 cursor-pointer rounded-lg px-3 font-bold focus:bg-[#eee6da]">
                    <Link href="/settings?tab=workspace"><Building2 className="mr-3 h-4 w-4 text-[#e74829]" />Workspace settings</Link>
                  </DropdownMenuItem>}
                  <DropdownMenuItem asChild className="min-h-11 cursor-pointer rounded-lg px-3 font-bold focus:bg-[#eee6da]">
                    <Link href="/settings?tab=personal"><UserRound className="mr-3 h-4 w-4 text-[#e74829]" />Personal settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="my-1 bg-black/10" />
                  <DropdownMenuItem onSelect={() => void signOut({ callbackUrl: '/' })} className="min-h-11 cursor-pointer rounded-lg px-3 font-bold text-[#a53723] focus:bg-[#f6e2dc] focus:text-[#8f2d1e]">
                    <LogOut className="mr-3 h-4 w-4" />Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : status === 'loading' ? (
            <span className="text-xs uppercase tracking-[0.16em] text-white/40">Loading</span>
          ) : (
            <Link href="/login" className="rounded-full bg-[#ff5a36] px-5 py-2 text-sm font-bold text-white">Sign in</Link>
          )}
        </div>
      </div>
    </header>
  );
}
