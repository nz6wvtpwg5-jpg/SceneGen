'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useSession } from 'next-auth/react';
import { useProfileStore } from '@/store/useProfileStore';

type PushState = 'unavailable' | 'checking' | 'prompt' | 'enabled' | 'denied' | 'error';
type NativePushContextValue = { state: PushState; enable: () => Promise<void> };
const NativePushContext = createContext<NativePushContextValue>({ state: 'unavailable', enable: async () => undefined });

function safeDestination(value: unknown) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/notifications';
}

export function NativePushProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const entityId = useProfileStore((store) => store.activeProfile?.id);
  const [state, setState] = useState<PushState>('checking');
  const tokenRef = useRef<string | null>(null);

  const registerToken = useCallback(async (token: string) => {
    if (!entityId) return;
    const response = await fetch('/api/notification/devices', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Entity-Id': entityId },
      body: JSON.stringify({ token, platform: 'ios', environment: process.env.NEXT_PUBLIC_APNS_ENVIRONMENT === 'sandbox' ? 'sandbox' : 'production' })
    });
    if (!response.ok) throw new Error('Device registration failed');
    tokenRef.current = token;
    setState('enabled');
  }, [entityId]);

  const enable = useCallback(async () => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') return setState('unavailable');
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications');
      let permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') permission = await PushNotifications.requestPermissions();
      if (permission.receive !== 'granted') return setState('denied');
      setState('checking');
      await PushNotifications.register();
    } catch { setState('error'); }
  }, []);

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || Capacitor.getPlatform() !== 'ios') { setState('unavailable'); return; }
    if (status !== 'authenticated' || !entityId) {
      if (status === 'unauthenticated') {
        void import('@capacitor/push-notifications').then(({ PushNotifications }) => PushNotifications.unregister()).catch(() => undefined);
        tokenRef.current = null;
        setState('prompt');
      }
      return;
    }
    let active = true;
    let cleanup: (() => Promise<void>) | undefined;
    void import('@capacitor/push-notifications').then(async ({ PushNotifications }) => {
      if (!active) return;
      const listeners = await Promise.all([
        PushNotifications.addListener('registration', ({ value }) => { void registerToken(value).catch(() => setState('error')); }),
        PushNotifications.addListener('registrationError', () => setState('error')),
        PushNotifications.addListener('pushNotificationReceived', () => window.dispatchEvent(new Event('scenegen:push-notification'))),
        PushNotifications.addListener('pushNotificationActionPerformed', ({ notification }) => {
          window.location.assign(safeDestination(notification.data?.actionUrl));
        })
      ]);
      cleanup = async () => { await Promise.all(listeners.map((listener) => listener.remove())); };
      const permission = await PushNotifications.checkPermissions();
      if (permission.receive === 'granted') await PushNotifications.register();
      else setState(permission.receive === 'denied' ? 'denied' : 'prompt');
    }).catch(() => setState('error'));
    return () => { active = false; void cleanup?.(); };
  }, [entityId, registerToken, status]);

  const value = useMemo(() => ({ state, enable }), [enable, state]);
  return <NativePushContext.Provider value={value}>{children}</NativePushContext.Provider>;
}

export function useNativePush() { return useContext(NativePushContext); }
