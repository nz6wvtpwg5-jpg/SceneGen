import { NextRequest, NextResponse } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const BACKEND_URL = getBackendUrl();

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const { entityId, memberId, memberName, amount, percentage, notes } = body;

    if (!entityId || !memberName || !amount) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'entityId, memberName, and amount are required' } },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/budgets/${params.id}/payouts`, {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json',
        'X-Entity-Id': entityId,
      },
      body: JSON.stringify({ memberId, memberName, amount, percentage, notes }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error adding payout:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to add payout' } },
      { status: 500 }
    );
  }
}
