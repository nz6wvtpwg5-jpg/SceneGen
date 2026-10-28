import { NextRequest, NextResponse } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const BACKEND_URL = getBackendUrl();

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; payoutId: string } }
) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId');

    if (!entityId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'entityId is required' } },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${BACKEND_URL}/api/budgets/${params.id}/payouts/${params.payoutId}?entityId=${entityId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': authorization,
          'Content-Type': 'application/json',
          'X-Entity-Id': entityId,
        },
      }
    );

    if (!response.ok && response.status !== 204) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Error deleting payout:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to delete payout' } },
      { status: 500 }
    );
  }
}
