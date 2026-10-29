'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useTours } from '@/hooks/useTours';
import { useCountRefreshStore } from '@/store/useCountRefreshStore';
import { useProfileStore } from '@/store/useProfileStore';
import { CreateTourModal } from '@/components/tours/CreateTourModal';
import { ListSkeleton, TourCardSkeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { Upload, MapPin, Eye, Trash2, CalendarDays } from 'lucide-react';
import type { Tour } from '@/types/tour';
import { useConfirmDialog } from '@/components/ui/confirm-dialog-provider';
import { MobileToursList } from '@/components/tours/mobile-tours-list';

interface TourStats {
  showCount: number;
  currencyTotals: Array<{
    currency: string;
    totalFees: number;
    totalCosts: number;
    profit: number;
  }>;
  totalMiles: number | null;
}

/**
 * Tours Page
 * Implements BUILD_PLAN Week 4
 *
 * List and manage tours (artist-only)
 * Promoters should see "Artist feature only" message
 */
export default function ToursPage() {
  const confirmDialog = useConfirmDialog();
  const router = useRouter();
  const { data: session, status } = useSession();
  const { activeProfile } = useProfileStore();
  const { fetchTours, deleteTour, isLoading } = useTours();
  const refreshTours = useCountRefreshStore((state) => state.refreshTours);
  const refreshShows = useCountRefreshStore((state) => state.refreshShows);
  const [tours, setTours] = useState<Tour[]>([]);
  const [tourStats, setTourStats] = useState<Record<string, TourStats>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadGeneration = useRef(0);

  // Check if user is an artist
  // Handle both camelCase (entityType) and snake_case (entity_type) from backend
  const isArtist = activeProfile?.entityType === 'artist' ||
    (activeProfile as any)?.entity_type === 'artist';

  // Show loading while session or profile is loading
  const isLoadingAuth = status === 'loading' || (!activeProfile && status === 'authenticated');

  useEffect(() => {
    // A workspace switch must invalidate any request from the previous workspace.
    ++loadGeneration.current;
    setTours([]);
    setTourStats({});
    setError(null);
    if (isArtist && activeProfile?.id && status === 'authenticated' && session?.user?.id) {
      void loadTours();
    }
    return () => { ++loadGeneration.current; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isArtist, activeProfile?.id, status, session?.user?.id]);

  const loadTours = async () => {
    const generation = ++loadGeneration.current;
    try {
      const data = await fetchTours();
      if (generation !== loadGeneration.current) return;
      setTours(data);
      setError(null);
      if (data.length > 0) void fetchTourStats(data, generation, activeProfile?.id || '');
    } catch (err) {
      if (generation !== loadGeneration.current) return;
      const errorMsg = err instanceof Error ? err.message : 'Failed to load tours';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const fetchTourStats = async (tours: Tour[], generation: number, workspaceId: string) => {
    try {
      const stats: Record<string, TourStats> = {};

      for (const tour of tours) {
        // Fetch shows for this tour
        const showsResponse = await fetch(
          `/api/shows?tourId=${tour.id}&entityId=${workspaceId}`,
          {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-Entity-Id': workspaceId,
            }
          }
        );

        if (!showsResponse.ok) {
          console.warn(`Failed to fetch shows for tour ${tour.id}`);
          continue;
        }

        const showsData = await showsResponse.json();
        const shows = showsData.shows || showsData;

        // Fetch budgets for shows in this tour
        const budgetsResponse = await fetch(
          `/api/budgets?tourId=${tour.id}&entityId=${workspaceId}`,
          {
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-Entity-Id': workspaceId,
            }
          }
        );

        let legacyBudgetMiles = 0;
        let hasBudgetMileage = false;
        const currencyTotals = new Map<string, { currency: string; totalFees: number; totalCosts: number; profit: number }>();

        // Imported performance fees live on shows, independently of budgets.
        // Count each show once, including shows that have no budget yet.
        const countedShows = new Set<string>();
        shows.forEach((show: any) => {
          if (countedShows.has(show.id)) return;
          countedShows.add(show.id);
          const candidate = String(show.currency || tour.currency || '').trim().toUpperCase();
          const currency = /^[A-Z]{3}$/.test(candidate) ? candidate : 'UNSPECIFIED';
          const total = currencyTotals.get(currency) || { currency, totalFees: 0, totalCosts: 0, profit: 0 };
          total.totalFees += Number(show.guarantee ?? show.guaranteedFee ?? show.fee ?? 0) || 0;
          currencyTotals.set(currency, total);
        });

        if (budgetsResponse.ok) {
          const budgets = await budgetsResponse.json();
          console.log('📊 Budgets for tour', tour.id, ':', budgets);

          if (budgets && Array.isArray(budgets) && budgets.length > 0) {
            budgets.forEach((budget: any) => {
              // Budget revenue includes merch and is used only for overall profit.
              const revenue = Number(budget.totalSales ?? 0) || 0;
              const expenses = parseFloat(budget.totalExpenses || 0);
              const distance = parseFloat(budget.distance || 0);

              const candidate = typeof budget.currency === 'string' ? budget.currency.trim().toUpperCase() : '';
              const currency = /^[A-Z]{3}$/.test(candidate) ? candidate : 'UNSPECIFIED';
              const total = currencyTotals.get(currency) || { currency, totalFees: 0, totalCosts: 0, profit: 0 };
              total.totalCosts += expenses;
              total.profit += revenue - expenses;
              currencyTotals.set(currency, total);
              if (budget.distance != null && Number.isFinite(distance) && distance > 0) { legacyBudgetMiles += distance; hasBudgetMileage = true; }
            });
          } else {
            console.warn('⚠️ Budgets response was OK but no budgets found or invalid format:', budgets);
          }
        } else {
          const errorText = await budgetsResponse.text();
          console.error('❌ Failed to fetch budgets for tour', tour.id);
          console.error('❌ Status:', budgetsResponse.status, budgetsResponse.statusText);
          console.error('❌ Response:', errorText);
        }

        // Operational mileage is stored on tour route legs, not in budgets.
        // Retain old manually entered budget mileage only for legacy tours.
        let totalMiles: number | null = hasBudgetMileage ? legacyBudgetMiles : null;
        const tourResponse = await fetch(`/api/tours/${tour.id}`, {
          credentials: 'include',
          headers: { 'X-Entity-Id': workspaceId },
          cache: 'no-store',
        });
        if (tourResponse.ok) {
          const tourRecord = await tourResponse.json();
          const mileage = tourRecord.tour?.routeMileage;
          if (mileage?.calculated && typeof mileage.totalMiles === 'number') {
            totalMiles = mileage.totalMiles;
          } else if (mileage && !mileage.calculated && !hasBudgetMileage) {
            totalMiles = null;
          }
        }

        stats[tour.id] = {
          showCount: shows.length,
          currencyTotals: [...currencyTotals.values()].sort((left, right) => left.currency.localeCompare(right.currency)),
          totalMiles,
        };

        console.log('💾 Setting stats for tour', tour.id, ':', stats[tour.id]);
      }

      console.log('✅ Final tour stats object:', stats);
      if (generation !== loadGeneration.current) return;
      setTourStats(stats);
      console.log('✅ setTourStats called with', Object.keys(stats).length, 'tours');
    } catch (err) {
      console.error('Error fetching tour stats:', err);
    }
  };

  const handleCreateSuccess = async (tour: Tour) => {
    await loadTours();
    setShowCreateModal(false);
    toast.success('Tour created successfully!');
  };

  const handleDeleteTour = async (tourId: string) => {
    if (!await confirmDialog({
      title: 'Delete this tour?',
      description: 'Its shows will remain, but they will no longer be grouped as a tour.',
      confirmLabel: 'Delete tour',
      tone: 'destructive',
    })) {
      return;
    }

    try {
      await deleteTour(tourId);
      toast.success('Tour deleted successfully');
      await loadTours();
      // Refresh sidebar counts immediately
      refreshTours();
      refreshShows();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete tour';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleViewTour = (tourId: string) => {
    console.log('🔍 Navigating to tour:', tourId);
    console.log('🔍 Tour ID type:', typeof tourId);
    console.log('🔍 Is valid UUID:', /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tourId));
    router.push(`/tours/${tourId}`);
  };

  // Promoter guard - but show loading state first
  if (isLoadingAuth) {
    return (
      <div className="scene-page">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isArtist) {
    return (
      <div className="scene-page">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-2 text-foreground">Artist Feature Only</h2>
          <p className="text-text-secondary">
            Tours are available for artist profiles only. Promoters can view individual shows instead.
          </p>
          <Button
            onClick={() => router.push('/shows')}
            className="mt-6"
          >
            View Shows
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="scene-page w-full">
      <MobileToursList tours={tours} stats={tourStats} loading={isLoading} error={error} onCreate={() => setShowCreateModal(true)} onView={handleViewTour} onDelete={handleDeleteTour} />
      <div className="hidden sm:block">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-5 border-b border-black/10 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="scene-kicker">Route desk</p>
            <h1 className="scene-title">Tours</h1>
            <p className="scene-copy">Build the route, group the dates and keep the whole run legible.</p>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            size="lg"
          >
            + Create Tour
          </Button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-semantic-error/10 border border-semantic-error/30 rounded-lg text-semantic-error">
            {error}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <ListSkeleton count={3} ItemSkeleton={TourCardSkeleton} />
        )}

        {/* Empty State */}
        {!isLoading && tours.length === 0 && (
          <div className="scene-panel py-16 text-center">
            <p className="scene-kicker">First movement</p>
            <h3 className="mt-3 text-3xl font-black tracking-[-0.04em] text-[#151713]">No route on the board yet.</h3>
            <p className="text-text-secondary mb-6">
              Create a tour to connect multiple shows into one working route.
            </p>
            <Button onClick={() => setShowCreateModal(true)}>
              Create Your First Tour
            </Button>
          </div>
        )}

        {/* Tours List */}
        {!isLoading && tours.length > 0 && (
          <div className="grid gap-4">
            {tours.map((tour) => {
              const stats = tourStats[tour.id];

              return (
                <div
                  key={tour.id}
                  className="panel-dark p-6 hover:panel-glow transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold mb-2 text-foreground">{tour.name}</h3>
                      {tour.notes && (
                        <p className="text-text-secondary text-sm mb-3">
                          {tour.notes}
                        </p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-text-secondary">
                        {tour.startDate && tour.endDate ? (
                          <span className="flex items-center gap-2">
                            <CalendarDays size={15} /> {new Date(tour.startDate).toLocaleDateString()} - {new Date(tour.endDate).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2 text-text-muted">
                            <CalendarDays size={15} /> No shows scheduled yet
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewTour(tour.id)}
                        className="gap-2 hover:bg-accent-cyan/10 hover:text-accent-cyan hover:border-accent-cyan/50 transition-all"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteTour(tour.id)}
                        className="gap-2 text-semantic-error border-semantic-error/30 hover:bg-semantic-error/10 hover:border-semantic-error/50 transition-all"
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>

                  {/* Tour Statistics */}
                  {stats && (
                    <div className="grid grid-cols-5 gap-4 pt-4 border-t border-black/10">
                      <div>
                        <p className="text-xs text-text-secondary mb-1">Shows</p>
                        <p className="text-lg font-semibold text-foreground">{stats.showCount}</p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary mb-1">Total Fees</p>
                        <p className="text-lg font-semibold text-semantic-success">
                          {stats.currencyTotals.length ? stats.currencyTotals.map((total) => (
                            <span key={total.currency} className="block">
                              {total.currency === 'UNSPECIFIED' ? `${total.totalFees.toFixed(2)} (not set)` : formatCurrency(total.totalFees, total.currency)}
                            </span>
                          )) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary mb-1">Total Costs</p>
                        <p className="text-lg font-semibold text-semantic-warning">
                          {stats.currencyTotals.length ? stats.currencyTotals.map((total) => (
                            <span key={total.currency} className="block">
                              {total.currency === 'UNSPECIFIED' ? `${total.totalCosts.toFixed(2)} (not set)` : formatCurrency(total.totalCosts, total.currency)}
                            </span>
                          )) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary mb-1">Profit incl. merch</p>
                        <p className="text-lg font-semibold">
                          {stats.currencyTotals.length ? stats.currencyTotals.map((total) => (
                            <span key={total.currency} className={`block ${total.profit >= 0 ? 'text-semantic-success' : 'text-semantic-error'}`}>
                              {total.currency === 'UNSPECIFIED' ? `${total.profit.toFixed(2)} (not set)` : formatCurrency(total.profit, total.currency)}
                            </span>
                          )) : '—'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-text-secondary mb-1">Total Miles</p>
                        <p className="text-lg font-semibold text-accent-cyan">
                          {stats.totalMiles == null ? 'Not calculated' : `${stats.totalMiles.toLocaleString()} mi`}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Tour Modal */}
      <CreateTourModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={handleCreateSuccess}
      />
    </div>
  );
}
