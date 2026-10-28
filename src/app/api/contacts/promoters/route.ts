import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';

/**
 * GET /api/contacts/promoters
 * Fetch promoter contacts with show counts (artist-only)
 * Backend: GET /api/contacts/promoters
 * Optional query param: ?tourId={id} to filter by tour
 *
 * Implements BUILD_PLAN Week 5, Task 5.1
 *
 * Returns array of promoter contacts:
 * {
 *   entityId,
 *   name,
 *   city,
 *   state,
 *   country,
 *   latitude,
 *   longitude,
 *   showCount,
 *   shows: [{ id, showDate, venueName, status, tourId }]
 * }
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const tourId = searchParams.get('tourId');

        let apiUrl = `${API_BASE_URL}/contacts/promoters`;
        if (tourId) {
            apiUrl += `?tourId=${tourId}`;
        }

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json',
            }
        });

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
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch promoter contacts' },
            { status: 500 }
        );
    }
}
