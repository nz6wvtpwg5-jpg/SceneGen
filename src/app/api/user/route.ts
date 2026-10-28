import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';

export async function GET(request: NextRequest) {
    try {
        const token = request.headers.get('authorization');
        const userId = request.headers.get('x-user-id');
        if (!token || !userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const finalToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const apiUrl = `${API_BASE_URL}/user/get`;

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': finalToken,
                'X-User-Id': userId,
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
            { error: 'Failed to fetch user data' },
            { status: 500 }
        );
    }
}

export async function PUT(request: NextRequest) {
    const token = request.headers.get('authorization');
    const userId = request.headers.get('x-user-id');
    if (!token || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    try {
        const response = await fetch(`${API_BASE_URL}/user/update`, {
            method: 'PUT',
            headers: { 'Authorization': token, 'X-User-Id': userId, 'Content-Type': 'application/json' },
            body: await request.text(),
            cache: 'no-store'
        });
        return NextResponse.json(await response.json(), { status: response.status });
    } catch (error) {
        console.error('User update failed:', error instanceof Error ? error.message : 'Unknown error');
        return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
    }
}
