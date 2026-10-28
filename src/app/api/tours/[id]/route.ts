import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Use local backend (reads from .env.local)
import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
type Context = { params: Promise<{ id: string }> };

function tourHeaders(request: NextRequest) {
    const authorization = request.headers.get('authorization');
    const entityId = request.headers.get('x-entity-id');
    if (!authorization || !entityId) return null;
    return { Authorization: authorization, 'Content-Type': 'application/json', 'X-Entity-Id': entityId };
}

/**
 * GET /api/tours/:id
 * Fetch single tour with shows
 * Backend: GET /api/tours/:id
 * Returns: Tour object with shows array
 * Guard: tour.artistEntityId === activeEntity.id
 */
export async function GET(
    request: NextRequest,
    { params }: Context
) {
    try {
        const { id } = await params;
        const headers = tourHeaders(request);
        if (!headers) return NextResponse.json({ error: { code: 'ENTITY_REQUIRED', message: 'Choose a band workspace before opening this tour' } }, { status: 400 });
        if (!UUID.test(id)) return NextResponse.json({ error: { message: 'Invalid tour' } }, { status: 422 });
        const apiUrl = `${API_BASE_URL}/tours/${id}`;
        const response = await fetch(apiUrl, { headers, cache: 'no-store' });

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
            { error: 'Failed to fetch tour' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/tours/:id
 * Update tour
 * Backend: PATCH /api/tours/:id
 * Body: { name?, notes? }
 * Guard: tour.artistEntityId === activeEntity.id
 */
export async function PATCH(
    request: NextRequest,
    { params }: Context
) {
    try {
        const { id } = await params;
        const headers = tourHeaders(request);
        if (!headers) return NextResponse.json({ error: { code: 'ENTITY_REQUIRED', message: 'Choose a band workspace before editing this tour' } }, { status: 400 });
        if (!UUID.test(id)) return NextResponse.json({ error: { message: 'Invalid tour' } }, { status: 422 });
        const body = await request.json();
        const apiUrl = `${API_BASE_URL}/tours/${id}`;

        const response = await fetch(apiUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(body)
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
            { error: 'Failed to update tour' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/tours/:id
 * Delete tour (sets all shows.tourId = null)
 * Backend: DELETE /api/tours/:id
 * Guard: tour.artistEntityId === activeEntity.id
 */
export async function DELETE(
    request: NextRequest,
    { params }: Context
) {
    try {
        const { id } = await params;
        const headers = tourHeaders(request);
        if (!headers) return NextResponse.json({ error: { code: 'ENTITY_REQUIRED', message: 'Choose a band workspace before deleting this tour' } }, { status: 400 });
        if (!UUID.test(id)) return NextResponse.json({ error: { message: 'Invalid tour' } }, { status: 422 });
        const apiUrl = `${API_BASE_URL}/tours/${id}`;

        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers
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

        // DELETE returns 204 No Content, so don't try to parse JSON
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete tour' },
            { status: 500 }
        );
    }
}
