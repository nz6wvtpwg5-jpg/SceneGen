import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';

/**
 * POST /api/invites
 * Create a new invite
 * Body: CreateInviteInput { type, requiredEntityType, showId?, recipientEmail? }
 * Backend: POST /api/invites
 * Returns: { token, url }
 */
export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get('authorization');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const finalToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const body = await request.json();

        const apiUrl = `${API_BASE_URL}/invites`;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Authorization': finalToken,
                'Content-Type': 'application/json',
            },
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
            { error: 'Failed to create invite' },
            { status: 500 }
        );
    }
}
