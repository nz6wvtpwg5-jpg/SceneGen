'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PromoterContact {
  entityId: string;
  name: string;
  city: string;
  state: string;
  country: string;
  showCount: number;
  shows: Array<{
    id: string;
    showDate: string;
    venueName: string;
    status: string;
    tourId?: string;
  }>;
}

interface MarkerPopupProps {
  promoter: PromoterContact;
  selectedTourId?: string | null;
  onCreateShow?: (promoterId: string) => void;
}

/**
 * MarkerPopup Component
 * Implements BUILD_PLAN Week 5, Task 5.10 & Week 6, Task 6.3
 *
 * Basic popup showing promoter info and shows
 * Week 6: Add "Create Show" with pre-filled data
 */
export default function MarkerPopup({ promoter, selectedTourId, onCreateShow }: MarkerPopupProps) {
  const router = useRouter();

  // Filter shows by tour if tour context active
  const displayedShows = selectedTourId
    ? promoter.shows.filter(s => s.tourId === selectedTourId)
    : promoter.shows;

  const handleCreateShow = () => {
    if (onCreateShow) {
      onCreateShow(promoter.entityId);
    } else {
      // Fallback: navigate to shows page with query params
      const params = new URLSearchParams({
        createNew: 'true',
        promoterId: promoter.entityId,
        city: promoter.city,
      });
      if (selectedTourId) {
        params.append('tourId', selectedTourId);
      }
      router.push(`/shows?${params.toString()}`);
    }
  };

  return (
    <div className="p-2 min-w-[200px]">
      <h3 className="font-semibold text-base mb-1">{promoter.name}</h3>
      <p className="text-sm text-text-tertiary mb-3">
        {promoter.city}, {promoter.state}, {promoter.country}
      </p>

      {displayedShows.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-medium text-text-tertiary">
            {displayedShows.length} show{displayedShows.length !== 1 ? 's' : ''}
            {selectedTourId ? ' in this tour' : ''}:
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {displayedShows.map((show) => (
              <div
                key={show.id}
                className="text-xs p-2 bg-surface-elevated rounded cursor-pointer hover:bg-surface-elevated/80"
                onClick={() => router.push(`/shows/${show.id}`)}
              >
                <div className="font-medium">{show.venueName}</div>
                <div className="text-text-tertiary">
                  {new Date(show.showDate).toLocaleDateString()} • {show.status}
                </div>
              </div>
            ))}
          </div>
          {/* Week 6, Task 6.3: Create Show button even if shows exist */}
          <button
            onClick={handleCreateShow}
            className="w-full text-xs px-3 py-1 mt-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Create Another Show
          </button>
        </div>
      ) : (
        <div className="text-center py-2">
          <p className="text-xs text-text-tertiary mb-2">
            {selectedTourId ? 'No shows in this tour yet' : 'No shows yet'}
          </p>
          <button
            onClick={handleCreateShow}
            className="text-xs px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Create Show{selectedTourId ? ' in Tour' : ''}
          </button>
        </div>
      )}
    </div>
  );
}
