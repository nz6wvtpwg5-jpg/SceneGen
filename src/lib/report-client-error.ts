import { getEntityId } from '@/lib/entity';

export async function reportClientError(error: Error, route = typeof window === 'undefined' ? '' : window.location.pathname) {
  try {
    await fetch('/api/client-errors', {
      method: 'POST', keepalive: true,
      headers: { 'Content-Type': 'application/json', ...(getEntityId() ? { 'X-Entity-Id': getEntityId()! } : {}) },
      body: JSON.stringify({
        name: error.name, message: error.message.slice(0, 500), stack: error.stack?.slice(0, 4000),
        route: route.startsWith('/') ? route.slice(0, 500) : '', release: process.env.NEXT_PUBLIC_APP_RELEASE || 'unknown'
      }), signal: AbortSignal.timeout(8_000)
    });
  } catch { /* Reporting must never cause a second user-facing failure. */ }
}
