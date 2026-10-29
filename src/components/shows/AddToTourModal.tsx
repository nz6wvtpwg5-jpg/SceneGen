"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useTours } from "@/hooks/useTours";
import type { Show } from "@/types/show";
import type { Tour } from "@/types/tour";

/**
 * AddToTourModal Component
 * Implements BUILD_PLAN Week 7, Task 7.5 & 7.6
 * Features:
 * - Display selected shows
 * - Choose existing tour or create new
 * - Handle tour reassignment warnings
 */
interface AddToTourModalProps {
  selectedShows: Show[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddToTourModal({
  selectedShows,
  onClose,
  onSuccess
}: AddToTourModalProps) {
  const { data: session } = useSession();
  const { fetchTours, createTour, addShowsToTour, isLoading } = useTours();
  const [tours, setTours] = useState<Tour[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string>('');
  const [createNew, setCreateNew] = useState(false);
  const [newTourName, setNewTourName] = useState('');
  const [newTourNotes, setNewTourNotes] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [error, setError] = useState('');
  // Retain a successfully created tour if attaching shows fails; retries must not duplicate it.
  const pendingCreatedTourId = useRef<string | null>(null);

  // Load tours
  useEffect(() => {
    const loadTours = async () => {
      try {
        const data = await fetchTours();
        setTours(data);
      } catch (err) {
        console.error('Failed to fetch tours:', err);
        toast.error('Failed to load tours');
      }
    };
    loadTours();
  }, [fetchTours]);

  // Check if any shows already have tours
  const showsWithTours = selectedShows.filter(s => s.tourId);
  const hasExistingTours = showsWithTours.length > 0;

  const handleSubmit = async () => {
    // Show warning if shows have existing tours
    if (hasExistingTours && !showWarning) {
      setShowWarning(true);
      return;
    }

    try {
      setError('');
      let tourId = selectedTourId;

      // Create new tour if needed
      if (createNew) {
        if (!newTourName.trim()) {
          setError('Tour name is required');
          return;
        }

        // Calculate startDate and endDate from selected shows
        const showDates = selectedShows
          .map(s => new Date(s.showDate))
          .sort((a, b) => a.getTime() - b.getTime());

        const startDate = showDates.length > 0
          ? showDates[0].toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        const endDate = showDates.length > 0
          ? showDates[showDates.length - 1].toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        if (!pendingCreatedTourId.current) {
          const tour = await createTour({
            name: newTourName,
            notes: newTourNotes,
            startDate,
            endDate,
            showIds: selectedShows.map(show => show.id)
          });
          if (!tour?.id) throw new Error('Tour creation returned no tour ID. Please refresh your tours before retrying.');
          pendingCreatedTourId.current = tour.id;
        }
        tourId = pendingCreatedTourId.current;
      } else if (!selectedTourId) {
        setError('Please select a tour or create a new one');
        return;
      }

      // Add shows to tour
      if (!createNew) await addShowsToTour(tourId, selectedShows.map(s => s.id));
      pendingCreatedTourId.current = null;
      onSuccess();
      onClose();
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to add shows to tour';
      const safeMessage = pendingCreatedTourId.current ? `Tour created, but the shows could not be attached: ${errorMsg}. Retry to attach them to the existing tour.` : errorMsg;
      setError(safeMessage);
      toast.error(safeMessage);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Add Shows to Tour</h2>
          <button type="button"
            onClick={onClose}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5 shrink-0"><path d="m6 6 12 12M18 6 6 18" /></svg><span>Close</span>
          </button>
        </div>

        {/* Selected Shows */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-text-tertiary mb-2">
            Selected Shows ({selectedShows.length})
          </h3>
          <div className="border border-border-subtle rounded-lg p-4 max-h-40 overflow-y-auto">
            {selectedShows.map((show) => (
              <div key={show.id} className="flex justify-between items-center py-2">
                <div>
                  <p className="font-medium">{show.venueName || show.venueCity || 'Location TBC'}</p>
                  <p className="text-sm text-text-tertiary">
                    {new Date(show.showDate).toLocaleDateString()} - {show.venueCity}
                  </p>
                </div>
                {show.tourId && (
                  <span className="text-xs bg-semantic-warning/20 text-semantic-warning px-2 py-1 rounded">
                    In Tour
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Warning */}
        {showWarning && hasExistingTours && (
          <div className="mb-6 p-4 bg-semantic-warning/10 text-semantic-warning rounded-lg border border-semantic-warning/30">
            <p className="font-medium mb-2">Warning</p>
            <p className="text-sm">
              {showsWithTours.length} show{showsWithTours.length !== 1 ? 's are' : ' is'} already in {showsWithTours.length !== 1 ? 'tours' : 'a tour'}.
              They will be moved to the selected tour.
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/10 border border-destructive text-destructive rounded-lg">
            {error}
          </div>
        )}

        {/* Tour Selection */}
        <div className="mb-6 space-y-4">
          <div>
            <label className="flex items-center gap-2 mb-4">
              <input
                type="radio"
                checked={!createNew}
                onChange={() => setCreateNew(false)}
                className="h-4 w-4"
              />
              <span className="font-medium">Add to existing tour</span>
            </label>

            {!createNew && (
              <select
                value={selectedTourId}
                onChange={(e) => setSelectedTourId(e.target.value)}
                className="w-full px-4 py-2 border border-border-subtle rounded-lg"
                disabled={createNew}
              >
                <option value="">Select a tour...</option>
                {tours.map((tour) => (
                  <option key={tour.id} value={tour.id}>
                    {tour.name} ({new Date(tour.startDate).toLocaleDateString()} - {new Date(tour.endDate).toLocaleDateString()})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2 mb-4">
              <input
                type="radio"
                checked={createNew}
                onChange={() => setCreateNew(true)}
                className="h-4 w-4"
              />
              <span className="font-medium">Create new tour</span>
            </label>

            {createNew && (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tour Name *
                  </label>
                  <input
                    type="text"
                    value={newTourName}
                    onChange={(e) => setNewTourName(e.target.value)}
                    className="w-full px-4 py-2 border border-border-subtle rounded-lg"
                    placeholder="e.g. Summer 2026 Tour"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Notes (optional)
                  </label>
                  <textarea
                    value={newTourNotes}
                    onChange={(e) => setNewTourNotes(e.target.value)}
                    className="w-full px-4 py-2 border border-border-subtle rounded-lg"
                    rows={3}
                    placeholder="Tour details, goals, etc."
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-border-subtle rounded-lg hover:bg-surface-elevated"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : showWarning && hasExistingTours ? 'Confirm Move' : 'Add to Tour'}
          </button>
        </div>
      </div>
    </div>
  );
}
