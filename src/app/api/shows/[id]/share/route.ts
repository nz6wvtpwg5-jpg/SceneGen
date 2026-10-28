import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';

/**
 * POST /api/shows/:id/share
 * Create a shareable link for a show
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const token = request.headers.get('authorization');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const params = await Promise.resolve(context.params);
        const { id } = params;
        const entityId = request.headers.get('x-entity-id');
        const body = await request.json();

        const response = await fetch(`${API_BASE_URL}/shows/${id}/share`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token,
                'X-Entity-Id': entityId || '',
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating share:', error);
        return NextResponse.json(
            { error: 'Failed to create share' },
            { status: 500 }
        );
    }
}
