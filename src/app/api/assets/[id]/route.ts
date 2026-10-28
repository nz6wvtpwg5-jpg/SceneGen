import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const authorization = request.headers.get('authorization');
  if (!authorization) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const response = await fetch(`${getBackendUrl()}/api/assets/${encodeURIComponent(id)}`, {
    headers: { Authorization: authorization }, cache: 'no-store'
  });
  if (!response.ok) return NextResponse.json({ error: 'Asset not found' }, { status: response.status });
  return new NextResponse(await response.arrayBuffer(), {
    status: 200,
    headers: {
      'Content-Type': response.headers.get('content-type') || 'application/octet-stream',
      'Content-Disposition': response.headers.get('content-disposition') || 'inline',
      'Cache-Control': 'private, max-age=300'
    }
  });
}
