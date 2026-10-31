'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { BookOpen, CalendarDays, LogOut, Map, MoreHorizontal, Settings, ShoppingBag, Users, X } from 'lucide-react';
import { useProfileStore } from '@/store/useProfileStore';
import { useConfirmDialog } from '@/components/ui/confirm-dialog-provider';
import { clearOfflineDataForUser } from '@/lib/offline-road-pack';
import { clearEntityId } from '@/lib/entity';
import { useMessageCounts } from '@/hooks/useMessageCounts';

const primary = [
  { label: 'Today', href: '/dashboard', icon: CalendarDays },
  { label: 'Shows', href: '/shows', icon: BookOpen },
  { label: 'Tours', href: '/tours', icon: Map },
  { label: 'Contacts', href: '/contacts', icon: Users },
];

const secondary = [
  { label: 'Offers', href: '/show-proposals' },
  { label: 'Notifications', href: '/notifications' },
  { label: 'Messages', href: '/messages' },
  { label: 'Merch', href: '/merch' },
  { label: 'Bookkeeping', href: '/bookkeeping' },
];

export function MobileNavigation() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { activeProfile, setActiveProfile } = useProfileStore();
  const confirmDialog = useConfirmDialog();
  const { total: unreadMessages } = useMessageCounts();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const moreRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const sheetRef = useRef<HTMLElement>(null);
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const provisionalAgent = activeProfile?.membershipRole === 'provisional_agent';
  const canMessage=['owner','admin'].includes(activeProfile?.membershipRole||'');
  const visiblePrimary = provisionalAgent ? primary.filter((item) => item.href !== '/contacts') : primary;
  const visibleSecondary = provisionalAgent ? secondary.filter((item) => ['/show-proposals', '/notifications'].includes(item.href)) : secondary.filter(item=>item.href!=='/messages'||canMessage);

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        moreRef.current?.focus();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...(sheetRef.current?.querySelectorAll<HTMLElement>('a[href],button:not([disabled])') || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    window.addEventListener('keydown', handleKey);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', handleKey); };
  }, [open]);

  const dismiss = () => {
    setOpen(false);
    moreRef.current?.focus();
  };

  async function logout() {
    // The More sheet sits above ordinary dialogs on mobile. Close it first so
    // the confirmation cannot open invisibly behind the sheet.
    setOpen(false);
    const confirmed = await confirmDialog({
      title: 'Sign out of SceneGen?',
      description: 'This removes saved workspace and offline day-sheet data from this device.',
      confirmLabel: 'Sign out',
      tone: 'destructive',
    });
    if (!confirmed) return;
    setSigningOut(true);
    try {
      if (session?.user?.id) await clearOfflineDataForUser(session.user.id).catch(() => undefined);
      try { setActiveProfile(null); } catch { /* Session termination remains authoritative. */ }
      try { clearEntityId(); } catch { /* Session termination remains authoritative. */ }
      await signOut({ redirect: false });
      window.location.replace('/app');
    } catch {
      setSigningOut(false);
      // Even if NextAuth's client helper cannot complete its redirect in the
      // native web view, visiting the server sign-out endpoint lets the user
      // retry instead of leaving a dead button.
      window.location.assign('/api/auth/signout?callbackUrl=%2Fapp');
    }
  }

  return <>
    <nav className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-[60] grid grid-cols-5 border-t border-black/10 bg-[#fbf8f1]/95 px-1 shadow-[0_-12px_32px_rgba(22,20,16,0.12)] backdrop-blur-xl sm:hidden" aria-label="Primary navigation">
      {visiblePrimary.map(({ label, href, icon: Icon }) => { const active = isActive(href); return <Link key={href} href={href} aria-current={active ? 'page' : undefined} className={`flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-black ${active ? 'text-[#e74829]' : 'text-[#6f695f] active:bg-black/5'}`}><Icon className="h-5 w-5" strokeWidth={active ? 2.6 : 2} /><span>{label}</span></Link>; })}
      <button ref={moreRef} type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="mobile-more-menu" className={`flex min-h-[62px] flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-black ${open || visibleSecondary.some((item) => isActive(item.href)) || isActive('/settings') ? 'text-[#e74829]' : 'text-[#6f695f] active:bg-black/5'}`}><MoreHorizontal className="h-5 w-5" /><span>More</span></button>
    </nav>

    {open && <div className="fixed inset-0 z-[70] sm:hidden" role="dialog" aria-modal="true" aria-labelledby="mobile-more-title">
      <button type="button" className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" onClick={dismiss} aria-label="Close menu" />
      <section ref={sheetRef} id="mobile-more-menu" className="mobile-safe-bottom absolute inset-x-0 bottom-0 max-h-[82dvh] overflow-y-auto rounded-t-[28px] bg-[#fbf8f1] p-5 pb-4 shadow-2xl">
        <div className="mx-auto mb-5 h-1 w-10 rounded-full bg-black/15" />
        <div className="flex items-start justify-between gap-4"><div><p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#ff5a36]">Workspace</p><h2 id="mobile-more-title" className="mt-1 text-2xl font-black">{activeProfile?.name || 'SceneGen'}</h2><p className="mt-1 text-sm text-[#716b61]">More tools and account settings</p></div><button ref={closeRef} type="button" onClick={dismiss} className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-black/10" aria-label="Close menu"><X className="h-5 w-5" /></button></div>
        <div className="mt-6 divide-y divide-black/10 border-y border-black/10">{visibleSecondary.map(({ label, href }) => <Link key={href} href={href} className="flex min-h-14 items-center justify-between py-3 text-base font-black"><span>{label}{href==='/messages' && unreadMessages>0 ? ` (${unreadMessages})` : ''}</span><span aria-hidden="true" className="text-[#ff5a36]">-&gt;</span></Link>)}</div>
        <Link href={provisionalAgent ? "/settings?tab=personal" : "/settings"} className="mt-5 flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#11100e] px-5 text-sm font-black text-white"><Settings className="h-4 w-4" />{provisionalAgent ? 'Personal settings' : 'Account and workspace'}</Link>
        <button type="button" disabled={signingOut} onClick={() => void logout()} className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full border border-[#c94d39]/35 px-5 text-sm font-black text-[#a53723] disabled:opacity-50"><LogOut className="h-4 w-4" />{signingOut ? 'Signing out…' : 'Sign out'}</button>
        <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-black/35"><ShoppingBag className="mr-1 inline h-3 w-3" />Road tools, always within reach</p>
      </section>
    </div>}
  </>;
}
