const DEFAULT_BACKEND_URL = 'http://localhost:3001';

export function getBackendUrl(): string {
  const value = process.env.BACKEND_URL
    || (process.env.BACKEND_HOSTPORT ? `http://${process.env.BACKEND_HOSTPORT}` : DEFAULT_BACKEND_URL);
  return value.replace(/\/$/, '');
}

export function getBackendHeaders(extra: HeadersInit = {}): Headers {
  const headers = new Headers(extra);
  const serviceToken = process.env.BACKEND_SERVICE_TOKEN;

  if (serviceToken) {
    headers.set('X-SceneGen-Service-Token', serviceToken);
  }

  return headers;
}
