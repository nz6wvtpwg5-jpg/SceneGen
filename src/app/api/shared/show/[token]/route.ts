import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';

/**
 * GET /api/shared/show/:token
 * Get show details via share token (no auth required)
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ token: string }> | { token: string } }
) {
    try {
        const params = await Promise.resolve(context.params);
        const { token } = params;

        const response = await fetch(`${API_BASE_URL}/shared/show/${token}`);

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error fetching shared show:', error);
        return NextResponse.json(
            { error: 'Failed to fetch show' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/shared/show/:token
 * Update show via share token (no auth required)
 */
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ token: string }> | { token: string } }
) {
    try {
        const params = await Promise.resolve(context.params);
        const { token } = params;
        const authorization = request.headers.get('authorization');
        if (!authorization) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const body = await request.json();

        // Transform frontend field names to backend field names
        const backendPayload: any = { ...body };

        if (body.contactName !== undefined) {
            backendPayload.promoterName = body.contactName;
            delete backendPayload.contactName;
        }
        if (body.contactEmail !== undefined) {
            backendPayload.promoterEmail = body.contactEmail;
            delete backendPayload.contactEmail;
        }
        if (body.contactPhone !== undefined) {
            backendPayload.promoterPhone = body.contactPhone;
            delete backendPayload.contactPhone;
        }
        if (body.showDate !== undefined) {
            backendPayload.date = body.showDate;
            delete backendPayload.showDate;
        }
        if (body.showTime !== undefined) {
            backendPayload.startTime = body.showTime;
            delete backendPayload.showTime;
        }
        if (body.doorsTime !== undefined) {
            backendPayload.doorTime = body.doorsTime;
            delete backendPayload.doorsTime;
        }

        const response = await fetch(`${API_BASE_URL}/shared/show/${token}`, {
            method: 'PATCH',
            headers: {
                'Authorization': authorization,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(backendPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: errorText }, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error updating shared show:', error);
        return NextResponse.json(
            { error: 'Failed to update show' },
            { status: 500 }
        );
    }
}
