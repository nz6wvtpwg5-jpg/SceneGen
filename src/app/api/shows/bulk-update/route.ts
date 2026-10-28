import { NextRequest, NextResponse } from 'next/server';

// Use local backend
import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';
const USE_LOCAL_BACKEND = true;

/**
 * Bulk Update Shows API Route
 * Implements BUILD_PLAN Week 7, Task 7.1
 * POST /api/shows/bulk-update
 * Updates multiple shows at once (e.g., add to tour, remove from tour)
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { showIds, updates } = body;

    if (!showIds || !Array.isArray(showIds) || showIds.length === 0) {
      return NextResponse.json(
        { error: 'showIds array is required' },
        { status: 400 }
      );
    }

    if (!updates || typeof updates !== 'object') {
      return NextResponse.json(
        { error: 'updates object is required' },
        { status: 400 }
      );
    }

    const entityId = request.headers.get('x-entity-id');
    const apiUrl = `${API_BASE_URL}/shows/bulk-update`;

    const headers: HeadersInit = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    };

    if (USE_LOCAL_BACKEND) {
      // Local backend needs entity ID in header
      if (entityId) {
        headers['X-Entity-Id'] = entityId;
      }
    } else {
      // remote backend needs authorization and subscription key
    }

    const response = await fetch(apiUrl, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ showIds, updates })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Backend Error:', {
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      return NextResponse.json({ error: errorText || 'Failed to update shows' }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('[API Proxy] Bulk update shows error:', error);
    return NextResponse.json(
      { error: 'Failed to update shows' },
      { status: 500 }
    );
  }
}
