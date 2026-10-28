import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';

/**
 * GET /api/user/entities
 *
 * Week 1, Task 1.5: Ensure administratorId is included in response
 *
 * NOTE: Backend must include administratorId in each entity object:
 * {
 *   id: string,
 *   name: string,
 *   entityType: 'artist' | 'promoter',
 *   administratorId: string,  ← Backend must include this
 *   city?: string,
 *   country?: string,
 *   ...
 * }
 *
 * This allows frontend to check: entity.administratorId === userId
 */
export async function GET(request: NextRequest) {
    try {
        const token = request.headers.get('authorization');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const finalToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        console.log('[GET /api/user/entities] Token present:', !!token);
        const apiUrl = `${API_BASE_URL}/user/entities`;

        const headers: HeadersInit = {
            'Authorization': finalToken,
            'Content-Type': 'application/json',
        };

        console.log('[GET /api/user/entities] API URL:', apiUrl);

        const response = await fetch(apiUrl, { headers });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', response.status, errorText);
            throw new Error(`API error: ${response.status} ${errorText}`);
        }

        const data = await response.json();

        // Log the response for debugging
        console.log('Entities API response:', JSON.stringify(data, null, 2));

        // Check if backend returned an error in the response body
        if (data && typeof data === 'object' && 'error' in data) {
            console.warn('Backend returned error in response body:', data.error);
        }

        return NextResponse.json(data);
    } catch (error) {
        // No longer using auth() since we get token from request headers
        console.error('Entities fetch error:', {
            error,
        });
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch entities' },
            { status: 500 }
        );
    }
}
