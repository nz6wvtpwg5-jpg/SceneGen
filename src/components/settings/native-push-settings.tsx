'use client';

import { BellRing, Check } from 'lucide-react';
import { useNativePush } from '@/components/providers/native-push-provider';

export function NativePushSettings() {
  const { state, enable } = useNativePush();
  if (state === 'unavailable') return null;
  const enabled = state === 'enabled';
  const working = state === 'checking';
  return <div className="rounded-lg border border-black/10 bg-white p-4">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#ff5a36]/10 text-[#e54525]"><BellRing size={18} /></span>
      <div className="min-w-0 flex-1"><strong className="text-sm">iPhone push notifications</strong><p className="mt-1 text-xs leading-5 text-[#777168]">Get day-sheet changes, approvals and show offers when SceneGen is closed.</p></div>
    </div>
    {state === 'denied' && <p className="mt-3 text-xs font-semibold text-amber-700">Notifications are blocked. Open iPhone Settings → Notifications → SceneGen to enable them.</p>}
    {state === 'error' && <p className="mt-3 text-xs font-semibold text-red-700">SceneGen could not register this iPhone. Check your connection and try again.</p>}
    <button type="button" disabled={enabled || working || state === 'denied'} onClick={() => void enable()} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-[#171713] px-5 text-sm font-black text-white disabled:opacity-55 sm:w-auto">
      {enabled ? <><Check size={16} />Notifications enabled</> : state === 'denied' ? 'Enable in iPhone Settings' : working ? 'Checking…' : 'Enable notifications'}
    </button>
  </div>;
}
