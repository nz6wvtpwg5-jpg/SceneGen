import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';

/**
 * POST /api/contacts/accept/:contactId
 * Accept a pending contact request
 * Backend: POST /api/contacts/accept/:contactId
 * Returns: Updated Contact object with status 'accepted'
 */
export async function POST(
    request: NextRequest,
    { params }: { params: { contactId: string } }
) {
    try {
        const authorization = request.headers.get('authorization');
        if (!authorization) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { contactId } = params;
        const entityId = request.headers.get('x-entity-id');
        if (!entityId) return NextResponse.json({ error: 'Entity context is required' }, { status: 400 });

        const apiUrl = `${API_BASE_URL}/contacts/accept/${contactId}`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': authorization,
                'X-Entity-Id': entityId,
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
            { error: 'Failed to accept contact request' },
            { status: 500 }
        );
    }
}
