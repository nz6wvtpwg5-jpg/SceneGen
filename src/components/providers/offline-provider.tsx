'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { CloudOff } from 'lucide-react';
import { OfflineRoadPackSync } from '@/components/providers/offline-road-pack-sync';

type OfflineContextValue = { online: boolean; lastOnlineAt: Date | null };
const OfflineContext = createContext<OfflineContextValue>({ online: true, lastOnlineAt: null });

export function useOfflineStatus() { return useContext(OfflineContext); }

export function OfflineProvider({ children }: { children: React.ReactNode }) {
  const [online, setOnline] = useState(true);
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => {
      const next = navigator.onLine;
      setOnline(next);
      if (next) setLastOnlineAt(new Date());
    };
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);

  const context = useMemo(() => ({ online, lastOnlineAt }), [online, lastOnlineAt]);
  return <OfflineContext.Provider value={context}>
    <OfflineRoadPackSync online={online} />
    {!online && <div role="status" className="fixed inset-x-0 top-0 z-[200] flex min-h-10 items-center justify-center gap-2 bg-[#d98225] px-4 text-center text-xs font-black text-white shadow-lg"><CloudOff className="h-4 w-4" />Offline — showing saved information where available <a href="/offline" className="rounded border border-white/40 bg-white/10 px-2 py-1 hover:bg-white/20">Open saved sheets</a></div>}
    <div className={!online ? 'pt-10' : undefined}>{children}</div>
  </OfflineContext.Provider>;
}
