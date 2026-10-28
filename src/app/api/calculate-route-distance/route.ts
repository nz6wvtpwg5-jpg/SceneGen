import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { origins, destinations, paired = false } = await request.json();

    const validLocations = (value: unknown): value is string[] => Array.isArray(value)
      && value.length > 0 && value.length <= 25
      && value.every((item) => typeof item === 'string' && item.trim().length > 0 && item.length <= 250);

    if (!validLocations(origins) || !validLocations(destinations)) {
      return NextResponse.json(
        { error: 'Origins and destinations must contain between 1 and 25 valid locations' },
        { status: 400 }
      );
    }

    if (paired && origins.length !== destinations.length) {
      return NextResponse.json({ error: 'Paired routes require matching origin and destination counts' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API key not configured' },
        { status: 500 }
      );
    }

    // Build the Distance Matrix API URL
    const baseUrl = 'https://maps.googleapis.com/maps/api/distancematrix/json';
    const params = new URLSearchParams({
      origins: origins.join('|'),
      destinations: destinations.join('|'),
      mode: 'driving',
      units: 'imperial', // Use miles
      key: apiKey,
    });

    const response = await fetch(`${baseUrl}?${params}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: 'Distance service is unavailable' }, { status: 502 });
    }
    const data = await response.json();

    if (data.status !== 'OK') {
      console.error('Distance Matrix API returned status:', data.status);
      return NextResponse.json(
        { error: 'Distance service could not calculate the route' },
        { status: 502 }
      );
    }

    // Extract distances from the response
    const distances: number[] = [];
    for (let i = 0; i < data.rows.length; i++) {
      const elements = data.rows[i].elements;
      const start = paired ? i : 0;
      const end = paired ? i + 1 : elements.length;
      for (let j = start; j < end; j++) {
        if (elements[j].status === 'OK') {
          // Distance in miles (value is in meters, convert to miles)
          const miles = elements[j].distance.value * 0.000621371;
          distances.push(Math.round(miles * 10) / 10); // Round to 1 decimal place
        } else {
          distances.push(0);
        }
      }
    }

    return NextResponse.json({
      success: true,
      distances,
    });
  } catch (error) {
    console.error('Error calculating route distance:', error);
    return NextResponse.json(
      { error: 'Failed to calculate route distance' },
      { status: 500 }
    );
  }
}
