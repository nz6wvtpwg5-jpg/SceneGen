import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

async function forward(request: NextRequest, method: 'GET' | 'POST') {
  const authorization = request.headers.get('authorization');
  if (!authorization) return NextResponse.json({ error: { message: 'Sign in required' } }, { status: 401 });
  try {
    const response = await fetch(`${getBackendUrl()}/api/booking-agent/profile`, {
      method, headers: { Authorization: authorization, 'Content-Type': 'application/json' },
      body: method === 'POST' ? JSON.stringify(await request.json()) : undefined, cache: 'no-store',
    });
    const text = await response.text();
    let data: unknown;
    try { data = JSON.parse(text); } catch {
      data = { error: { message: 'Unable to update the booking-agent profile right now' } };
    }
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ error: { message: 'Unable to reach the booking-agent profile service' } }, { status: 502 });
  }
}

export const GET = (request: NextRequest) => forward(request, 'GET');
export const POST = (request: NextRequest) => forward(request, 'POST');
