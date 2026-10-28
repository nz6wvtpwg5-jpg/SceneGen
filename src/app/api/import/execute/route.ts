import { NextRequest, NextResponse } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const BACKEND_URL = getBackendUrl();

/**
 * POST /api/import/execute
 * Execute bulk import of shows, budgets, and line items
 */
export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization');
    if (!authorization) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await request.json();
    const { entityId, shows, budgets, tour } = body;

    if (!entityId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'entityId is required' } },
        { status: 400 }
      );
    }

    if (!shows || !Array.isArray(shows) || shows.length === 0) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'shows array is required' } },
        { status: 400 }
      );
    }

    console.log('🚀 Starting bulk import:', {
      entityId,
      showCount: shows.length,
      budgetCount: budgets?.length || 0,
      tour: tour?.name || tour?.id,
    });

    // Call backend import endpoint
    const response = await fetch(`${BACKEND_URL}/api/import/execute`, {
      method: 'POST',
      headers: {
        'Authorization': authorization,
        'Content-Type': 'application/json',
        'X-Entity-Id': entityId,
      },
      body: JSON.stringify({
        entityId,
        shows,
        budgets,
        tour,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => null);
      console.error('❌ Import failed:', error);
      return NextResponse.json(
        error?.error?.message
          ? error
          : {
              error: {
                code: 'IMPORT_FAILED',
                message: 'SceneGen could not complete this import. No changes were saved. Please try again.'
              }
            },
        { status: response.status }
      );
    }

    const result = await response.json();
    console.log('✅ Import completed:', result);

    return NextResponse.json(result, { status: 200 });

  } catch (error) {
    console.error('❌ Import error:', error);
    return NextResponse.json(
      {
        error: {
          code: 'SERVER_ERROR',
          message: 'SceneGen could not reach the import service. No changes were saved. Please try again.'
        }
      },
      { status: 500 }
    );
  }
}
