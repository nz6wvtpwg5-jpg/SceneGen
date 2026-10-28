'use client';

import { SessionProvider, useSession } from 'next-auth/react';
import { ReactNode, useEffect, useState } from 'react';
import { useProfileStore } from '@/store/useProfileStore';
import { NativePushProvider } from '@/components/providers/native-push-provider';
import { usePathname } from 'next/navigation';

function WorkspaceSessionGuard({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const bindUser = useProfileStore((state) => state.bindUser);
  const storedUserId = useProfileStore((state) => state.ownerUserId);
  const [online, setOnline] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [preparedIdentity, setPreparedIdentity] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  useEffect(() => {
    if (status === 'loading') return;
    let cancelled = false;
    const prepare = async () => {
      await useProfileStore.persist.rehydrate();
      if (cancelled) return;
      const savedUserId = useProfileStore.getState().ownerUserId;
      if (!online && status === 'unauthenticated' && savedUserId) {
        setPreparedIdentity(savedUserId);
        return;
      }
      bindUser(status === 'authenticated' ? session?.user?.id || null : null);
      setPreparedIdentity(status === 'authenticated' ? session?.user?.id || null : null);
    };
    void prepare();
    return () => { cancelled = true; };
  }, [bindUser, online, session?.user?.id, status]);

  useEffect(() => {
    if (status !== 'unauthenticated' || !online) return;
    const publicPaths = ['/', '/login', '/app', '/forgot-password', '/reset-password',
      '/verify-email', '/resend-verification', '/terms', '/privacy', '/offline',
      '/onboarding', '/unavailable'];
    if (publicPaths.includes(pathname) || pathname.startsWith('/offline/') ||
      pathname.startsWith('/day-sheet-invite/') || pathname.startsWith('/external-day-sheets') ||
      pathname.startsWith('/collaborator-access') || pathname.startsWith('/agent-band-invite/')) return;
    const callbackUrl = encodeURIComponent(pathname + window.location.search);
    window.location.replace('/login?callbackUrl=' + callbackUrl);
  }, [status, online, pathname]);

  const currentIdentity = status === 'authenticated' ? session?.user?.id || null : !online ? storedUserId : null;
  if (status === 'loading' || preparedIdentity === undefined || preparedIdentity !== currentIdentity) return <div className="min-h-screen bg-[#f3ede3]" aria-label="Loading SceneGen" />;
  return children;
}

export function SessionProviderWrapper({ children }: { children: ReactNode }) {
  return <SessionProvider><WorkspaceSessionGuard><NativePushProvider>{children}</NativePushProvider></WorkspaceSessionGuard></SessionProvider>;
}
