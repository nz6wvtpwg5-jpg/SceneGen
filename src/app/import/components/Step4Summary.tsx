'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle, ExternalLink, Upload } from 'lucide-react';
import type { ImportResult } from '@/types/import';
import { formatCurrency } from '@/lib/csv/parser';
import { useCountRefreshStore } from '@/store/useCountRefreshStore';

interface Step4SummaryProps {
  result: ImportResult;
  onReset: () => void;
  entityId?: string;
}

export function Step4Summary({ result, onReset, entityId }: Step4SummaryProps) {
  const router = useRouter();
  const [isCalculatingDistances, setIsCalculatingDistances] = useState(false);
  const refreshTours = useCountRefreshStore((state) => state.refreshTours);
  const refreshShows = useCountRefreshStore((state) => state.refreshShows);

  // Refresh counts and calculate distances when import is successful
  useEffect(() => {
    if (result.success && result.tourId) {
      refreshTours();
      refreshShows();

      // Calculate distances for the imported tour
      calculateDistances();
    }
  }, [result.success, result.tourId, refreshTours, refreshShows]);

  const calculateDistances = async () => {
    if (!result.tourId) return;

    setIsCalculatingDistances(true);
    console.log('🗺️  Calculating distances for tour:', result.tourId);

    try {
      // Call backend through Next.js API proxy
      const response = await fetch(`/api/tours/${result.tourId}/calculate-distances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Entity-Id': entityId || '',
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Distances calculated:', data);
      } else {
        console.warn('⚠️  Distance calculation failed:', response.status);
      }
    } catch (error) {
      console.error('❌ Error calculating distances:', error);
    } finally {
      setIsCalculatingDistances(false);
    }
  };

  const handleViewTour = () => {
    console.log('🎯 Redirecting to /tours');
    router.push('/tours');
  };

  return (
    <div className="space-y-6">
      <div className="panel-dark p-8 text-center">
        {/* Success Icon */}
        <div className="mx-auto w-16 h-16 bg-semantic-success/20 rounded-full flex items-center justify-center mb-4 border border-semantic-success/30">
          <CheckCircle className="h-10 w-10 text-semantic-success" />
        </div>

        <h2 className="text-2xl font-bold mb-2 text-[#151713]">Import Complete!</h2>
        <p className="text-text-secondary mb-8">
          Your shows and budgets have been successfully imported
        </p>
        {!!result.duplicatesSkipped && <p className="-mt-5 mb-6 text-sm text-text-secondary">{result.duplicatesSkipped} existing {result.duplicatesSkipped === 1 ? 'date was' : 'dates were'} safely skipped.</p>}

        {/* Statistics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          <div className="p-4 bg-white/70 rounded-lg border border-black/10">
            <p className="text-3xl font-bold text-primary">{result.showsCreated}</p>
            <p className="text-sm text-text-secondary mt-1">Shows Created</p>
          </div>

          <div className="p-4 bg-white/70 rounded-lg border border-black/10">
            <p className="text-3xl font-bold text-primary">{result.budgetsCreated}</p>
            <p className="text-sm text-text-secondary mt-1">Budgets Created</p>
          </div>

          <div className="p-4 bg-white/70 rounded-lg border border-black/10">
            <p className="text-3xl font-bold text-primary">{result.lineItemsCreated}</p>
            <p className="text-sm text-text-secondary mt-1">Line Items</p>
          </div>

          <div className="p-4 bg-white/70 rounded-lg border border-black/10">
            <p className="text-3xl font-bold text-primary">1</p>
            <p className="text-sm text-text-secondary mt-1">Tour</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleViewTour}
            size="lg"
            className="gap-2"
          >
            <ExternalLink className="h-4 w-4" />
            Go to Tours
          </Button>

          <Button
            onClick={onReset}
            variant="outline"
            size="lg"
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Import More Data
          </Button>
        </div>
      </div>

      {/* Errors (if any) */}
      {result.errors && result.errors.length > 0 && (
        <div className="bg-semantic-warning/10 dark:bg-semantic-warning/10 border border-semantic-warning/30 dark:border-semantic-warning/30 rounded-lg p-4">
          <h3 className="font-semibold text-semantic-warning dark:text-semantic-warning mb-2">
            Partial Import - Some Items Failed
          </h3>
          <div className="space-y-1">
            {result.errors.map((error, index) => (
              <p key={index} className="text-sm text-semantic-warning dark:text-semantic-warning">
                • {error}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
