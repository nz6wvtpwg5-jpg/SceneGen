import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';

/**
 * GET /api/invites/:token
 * Fetch invite details (public endpoint, no auth required)
 * Backend: GET /api/invites/:token
 * Returns: Invite object
 * Check expiry, return error if expired
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { token: string } }
) {
    try {
        const { token } = params;

        const apiUrl = `${API_BASE_URL}/invites/${token}`;

        const response = await fetch(apiUrl, {
            headers: {
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
            { error: 'Failed to fetch invite' },
            { status: 500 }
        );
    }
}
