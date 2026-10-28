import { NextRequest, NextResponse } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const BACKEND_URL = getBackendUrl();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const entityId = searchParams.get('entityId');
    const showId = searchParams.get('showId');
    const tourId = searchParams.get('tourId');
    const search = searchParams.get('search');

    if (!entityId) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'entityId is required' } },
        { status: 400 }
      );
    }

    // Build query string
    const params = new URLSearchParams();
    if (showId) params.append('showId', showId);
    if (tourId) params.append('tourId', tourId);
    if (search) params.append('search', search);

    const url = `${BACKEND_URL}/api/budgets?${params.toString()}`;

    // Forward the Authorization header from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-Entity-Id': entityId,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to fetch budgets' } },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { entityId, showId, tourId, budgetName, currency, notes, totalSales, totalExpenses } = body;

    console.log('📥 [API /api/budgets POST] Received:', { entityId, showId, tourId, budgetName, currency, notes, totalSales, totalExpenses });

    if (!entityId || !showId || !budgetName) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'entityId, showId, and budgetName are required' } },
        { status: 400 }
      );
    }

    const backendPayload = {
      showId,
      tourId,
      budgetName,
      currency,
      notes,
      totalSales: totalSales || 0,
      totalExpenses: totalExpenses || 0,
    };

    console.log('📤 [API /api/budgets POST] Sending to backend:', backendPayload);

    // Forward the Authorization header from the request
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const response = await fetch(`${BACKEND_URL}/api/budgets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
        'X-Entity-Id': entityId,
      },
      body: JSON.stringify(backendPayload),
    });

    const data = await response.json();

    console.log('📨 [API /api/budgets POST] Backend response:', data);

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error creating budget:', error);
    return NextResponse.json(
      { error: { code: 'SERVER_ERROR', message: 'Failed to create budget' } },
      { status: 500 }
    );
  }
}
