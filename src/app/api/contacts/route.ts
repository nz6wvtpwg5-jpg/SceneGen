import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';

/**
 * GET /api/contacts
 * Fetch contacts for the current entity
 * Query params: status=pending|accepted (optional)
 * Backend: GET /api/contacts?status={status}
 * Returns: Array of Contact objects
 */
export async function GET(request: NextRequest) {
    try {
        const token = request.headers.get('authorization');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const finalToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const entityId = request.headers.get('x-entity-id');

        // Extract query params
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');

        const apiUrl = status
            ? `${API_BASE_URL}/contacts?status=${status}`
            : `${API_BASE_URL}/contacts`;

        const headers: Record<string, string> = {
            'Authorization': finalToken,
            'Content-Type': 'application/json',
        };

        if (entityId) {
            headers['X-Entity-Id'] = entityId;
        }

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
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch contacts' },
            { status: 500 }
        );
    }
}
