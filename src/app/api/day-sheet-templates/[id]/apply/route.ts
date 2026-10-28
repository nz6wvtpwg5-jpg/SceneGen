import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { daySheetProxy } from '@/lib/daySheetProxy';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUILT_IN = /^builtin-(show|travel|festival|off)-day$/;

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!UUID.test(id) && !BUILT_IN.test(id)) return NextResponse.json({ error: { message: 'Invalid template ID' } }, { status: 400 });
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: { message: 'Invalid template application' } }, { status: 400 });
  }
  return daySheetProxy(request, `/day-sheet-templates/${encodeURIComponent(id)}/apply`, { method: 'POST', body: JSON.stringify(body) });
}
