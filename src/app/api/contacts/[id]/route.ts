import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';

/**
 * DELETE /api/contacts/[id]
 * Delete a contact
 * Backend: DELETE /api/contacts/{id}
 */
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const token = request.headers.get('authorization');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const finalToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const entityId = request.headers.get('x-entity-id');
        if (!entityId) return NextResponse.json({ error: 'Entity context is required' }, { status: 400 });

        const headers: Record<string, string> = {
            'Authorization': finalToken,
            'Content-Type': 'application/json',
            'X-Entity-Id': entityId,
        };

        const response = await fetch(`${API_BASE_URL}/contacts/${params.id}`, {
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

        // 204 No Content
        return new NextResponse(null, { status: 204 });
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Failed to delete contact' },
            { status: 500 }
        );
    }
}
