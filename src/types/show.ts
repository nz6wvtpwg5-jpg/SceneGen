/**
 * Show Type Definitions
 * Implements BUILD_PLAN Week 2, Task 2.7
 * Based on Show model schema from Week 2, Task 2.2
 */

export type ShowStatus =
    | 'draft'
    | 'pending_invite'
    | 'pending_acceptance'
    | 'confirmed'
    | 'tentative'
    | 'cancelled';

export type DealType =
    | 'guarantee'
    | 'door_split'
    | 'guarantee_vs_split';

export interface Show {
    // Core fields
    id: string;
    artistEntityId: string;
    entityId?: string;
    promoterEntityId: string;
    tourId?: string;
    createdBy: string;
    status: ShowStatus;

    // Timestamps
    createdAt: string;
    updatedAt: string;
    confirmedAt?: string;
    cancelledAt?: string;
    cancelledBy?: string;

    // Day Sheet fields
    showDate: string;
    // Read models normalize an unconfirmed venue to an empty string so UI
    // controls never receive null. Create/update inputs may still send null.
    venueName: string;
    festivalName?: string;
    venueId?: string;
    venuePlaceId?: string;
    venueSelectionIntent?: 'google' | 'stored';
    countryCode?: string;
    postalCode?: string;
    venueAddress: string;
    venueCity: string;
    venueState: string;
    venueCountry: string;
    venueCapacity?: number;
    latitude?: number;
    longitude?: number;
    showType?: 'show' | 'off_day' | 'travel_day' | string;
    readinessPercentage?: number;

    // Timing
    doorsTime: string;
    showTime: string;
    setLength: string;
    loadInTime?: string;
    soundCheckTime?: string;
    endTime?: string;

    // Financial
    guarantee?: number;
    currency?: string;  // ISO currency code (USD, EUR, GBP, etc.)
    dealType: DealType;
    doorSplitPercentage?: number;
    advanceTicketPrice?: number;
    doorTicketPrice?: number;
    ticketPrice?: number;
    isPaid?: boolean;

    // Additional info
    notes?: string;

    calendarEventTitle?: string;

    // Google Calendar integration
    google_calendar_event_id?: string;
    googleCalendarEventId?: string;

    // Contact info
    contactName: string;
    contactPhone: string;
    contactEmail: string;
}

export interface CreateShowInput {
    artistEntityId?: string; // Optional - can be added later
    promoterEntityId?: string; // Optional - can be added later
    tourId?: string;
    showDate: string;
    venueName?: string | null;
    festivalName?: string | null;
    venueId?: string;
    venuePlaceId?: string;
    latitude?: number;
    longitude?: number;
    countryCode?: string;
    postalCode?: string;
    venueAddress?: string | null;
    venueCity: string;
    venueState: string;
    venueCountry: string;
    venueCapacity?: number;
    doorsTime: string;
    showTime: string;
    setLength?: string; // Optional for progressive data entry
    guarantee?: number;
    currency?: string;  // ISO currency code
    dealType: DealType;
    doorSplitPercentage?: number;
    advanceTicketPrice?: number;
    doorTicketPrice?: number;
    notes?: string;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
}

export interface UpdateShowInput {
    showDate?: string;
    venueName?: string | null;
    festivalName?: string | null;
    venueId?: string;
    venuePlaceId?: string;
    latitude?: number;
    longitude?: number;
    countryCode?: string;
    postalCode?: string;
    venueAddress?: string | null;
    venueCity?: string;
    venueState?: string;
    venueCountry?: string;
    venueCapacity?: number;
    doorsTime?: string;
    showTime?: string;
    setLength?: string;
    loadInTime?: string;
    soundCheckTime?: string;
    endTime?: string;
    guarantee?: number;
    currency?: string;
    dealType?: DealType;
    doorSplitPercentage?: number;
    advanceTicketPrice?: number;
    doorTicketPrice?: number;
    notes?: string;
    contactName?: string;
    contactPhone?: string;
    contactEmail?: string;
}

export interface ShowFilters {
    status?: ShowStatus;
    tourId?: string;
}
