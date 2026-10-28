'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ServerOff } from 'lucide-react';

const API_TIMEOUT_MS = 20_000;

export function ApiAvailabilityProvider({ children }: { children: React.ReactNode }) {
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const raw = input instanceof Request ? input.url : String(input);
      const url = new URL(raw, window.location.href);
      const method = (init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      const isSafeRequest = method === 'GET' || method === 'HEAD';
      // Do not abort writes: on a slow mobile connection the server may finish a
      // mutation after the client times out, so a retry could create duplicates.
      if (url.origin !== window.location.origin || !url.pathname.startsWith('/api/') || init.signal || !isSafeRequest) return originalFetch(input, init);
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(new DOMException('SceneGen API timed out', 'TimeoutError')), API_TIMEOUT_MS);
      try {
        const response = await originalFetch(input, { ...init, signal: controller.signal });
        if ([502, 503, 504].includes(response.status)) setUnavailable(true);
        else if (response.ok) setUnavailable(false);
        return response;
      } catch (error) {
        if (!navigator.onLine || controller.signal.aborted) setUnavailable(true);
        throw error;
      } finally { window.clearTimeout(timer); }
    };
    return () => { window.fetch = originalFetch; };
  }, []);

  return <>{unavailable && navigator.onLine && <div role="alert" className="fixed inset-x-0 top-0 z-[210] flex min-h-11 items-center justify-center gap-2 bg-red-700 px-3 text-center text-xs font-black text-white shadow-lg"><ServerOff size={15}/>SceneGen’s server is unavailable. <Link href="/unavailable" className="underline">See recovery options</Link></div>}<div className={unavailable && typeof navigator !== 'undefined' && navigator.onLine ? 'pt-11' : undefined}>{children}</div></>;
}
