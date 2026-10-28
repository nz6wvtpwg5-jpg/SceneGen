import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Use local backend
import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';

/**
 * GET /api/tours/[id]/shows
 * Fetch all shows for a specific tour
 * Updated: Added entityId query parameter
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authHeader = request.headers.get('authorization');
  const entityId = request.headers.get('x-entity-id');

  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Await params in Next.js 15
    const { id: tourId } = await params;

    // Build URL with both tourId and entityId as query params
    let apiUrl = `${API_BASE_URL}/shows?tourId=${tourId}`;
    if (entityId) {
      apiUrl += `&entityId=${entityId}`;
    }

    const headers: HeadersInit = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    };

    if (entityId) {
      headers['X-Entity-Id'] = entityId;
    }

    console.log(`📡 Fetching shows for tour ${tourId} from ${apiUrl}`);
    console.log(`   entityId: ${entityId}`);

    const response = await fetch(apiUrl, { headers });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return NextResponse.json({ error: errorText }, { status: response.status });
    }

    const data = await response.json();
    console.log(`✅ Fetched ${data.shows?.length || 0} shows for tour ${tourId}`);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching tour shows:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tour shows' },
      { status: 500 }
    );
  }
}
