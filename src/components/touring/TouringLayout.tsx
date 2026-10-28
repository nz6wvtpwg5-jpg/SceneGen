'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useTours } from '@/hooks/useTours';
import { Button } from '@/components/ui/button';
import { CreateTourModal } from '@/components/tours/CreateTourModal';
import TourFilter from './TourFilter';
import TouringMap from './TouringMap';
import PromoterContactsList from './PromoterContactsList';
import type { Tour } from '@/types/tour';
import { List, Map } from 'lucide-react';

/**
 * TouringLayout Component
 * Implements BUILD_PLAN Week 5, Task 5.5 & Week 6, Tasks 6.7-6.8
 *
 * Main layout for touring page
 * Week 6: Added Create Show and Create Tour buttons
 */
export default function TouringLayout() {
  const router = useRouter();
  const { data: session } = useSession();
  const { fetchTours } = useTours();
  const [tours, setTours] = useState<Tour[]>([]);
  const [selectedTourId, setSelectedTourId] = useState<string | null>(null);
  const [selectedPromoterId, setSelectedPromoterId] = useState<string | null>(null);
  const [showCreateTourModal, setShowCreateTourModal] = useState(false);
  const [mobileView, setMobileView] = useState<'map' | 'contacts'>('map');

  useEffect(() => {
    loadTours();
  }, []);

  const loadTours = async () => {
    try {
      const data = await fetchTours();
      setTours(data);
    } catch (err) {
      console.error('Failed to load tours:', err);
    }
  };

  const handleTourCreated = async (tour: Tour) => {
    await loadTours();
    setSelectedTourId(tour.id);
    setShowCreateTourModal(false);
  };

  const handleCreateShow = () => {
    // Week 6, Task 6.7: Navigate to shows page with tour context
    const params = new URLSearchParams({ createNew: 'true' });
    if (selectedTourId) {
      params.append('tourId', selectedTourId);
    }
    router.push(`/shows?${params.toString()}`);
  };

  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden border-l">
      {/* Header */}
      <div className="mobile-safe-top shrink-0 border-b p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Touring</h1>
            <p className="text-sm text-text-tertiary">
              View your promoter contacts and shows on the map
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
            <div className="col-span-2 sm:col-span-1">
              <TourFilter
                tours={tours}
                selectedTourId={selectedTourId}
                onTourChange={setSelectedTourId}
              />
            </div>
            {/* Week 6, Task 6.8: Create Tour button */}
            <Button
              variant="outline"
              onClick={() => setShowCreateTourModal(true)}
              size="sm"
            >
              Create Tour
            </Button>
            {/* Week 6, Task 6.7: Create Show button */}
            <Button
              onClick={handleCreateShow}
              size="sm"
            >
              Create Show
            </Button>
          </div>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 border-b bg-background p-2 md:hidden" aria-label="Touring view">
        <button type="button" onClick={() => setMobileView('map')} aria-pressed={mobileView === 'map'} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold ${mobileView === 'map' ? 'bg-primary text-primary-foreground' : 'text-text-secondary'}`}><Map size={17}/>Map</button>
        <button type="button" onClick={() => setMobileView('contacts')} aria-pressed={mobileView === 'contacts'} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold ${mobileView === 'contacts' ? 'bg-primary text-primary-foreground' : 'text-text-secondary'}`}><List size={17}/>Contacts</button>
      </div>

      {/* Main Content: switchable panes on phones, split view on larger screens. */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Map (60%) */}
        <div className={`${mobileView === 'map' ? 'block' : 'hidden'} relative min-h-0 flex-1 md:block md:flex-[3]`}>
          <TouringMap
            selectedTourId={selectedTourId}
            selectedPromoterId={selectedPromoterId}
            onPromoterSelect={(promoterId) => {
              setSelectedPromoterId(promoterId);
              if (promoterId) setMobileView('map');
            }}
          />
        </div>

        {/* Contacts List (40%) */}
        <div className={`${mobileView === 'contacts' ? 'block' : 'hidden'} min-h-0 flex-1 overflow-y-auto border-l md:block md:flex-[2]`}>
          <PromoterContactsList
            selectedTourId={selectedTourId}
            selectedPromoterId={selectedPromoterId}
            onPromoterSelect={setSelectedPromoterId}
          />
        </div>
      </div>

      {/* Create Tour Modal */}
      <CreateTourModal
        isOpen={showCreateTourModal}
        onClose={() => setShowCreateTourModal(false)}
        onSuccess={handleTourCreated}
      />
    </div>
  );
}
