import { NextRequest, NextResponse } from 'next/server';
import { getBackendUrl } from '@/lib/backend';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tourId } = await params;
    const authHeader = request.headers.get('authorization');
    const entityId = request.headers.get('x-entity-id');

    console.log('🎯 [Next.js API] Calculate distances endpoint hit:', {
      tourId,
      hasAuthHeader: !!authHeader,
      entityId,
    });

    if (!authHeader) {
      console.error('❌ [Next.js API] No authorization header');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Forward the request to the backend
    const backendUrl = `${getBackendUrl()}/api`;
    const fullUrl = `${backendUrl}/tours/${tourId}/calculate-distances`;

    console.log('📡 [Next.js API] Forwarding to backend:', fullUrl);

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-Entity-Id': entityId || '',
      },
    });

    console.log('📨 [Next.js API] Backend response status:', response.status);

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ [Next.js API] Backend returned error:', data);
      return NextResponse.json(data, { status: response.status });
    }

    console.log('✅ [Next.js API] Success:', data);
    return NextResponse.json(data);
  } catch (error) {
    console.error('❌ [Next.js API] Error calculating distances:', error);
    return NextResponse.json(
      { error: 'Failed to calculate distances' },
      { status: 500 }
    );
  }
}
