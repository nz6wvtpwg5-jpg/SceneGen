import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Use local backend (reads from .env.local)
import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';
const USE_LOCAL_BACKEND = true;

/**
 * GET /api/tours
 * Fetch all tours for current artist entity
 * Backend: GET /api/tours
 * Requires: Artist entity (promoters get 403)
 */
export async function GET(request: NextRequest) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const entityId = request.headers.get('x-entity-id');
        if (!entityId) {
            return NextResponse.json({ error: { code: 'ENTITY_REQUIRED', message: 'Choose a workspace before loading tours' } }, { status: 400 });
        }
        const apiUrl = `${API_BASE_URL}/tours`;

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

        const response = await fetch(apiUrl, { headers });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Tours API error:', {
                endpoint: '/api/tours',
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
            { error: 'Failed to fetch tours' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/tours
 * Create new tour (artist-only)
 * Backend: POST /api/tours
 * Body: { name, notes? }
 * ⚠️  Requires artist entity (promoters get 403)
 * ⚠️  Trial check applies
 */
export async function POST(request: NextRequest) {
    const authHeader = request.headers.get('authorization');

    if (!authHeader) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const body = await request.json();
        const entityId = request.headers.get('x-entity-id');
        if (!entityId) {
            return NextResponse.json({ error: { code: 'ENTITY_REQUIRED', message: 'Choose a workspace before creating a tour' } }, { status: 400 });
        }
        const apiUrl = `${API_BASE_URL}/tours`;

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
            method: 'POST',
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
            { error: 'Failed to create tour' },
            { status: 500 }
        );
    }
}
