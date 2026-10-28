import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const token = request.headers.get('authorization');
        const entityId = request.headers.get('x-entity-id');
        const { id } = await params;
        if (!token || !entityId || entityId !== id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const finalToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const apiUrl = `${API_BASE_URL}/promoter/get/${encodeURIComponent(id)}`;

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': finalToken,
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
        console.error('Error fetching promoter:', error);
        return NextResponse.json(
            { error: 'Failed to fetch promoter data' },
            { status: 500 }
        );
    }
}
