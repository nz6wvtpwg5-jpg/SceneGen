import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Use local backend (reads from .env.local)
import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';
const USE_LOCAL_BACKEND = true;

/**
 * GET /api/shows
 * Fetch shows for the current entity
 * Query params: status, tourId (optional)
 * Backend: GET /api/shows?status={status}&tourId={tourId}
 * Returns: Array of Show objects
 */
export async function GET(request: NextRequest) {
    try {
        const token = request.headers.get('authorization');

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const finalToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

        // Get entity ID from header (set by frontend)
        const entityId = request.headers.get('x-entity-id');
        if (!entityId) {
            return NextResponse.json({ error: { code: 'ENTITY_REQUIRED', message: 'Choose a workspace before loading shows' } }, { status: 400 });
        }

        // Extract query params
        const { searchParams } = new URL(request.url);
        const status = searchParams.get('status');
        const tourId = searchParams.get('tourId');

        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (tourId) params.append('tourId', tourId);
        if (entityId) params.append('entityId', entityId);

        const apiUrl = params.toString()
            ? `${API_BASE_URL}/shows?${params.toString()}`
            : `${API_BASE_URL}/shows`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (USE_LOCAL_BACKEND) {
            // Local backend needs authorization and entity ID in header
            headers['Authorization'] = finalToken;
            if (entityId) {
                headers['X-Entity-Id'] = entityId;
            }
        } else {
            // remote backend needs authorization and subscription key
            headers['Authorization'] = finalToken;
        }

        const response = await fetch(apiUrl, { headers });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json({ error: errorText }, { status: response.status });
        }

        const data = await response.json();

        // Backend already sends data in camelCase format, no need to remap
        return NextResponse.json(data);
    } catch (error) {
        console.error('Error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch shows' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/shows
 * Create a new show
 * Body: CreateShowInput
 * Backend: POST /api/shows
 * Returns: Created Show object with status 'draft' or 'pending_acceptance'
 */
export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get('authorization');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const finalToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const entityId = request.headers.get('x-entity-id');
        if (!entityId) {
            return NextResponse.json({ error: { code: 'ENTITY_REQUIRED', message: 'Choose a workspace before creating a show' } }, { status: 400 });
        }
        const body = await request.json();

        // Transform frontend CreateShowInput to backend schema
        const backendPayload: any = {
            tourId: body.tourId || null,
            venueName: body.venueName?.trim() || null,
            venueId: body.venueId || null,
            venuePlaceId: body.venuePlaceId || null,
            venueAddress: body.venueAddress?.trim() || null,
            city: body.venueCity || 'TBD',
            state: body.venueState || '',
            country: body.venueCountry?.trim() || null,
            latitude: body.latitude ?? null,
            longitude: body.longitude ?? null,
            countryCode: body.countryCode || null,
            postalCode: body.postalCode || null,
            date: body.showDate,
            startTime: body.showTime || '20:00',
            endTime: body.endTime || null,
            loadInTime: body.loadInTime || null,
            soundCheckTime: body.soundCheckTime || null,
            doorTime: body.doorsTime || null,
            status: 'confirmed',
            notes: body.notes || null,
            fee: body.guarantee || null,
            guaranteedFee: body.guarantee || null,
            backendDeal: body.dealType || 'guarantee',
            isPaid: false,
            capacity: body.venueCapacity ?? null,
            ticketPrice: body.advanceTicketPrice || body.doorTicketPrice || null,
            promoterName: body.contactName?.trim() || null,
            promoterEmail: body.contactEmail?.trim() || null,
            promoterPhone: body.contactPhone?.trim() || null,
            currency: body.currency || null
        };

        // Add entityId to body for local backend
        if (USE_LOCAL_BACKEND && entityId) {
            backendPayload.entityId = entityId;
        }

        const apiUrl = `${API_BASE_URL}/shows`;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
        };

        if (USE_LOCAL_BACKEND) {
            // Local backend needs authorization and entity ID in header
            headers['Authorization'] = finalToken;
            if (entityId) {
                headers['X-Entity-Id'] = entityId;
            }
        } else {
            headers['Authorization'] = finalToken;
        }

        console.log('[Shows API] Creating show with payload:', JSON.stringify(backendPayload, null, 2));

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(backendPayload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[Shows API] Create Error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });
            return NextResponse.json({ error: errorText }, { status: response.status });
        }

        const data = await response.json();
        console.log('[Shows API] Show created successfully:', data);

        // Backend returns { show: {...} }, but frontend expects the show object directly
        return NextResponse.json(data.show || data);
    } catch (error) {
        console.error('[Shows API] Error:', error);
        return NextResponse.json(
            { error: 'Failed to create show' },
            { status: 500 }
        );
    }
}
