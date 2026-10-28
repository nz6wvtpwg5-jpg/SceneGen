/**
 * Tour Type Definitions
 * Implements BUILD_PLAN Week 4, Task 4.7
 * Tours are artist-only entities for organizing shows into groups
 */

export interface Tour {
  id: string;
  artistEntityId: string;
  name: string;
  notes?: string;
  startDate: string; // Computed from associated shows
  endDate: string;   // Computed from associated shows
  createdAt: string;
  updatedAt: string;
  currency?: string;
  routeMileage?: { calculated: boolean; stale: boolean; totalMiles: number | null; legs: Array<{ miles: number }>; legCount: number; missingStops?: number };
}

export interface CreateTourInput {
  name: string;
  notes?: string;
  currency?: string;
}

export interface UpdateTourInput {
  name?: string;
  notes?: string;
  currency?: string;
}

export interface TourWithShows extends Tour {
  shows: Array<{
    id: string;
    showDate: string;
    venueName: string;
    city: string;
    state: string;
    country: string;
    status: string;
  }>;
}
