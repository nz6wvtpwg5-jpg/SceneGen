'use client';

import { useRef, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useTours } from '@/hooks/useTours';
import { Upload, Calendar } from 'lucide-react';
import type { Tour } from '@/types/tour';
import type { Show } from '@/types/show';

interface CreateTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (tour: Tour) => void;
  selectedShows?: Show[];
}

type CreationMode = 'choose' | 'manual' | 'csv';

/**
 * CreateTourModal Component
 * Implements BUILD_PLAN Week 4, Task 4.9
 *
 * Modal for creating a new tour with two options:
 * 1. Enter tour details manually
 * 2. Import from CSV
 */
export function CreateTourModal({
  isOpen,
  onClose,
  onSuccess,
  selectedShows = []
}: CreateTourModalProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { createTour, addShowsToTour, isLoading, error } = useTours();
  const [mode, setMode] = useState<CreationMode>('choose');
  const pendingCreatedTour = useRef<Tour | null>(null);

  // Compute date range from selected shows
  const computedDates = selectedShows.length > 0 ? (() => {
    const dates = selectedShows.map(s => new Date(s.showDate));
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    return {
      startDate: minDate.toISOString().split('T')[0], // YYYY-MM-DD
      endDate: maxDate.toISOString().split('T')[0],
      displayStart: minDate.toLocaleDateString(),
      displayEnd: maxDate.toLocaleDateString(),
    };
  })() : null;

  const [formData, setFormData] = useState({
    name: '',
    notes: '',
    startDate: computedDates?.startDate || new Date().toISOString().split('T')[0],
    endDate: computedDates?.endDate || new Date().toISOString().split('T')[0],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.endDate < formData.startDate) {
      toast.error('Tour end date must be on or after the start date.');
      return;
    }
    try {
      if (!pendingCreatedTour.current) {
        const created = await createTour({
          name: formData.name,
          notes: formData.notes || undefined,
          startDate: formData.startDate,
          endDate: formData.endDate,
          showIds: selectedShows.map(show => show.id),
        });
        if (!created?.id) throw new Error('Tour creation returned no tour ID. Please refresh your tours before retrying.');
        pendingCreatedTour.current = created;
      }
      const tour = pendingCreatedTour.current;

      pendingCreatedTour.current = null;
      onSuccess(tour);

      // Reset form
      setFormData({
        name: '',
        notes: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
      });
      setMode('choose');
      onClose();
    } catch (err) {
      console.error('Failed to create tour:', err);
      const reason = err instanceof Error ? err.message : 'Failed to create tour';
      toast.error(pendingCreatedTour.current ? `Tour created, but shows could not be attached: ${reason}. Retry to attach them without creating another tour.` : reason);
    }
  };

  const handleCancel = () => {
    pendingCreatedTour.current = null;
    setFormData({
      name: '',
      notes: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
    });
    setMode('choose');
    onClose();
  };

  const handleCSVImport = () => {
    onClose();
    router.push('/import');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/60 p-0 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="mobile-create-form flex min-h-[100dvh] w-full max-w-lg flex-col bg-[#f7f0e5] shadow-2xl sm:min-h-0 sm:max-h-[calc(100dvh-2rem)] sm:overflow-y-auto sm:rounded-2xl sm:border sm:border-border-subtle">
        {/* Choose Mode */}
        {mode === 'choose' && (
          <>
            <div className="mobile-safe-top sticky top-0 z-20 border-b border-border-subtle bg-[#f7f0e5]/95 px-4 pb-4 pt-5 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-6 sm:pb-0">
              <h2 className="text-2xl font-bold">Create Tour</h2>
              <p className="text-sm text-text-tertiary mt-1">
                Choose how you'd like to create your tour
              </p>
            </div>

            <div className="flex-1 space-y-3 p-4 sm:p-6">
              {/* Manual Entry Option */}
              <button
                onClick={() => setMode('manual')}
                className="group min-h-24 w-full rounded-2xl border-2 border-border-subtle bg-background p-5 text-left transition-all hover:border-primary sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Enter Manually</h3>
                    <p className="text-sm text-text-tertiary">
                      Create a tour by entering the tour name and dates manually. You can add shows to it later.
                    </p>
                  </div>
                </div>
              </button>

              {/* CSV Import Option */}
              <button
                onClick={handleCSVImport}
                className="group min-h-24 w-full rounded-2xl border-2 border-border-subtle bg-background p-5 text-left transition-all hover:border-primary sm:p-6"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                    <Upload className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Import from CSV</h3>
                    <p className="text-sm text-text-tertiary">
                      Upload a CSV file with your shows. Tour dates will be calculated automatically from your shows.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            <div className="mobile-create-actions sm:mx-0 sm:mt-0 sm:px-6 sm:pb-6">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                className="min-h-12 w-full"
              >
                Cancel
              </Button>
            </div>
          </>
        )}

        {/* Manual Entry Form */}
        {mode === 'manual' && (
          <>
            <div className="mobile-safe-top sticky top-0 z-20 flex items-center gap-2 border-b border-border-subtle bg-[#f7f0e5]/95 px-3 pb-4 pt-5 backdrop-blur sm:static sm:border-0 sm:bg-transparent sm:p-6 sm:pb-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setMode('choose')}
                className="min-h-11 shrink-0"
              >
                ← Back
              </Button>
              <div>
                <h2 className="text-2xl font-bold">Create Tour Manually</h2>
                <p className="text-sm text-text-tertiary mt-1">
                  Enter your tour details below
                </p>
              </div>
            </div>

            {computedDates && (
              <div className="mx-4 mt-4 rounded-xl border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/10 sm:mx-6">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <span className="inline-flex items-center gap-2"><Calendar size={15} /><strong>{selectedShows.length} show{selectedShows.length !== 1 ? 's' : ''}</strong> selected</span>
                  <br />
                  {computedDates.displayStart} - {computedDates.displayEnd}
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-1 flex-col">
              <div className="flex-1 space-y-4 p-4 sm:p-6 sm:pt-4">
              {/* Tour Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2">
                  Tour Name *
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Summer Festival Tour 2026"
                  className="w-full px-4 py-2 border border-border-subtle rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium mb-2">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    id="startDate"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2 border border-border-subtle rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium mb-2">
                    End Date *
                  </label>
                  <input
                    type="date"
                    id="endDate"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2 border border-border-subtle rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label htmlFor="notes" className="block text-sm font-medium mb-2">
                  Notes
                </label>
                <textarea
                  id="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any notes about this tour..."
                  className="w-full px-4 py-2 border border-border-subtle rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-semantic-error/10 border border-semantic-error rounded-lg text-semantic-error text-sm">
                  {error}
                </div>
              )}

              </div>

              {/* Actions */}
              <div className="mobile-create-actions grid grid-cols-2 gap-3 sm:mx-0 sm:flex sm:px-6 sm:pb-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMode('choose')}
                  disabled={isLoading}
                  className="min-h-12 flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !formData.name}
                  className="min-h-12 flex-1"
                >
                  {isLoading ? 'Creating...' : 'Create Tour'}
                </Button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
