import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
const secret = () => process.env.NEXTAUTH_SECRET || (() => { throw new Error('NEXTAUTH_SECRET is not configured'); })();
export function createCalendarState(userId: string) {
  const nonce = randomBytes(24).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ userId, nonce, expiresAt: Date.now() + 10 * 60 * 1000 })).toString('base64url');
  const signature = createHmac('sha256', secret()).update(payload).digest('base64url');
  return { state: `${payload}.${signature}`, nonce };
}
export function verifyCalendarState(state: string, expectedUserId: string, expectedNonce: string) {
  const parts = state.split('.');
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  if (!payload || !signature || !/^[A-Za-z0-9_-]+$/.test(signature)) return false;
  const expected = createHmac('sha256', secret()).update(payload).digest('base64url');
  if (Buffer.byteLength(expected) !== Buffer.byteLength(signature) || !timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return false;
  try {
    const value = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return value.userId === expectedUserId && value.nonce === expectedNonce &&
      typeof value.expiresAt === 'number' && value.expiresAt > Date.now();
  } catch { return false; }
}
