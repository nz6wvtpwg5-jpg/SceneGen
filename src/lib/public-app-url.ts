export function publicAppUrl(fallbackOrigin: string) {
  const production = process.env.NODE_ENV === 'production';
  const candidate = process.env.APP_URL || process.env.NEXTAUTH_URL
    || (production ? 'https://scenegen-web.onrender.com' : fallbackOrigin);
  if (candidate.includes(',')) throw new Error('APP_URL must contain exactly one URL');
  let url: URL;
  try { url = new URL(candidate); } catch { throw new Error('APP_URL is not a valid URL'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('APP_URL must use HTTP or HTTPS');
  if (production && (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '::1'].includes(url.hostname))) {
    throw new Error('APP_URL must use a public HTTPS origin in production');
  }
  return url.origin;
}
