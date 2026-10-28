import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Use local backend (reads from .env.local)
import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';
const USE_LOCAL_BACKEND = true;

/**
 * GET /api/shows/:id
 * Fetch a single show by ID
 * Backend: GET /api/shows/:id
 * Returns: Show object
 * Guard: Must be artist or promoter of show (backend enforced)
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const token = request.headers.get('authorization');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // In Next.js 15, params might be a Promise
        const params = await Promise.resolve(context.params);
        const { id } = params;

        const entityId = request.headers.get('x-entity-id');

        const apiUrl = `${API_BASE_URL}/shows/${id}`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Authorization': token, // Include the authorization token
        };

        if (USE_LOCAL_BACKEND && entityId) {
            headers['X-Entity-Id'] = entityId;
        }

        const response = await fetch(apiUrl, { headers });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            let errorBody: unknown;
            try { errorBody = JSON.parse(errorText); }
            catch { errorBody = { error: { message: 'The day sheet could not be saved' } }; }
            return NextResponse.json(errorBody, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch show' },
            { status: 500 }
        );
    }
}

/**
 * PATCH /api/shows/:id
 * Update a show
 * Body: Partial UpdateShowInput
 * Backend: PATCH /api/shows/:id
 * Returns: Updated Show object
 * Guard: Must be artist or promoter of show (backend enforced)
 */
export async function PATCH(
    request: NextRequest,
    context: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const token = request.headers.get('authorization');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // In Next.js 15, params might be a Promise
        const params = await Promise.resolve(context.params);
        const { id } = params;

        const entityId = request.headers.get('x-entity-id');
        const body = await request.json();

        // Transform frontend field names to backend field names
        const backendPayload: any = { ...body };

        // Map contact fields to promoter fields for backend
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

        // Map other frontend fields to backend fields
        if (body.showDate !== undefined) {
            backendPayload.date = body.showDate;
            delete backendPayload.showDate;
        }
        if (body.showTime !== undefined) {
            backendPayload.startTime = body.showTime;
            delete backendPayload.showTime;
        }
        if (body.doorsTime !== undefined) {
            backendPayload.doorTime = body.doorsTime || null;
            delete backendPayload.doorsTime;
        }
        if (body.venueCity !== undefined) {
            backendPayload.city = body.venueCity;
            delete backendPayload.venueCity;
        }
        if (body.venueState !== undefined) {
            backendPayload.state = body.venueState;
            delete backendPayload.venueState;
        }
        if (body.venueCountry !== undefined) {
            backendPayload.country = body.venueCountry;
            delete backendPayload.venueCountry;
        }
        if (body.venueCapacity !== undefined) {
            backendPayload.capacity = body.venueCapacity;
            delete backendPayload.venueCapacity;
        }
        // setLength is not currently persisted by the shows schema. Never
        // forward it as an arbitrary database column.
        delete backendPayload.setLength;
        if (body.guarantee !== undefined) {
            backendPayload.guaranteedFee = body.guarantee;
            backendPayload.fee = body.guarantee;
            delete backendPayload.guarantee;
        }
        if (body.dealType !== undefined) {
            backendPayload.backendDeal = body.dealType;
            delete backendPayload.dealType;
        }

        const apiUrl = `${API_BASE_URL}/shows/${id}`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Authorization': token, // Include the authorization token
        };

        if (USE_LOCAL_BACKEND && entityId) {
            headers['X-Entity-Id'] = entityId;
        }

        const response = await fetch(apiUrl, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(backendPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            let errorBody: unknown;
            try { errorBody = JSON.parse(errorText); }
            catch { errorBody = { error: { message: 'The day sheet could not be saved' } }; }
            return NextResponse.json(errorBody, { status: response.status });
        }

        const data = await response.json();
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Failed to update show' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/shows/:id
 * Cancel a show
 * Backend: DELETE /api/shows/:id
 * Returns: { success: true }
 * Logic: Sets status = 'cancelled', cancelledBy = current entity
 */
export async function DELETE(
    request: NextRequest,
    context: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        // In Next.js 15, params might be a Promise
        const params = await Promise.resolve(context.params);
        const { id } = params;

        const token = request.headers.get('authorization');
        const entityId = request.headers.get('x-entity-id');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const apiUrl = `${API_BASE_URL}/shows/${id}`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            'Authorization': token, // Include the authorization token
        };

        if (USE_LOCAL_BACKEND && entityId) {
            headers['X-Entity-Id'] = entityId;
        }

        console.log('Forwarding to Backend:');
        console.log('  URL:', apiUrl);
        console.log('  Method: DELETE');
        console.log('  Headers being sent:', JSON.stringify(headers, null, 2));

        const response = await fetch(apiUrl, {
            method: 'DELETE',
            headers
        });

        console.log('Backend Response:');
        console.log('  Status:', response.status);
        console.log('  Status Text:', response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Backend returned error:', errorText);
            console.error('=== END DELETE DEBUG (ERROR) ===');
            return NextResponse.json({ error: errorText }, { status: response.status });
        }

        // Backend returns 204 No Content with no body
        // Return success response to frontend
        console.log('Backend returned success (204 No Content)');
        console.log('=== END DELETE DEBUG (SUCCESS) ===');
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error('Exception caught:', error);
        console.error('=== END DELETE DEBUG (EXCEPTION) ===');
        return NextResponse.json(
            { error: 'Failed to cancel show' },
            { status: 500 }
        );
    }
}
