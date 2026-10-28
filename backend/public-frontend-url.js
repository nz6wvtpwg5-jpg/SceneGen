const clean = (value) => String(value || '').trim();

function publicFrontendUrl(environment = process.env) {
  const production = environment.NODE_ENV === 'production';
  for (const value of [environment.PUBLIC_FRONTEND_URL, environment.APP_URL, environment.FRONTEND_URL]) {
    const candidate = clean(value).replace(/\/+$/, '');
    if (!candidate || candidate.includes(',')) continue;
    try {
      const parsed = new URL(candidate);
      const local = ['localhost', '127.0.0.1', '::1'].includes(parsed.hostname.toLowerCase());
      if (!['http:', 'https:'].includes(parsed.protocol) || (production && (parsed.protocol !== 'https:' || local))) continue;
      return parsed.origin;
    } catch {
      continue;
    }
  }
  return production ? 'https://scenegen-web.onrender.com' : 'http://localhost:3000';
}

module.exports = { publicFrontendUrl };
