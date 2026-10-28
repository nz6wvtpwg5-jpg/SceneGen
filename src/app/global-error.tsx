'use client';

import { useEffect } from 'react';
import { reportClientError } from '@/lib/report-client-error';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { void reportClientError(error); }, [error]);
  return <html lang="en"><body style={{ margin: 0, background: '#11140f', color: '#f7f2e8', fontFamily: 'system-ui' }}><main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}><section style={{ maxWidth: 480, textAlign: 'center' }}><h1>SceneGen couldn’t open this screen.</h1><p style={{ color: '#b8b2a8', lineHeight: 1.6 }}>Your work has not been changed. Check your connection and try again.</p><button type="button" onClick={reset} style={{ minHeight: 48, border: 0, borderRadius: 999, padding: '0 24px', background: '#ff5a36', color: 'white', fontWeight: 800 }}>Try again</button></section></main></body></html>;
}
