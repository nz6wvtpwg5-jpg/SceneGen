import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { getBackendUrl } from '@/lib/backend';
const API_BASE_URL = getBackendUrl() + '/api';

/**
 * POST /api/artist/add
 *
 * Creates a new artist entity.
 *
 * Week 1, Task 1.1: Add entity ownership check
 * NOTE: The actual ownership validation (checking if user already owns an entity)
 * must be implemented in the backend service.
 * Backend should:
 * - Query: SELECT id FROM entities WHERE administratorId = {userId}
 * - Return 409 Conflict if entity already exists
 *
 * Request Body:
 * {
 *   name: string,
 *   city?: string,
 *   state?: string,
 *   country?: string,
 *   latitude?: number,
 *   longitude?: number,
 *   bio?: string
 * }
 *
 * Expected Responses:
 * - 200: Entity created successfully
 * - 401: Unauthorized (missing or invalid token)
 * - 409: Conflict (user already owns an entity) ← Backend must implement this
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
    try {
        const token = request.headers.get('authorization');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const finalToken = token.startsWith('Bearer ') ? token : `Bearer ${token}`;
        const body = await request.json();

        // Validate required fields
        if (!body.name) {
            return NextResponse.json(
                { error: 'Artist name is required' },
                { status: 400 }
            );
        }

        console.log('[POST /api/artist/add] Token present:', !!token);
        const apiUrl = `${API_BASE_URL}/artist/add`;

        console.log('Creating artist entity:', {
            name: body.name,
            city: body.city,
            state: body.state,
            country: body.country,
            latitude: body.latitude,
            longitude: body.longitude
        });

        const headers: HeadersInit = {
            'Authorization': finalToken,
            'Content-Type': 'application/json',
        };

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('API Error:', {
                status: response.status,
                statusText: response.statusText,
                body: errorText
            });

            // Check for 409 Conflict (user already owns an entity)
            if (response.status === 409) {
                return NextResponse.json(
                    { error: 'You already own an entity' },
                    { status: 409 }
                );
            }

            return NextResponse.json(
                { error: errorText || 'Failed to create artist' },
                { status: response.status }
            );
        }

        const data = await response.json();
        console.log('✅ Artist entity created successfully:', data.id || data);

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating artist:', error);
        return NextResponse.json(
            { error: 'Failed to create artist entity' },
            { status: 500 }
        );
    }
}
