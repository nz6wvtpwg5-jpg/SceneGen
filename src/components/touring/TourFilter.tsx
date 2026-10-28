'use client';

import type { Tour } from '@/types/tour';

interface TourFilterProps {
  tours: Tour[];
  selectedTourId: string | null;
  onTourChange: (tourId: string | null) => void;
}

/**
 * TourFilter Component
 * Implements BUILD_PLAN Week 5, Task 5.6
 *
 * Dropdown to filter map/contacts by tour
 * Options: All Shows, Standalone Shows, [Tour Names]
 */
export default function TourFilter({
  tours,
  selectedTourId,
  onTourChange
}: TourFilterProps) {
  return (
    <div className="flex w-full items-center gap-2">
      <label htmlFor="tour-filter" className="text-sm font-medium">
        Filter:
      </label>
      <select
        id="tour-filter"
        value={selectedTourId || ''}
        onChange={(e) => onTourChange(e.target.value || null)}
        className="min-h-11 min-w-0 flex-1 rounded-lg border border-border-subtle bg-background px-3 py-2 text-base sm:text-sm"
      >
        <option value="">All Shows</option>
        <option value="standalone">Standalone Shows Only</option>
        {tours.map((tour) => (
          <option key={tour.id} value={tour.id}>
            {tour.name}
          </option>
        ))}
      </select>
    </div>
  );
}
