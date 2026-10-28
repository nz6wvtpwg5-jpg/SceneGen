import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';

/**
 * GET /api/search
 * Search for entities (artists and promoters)
 * Query params: q (query), type (artist|promoter|all)
 * Backend: GET /api/search?q={query}&type={type}
 * Returns: { artists: [], promoters: [] }
 * Excludes current entity from results (backend enforced)
 */
export async function GET(request: NextRequest) {
    try {
        const token = request.headers.get('authorization');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const finalToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        // Extract query params
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');
        const type = searchParams.get('type') || 'all';

        if (!query) {
            return NextResponse.json({ artists: [], promoters: [] });
        }

        const params = new URLSearchParams({
            q: query,
            type: type
        });

        const apiUrl = `${API_BASE_URL}/search?${params.toString()}`;

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': finalToken,
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
            { error: 'Failed to search entities' },
            { status: 500 }
        );
    }
}
