"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { useOnboardingRedirect } from "@/hooks/useOnboardingRedirect";
import { useTours } from "@/hooks/useTours";
import { useShows } from "@/hooks/useShows";
import { useProfileStore } from "@/store/useProfileStore";
import { useCountRefreshStore } from "@/store/useCountRefreshStore";
import EditTourModal from "@/components/tours/EditTourModal";
import CreateShowForm from "@/components/shows/CreateShowForm";
import ShareShowModal from "@/components/shows/ShareShowModal";
import { TourMap } from "@/components/maps/TourMap";
import type { Tour } from "@/types/tour";
import type { Show } from "@/types/show";
import { useConfirmDialog } from "@/components/ui/confirm-dialog-provider";
import { Route } from "lucide-react";
import TourShowRow from "@/components/tours/TourShowRow";

type CurrencyTotal = {
  currency: string;
  revenue: number;
  expenses: number;
  profit: number;
};

function formatMoney(amount: number, currency: string) {
  if (currency === 'UNSPECIFIED') return `${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (currency not set)`;
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
}

function groupBudgetTotalsByCurrency(budgets: any[]): CurrencyTotal[] {
  const grouped = new Map<string, CurrencyTotal>();
  budgets.forEach((budget) => {
    const candidate = typeof budget.currency === 'string' ? budget.currency.trim().toUpperCase() : '';
    const currency = /^[A-Z]{3}$/.test(candidate) ? candidate : 'UNSPECIFIED';
    const current = grouped.get(currency) || { currency, revenue: 0, expenses: 0, profit: 0 };
    current.revenue += Number(budget.totalSales) || 0;
    current.expenses += Number(budget.totalExpenses) || 0;
    current.profit = current.revenue - current.expenses;
    grouped.set(currency, current);
  });
  return [...grouped.values()].sort((left, right) => left.currency.localeCompare(right.currency));
}

/**
 * Tour Details Page
 * Implements BUILD_PLAN Week 7, Task 7.9
 * Features:
 * - Display tour name, dates, notes
 * - Shows list (chronological)
 * - Edit tour button
 * - Delete tour with confirmation
 */
export default function TourDetailsPage() {
  const confirmDialog = useConfirmDialog();
  const router = useRouter();
  const params = useParams();
  const tourId = params.id as string;
  const { data: session } = useSession();

  const { isChecking: isCheckingEntities } = useOnboardingRedirect();
  const { fetchTour, updateTour, deleteTour, isLoading: tourLoading } = useTours();
  const { fetchShows, deleteShow } = useShows();
  const { activeProfile } = useProfileStore();
  const refreshTours = useCountRefreshStore((state) => state.refreshTours);
  const refreshShows = useCountRefreshStore((state) => state.refreshShows);

  const [tour, setTour] = useState<Tour | null>(null);
  const [shows, setShows] = useState<Show[]>([]);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [routeMileage, setRouteMileage] = useState<{calculated:boolean;stale:boolean;totalMiles:number|null;legs:Array<{miles:number}>;legCount:number}|null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [error, setError] = useState('');
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditShowModal, setShowEditShowModal] = useState(false);
  const [showToEdit, setShowToEdit] = useState<Show | null>(null);
  const [isCalculatingDistances, setIsCalculatingDistances] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showToShare, setShowToShare] = useState<Show | null>(null);
  const [activeView, setActiveView] = useState<'shows' | 'routing'>('shows');

  useEffect(() => {
    const loadTourData = async () => {
      // Prevent multiple redirects
      if (isRedirecting) {
        console.log('🚫 Already redirecting, skipping...');
        return;
      }

      // Wait for session and active profile
      if (!session?.user?.id || !activeProfile?.id) {
        console.log('⏳ Waiting for session and active profile...');
        return;
      }

      // Validate tour ID format (UUID)
      const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tourId);
      console.log('🔍 Tour ID:', tourId, 'Valid UUID:', isValidUUID);

      if (!isValidUUID) {
        console.error('❌ Invalid tour ID format:', tourId);
        setIsRedirecting(true);
        toast.error('Invalid tour ID');
        router.push('/tours');
        return;
      }

      try {
        console.log('📡 Fetching tour:', tourId);
        const [tourData, showsData] = await Promise.all([
          fetchTour(tourId),
          fetchShows(tourId)
        ]);
        setTour(tourData);
        setRouteMileage(tourData.routeMileage || null);
        setShows(showsData.sort((a, b) =>
          new Date(a.showDate).getTime() - new Date(b.showDate).getTime()
        ));
        setEditName(tourData.name);
        setEditNotes(tourData.notes || '');

        // Fetch budgets for this tour
        try {
          const budgetsRes = await fetch(`/api/budgets?tourId=${tourId}&entityId=${activeProfile.id}`, {
            headers: {
              'X-Entity-Id': activeProfile.id,
            },
          });
          if (budgetsRes.ok) {
            const budgetsData = await budgetsRes.json();
            console.log('✅ Tour Details Page: Budgets loaded', budgetsData);
            setBudgets(Array.isArray(budgetsData) ? budgetsData : []);
          } else {
            const errorText = await budgetsRes.text();
            console.error('❌ Budgets fetch failed:', budgetsRes.status, errorText);
          }
        } catch (err) {
          console.error('❌ Failed to fetch budgets:', err);
        }
      } catch (err: any) {
        console.error('❌ Failed to fetch tour:', err);
        // If tour not found, redirect to tours list
        if (err.message.includes('Failed to fetch tour') || err.message.includes('Unauthorized')) {
          setIsRedirecting(true);
          toast.error('Tour not found or unauthorized');
          router.push('/tours');
          return;
        }
        setError(err.message || 'Failed to load tour');
      }
    };

    if (!isCheckingEntities && tourId && !isRedirecting) {
      loadTourData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckingEntities, tourId, isRedirecting, session, activeProfile]);

  const handleUpdateTour = async () => {
    if (!editName.trim()) {
      setError('Tour name is required');
      return;
    }

    try {
      const updated = await updateTour(tourId, {
        name: editName,
        notes: editNotes
      });
      setTour(updated);
      setIsEditing(false);
      setError('');
      toast.success('Tour updated successfully!');
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to update tour';
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleDeleteTour = async () => {
    if (!await confirmDialog({
      title: 'Delete this tour?',
      description: 'All shows will remain and become standalone shows.',
      confirmLabel: 'Delete tour',
      tone: 'destructive',
    })) {
      return;
    }

    try {
      await deleteTour(tourId);
      refreshTours();
      refreshShows();
      toast.success('Tour deleted successfully');
      router.push('/tours');
    } catch (err) {
      console.error('Failed to delete tour:', err);
      toast.error('Failed to delete tour. Please try again.');
    }
  };

  const handleEditShow = (show: Show) => {
    setShowToEdit(show);
    setShowEditShowModal(true);
  };

  const handleDeleteShow = async (showId: string) => {
    if (!await confirmDialog({
      title: 'Permanently delete this show?',
      description: 'This action cannot be undone.',
      confirmLabel: 'Delete show',
      tone: 'destructive',
    })) {
      return;
    }

    try {
      await deleteShow(showId);
      toast.success("Show deleted successfully");
      // Refresh shows list
      const updatedShows = await fetchShows(tourId);
      setShows(updatedShows.sort((a, b) =>
        new Date(a.showDate).getTime() - new Date(b.showDate).getTime()
      ));
    } catch (err) {
      console.error("Failed to delete show:", err);
      toast.error("Failed to delete show. Please try again.");
    }
  };

  const calculateTotals = () => ({
    currencies: groupBudgetTotalsByCurrency(budgets),
    totalMiles: routeMileage?.calculated ? routeMileage.totalMiles : null,
  });

  const handleRecalculateDistances = async () => {
    if (!activeProfile?.id || !session?.user?.id) {
      toast.error('Not authenticated');
      return;
    }
    setIsCalculatingDistances(true);
    try {
      const response = await fetch(`/api/tours/${tourId}/calculate-distances`, {
        method: 'POST',
        headers: { 'X-Entity-Id': activeProfile.id },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage = typeof data.error === 'string'
          ? data.error : data.error?.message || 'Unable to calculate route mileage';
        throw new Error(errorMessage);
      }
      if (!data.routeMileage?.calculated) {
        throw new Error('No verified route mileage was returned. Existing distances are unchanged.');
      }
      setRouteMileage(data.routeMileage);
      toast.success(`Updated ${data.distancesCalculated} driving legs`, {
        description: data.approximateStops > 0
          ? `${data.approximateStops} stops used approximate city locations.`
          : 'All route stops used venue locations.',
      });
    } catch (error) {
      toast.error('Route mileage not updated', {
        description: error instanceof Error ? error.message : 'Existing mileage has been preserved.',
      });
    } finally {
      setIsCalculatingDistances(false);
    }
  };

  const totals = calculateTotals();

  if (isRedirecting) {
    return (
      <div className="w-full min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center panel-dark p-12">
          <div className="w-16 h-16 border-4 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Redirecting...</h2>
          <p className="text-text-tertiary">Taking you back to tours list</p>
        </div>
      </div>
    );
  }

  if (isCheckingEntities || !tour) {
    return (
      <div className="w-full min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center panel-dark p-12">
          <div className="w-16 h-16 border-4 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-bold text-foreground">Loading tour...</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-bg-primary">
      <div className="relative container mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              {isEditing ? (
                <div className="space-y-4 panel-dark p-6">
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground">Tour Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-elevated border border-border-subtle rounded-xl text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-foreground">Notes</label>
                    <textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      className="w-full px-4 py-3 bg-surface-elevated border border-border-subtle rounded-xl text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan/50 transition-all resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleUpdateTour}
                      className="px-6 py-3 bg-gradient-to-r from-[#ff5a36] via-[#f05a32] to-[#c8f135] text-foreground rounded-xl font-semibold hover:shadow-glow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
                      disabled={tourLoading}
                    >
                      Save Changes
                    </button>
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditName(tour.name);
                        setEditNotes(tour.notes || '');
                        setError('');
                      }}
                      className="px-6 py-3 bg-surface-elevated border border-border-subtle text-foreground rounded-xl font-semibold hover:bg-surface-hover transition-all"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h1 className="text-5xl font-bold mb-3 text-gradient-accent">
                    {tour.name}
                  </h1>
                  <p className="text-lg text-text-tertiary font-medium">
                    {new Date(tour.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(tour.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  {tour.notes && (
                    <p className="mt-4 text-foreground bg-surface-elevated p-4 rounded-xl border border-border-subtle">{tour.notes}</p>
                  )}
                </>
              )}
            </div>

            {!isEditing && (
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(true)}
                  className="px-5 py-2.5 bg-surface-elevated backdrop-blur-sm border border-border-subtle text-foreground rounded-xl font-medium hover:bg-surface-hover transition-all"
                >
                  Edit Tour
                </button>
                <button
                  onClick={handleRecalculateDistances}
                  disabled={isCalculatingDistances || shows.length < 2}
                  className="px-5 py-2.5 bg-gradient-to-r from-accent-cyan/10 to-accent-purple/10 backdrop-blur-sm border border-accent-cyan/30 text-accent-cyan rounded-xl font-medium hover:bg-gradient-to-r hover:from-accent-cyan/20 hover:to-accent-purple/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Update mileage using actual driving routes. Financial data is not changed."
                >
                  <Route size={17} className="mr-2 inline" />{isCalculatingDistances ? 'Updating mileage...' : 'Update route mileage'}
                </button>
                <button
                  onClick={handleDeleteTour}
                  className="px-5 py-2.5 bg-semantic-error/10 backdrop-blur-sm border border-semantic-error/20 text-semantic-error rounded-xl font-medium hover:bg-semantic-error/20 transition-all"
                >
                  Delete Tour
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="p-4 bg-semantic-error/10 border border-semantic-error/20 text-semantic-error rounded-xl backdrop-blur-sm">
              {error}
            </div>
          )}
        </div>

        {/* Tour Stats */}
        <div className="mb-7 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <div className="panel-dark px-4 py-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Shows</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{shows.filter((show) => !['off_day', 'travel_day'].includes(show.showType || 'show')).length}</p>
          </div>
          <div className="panel-dark px-4 py-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Revenue</p>
            <div className="mt-1 space-y-0.5">
              {totals.currencies.length ? totals.currencies.map((total) => (
                <p key={total.currency} className="text-lg font-bold text-gradient-accent">{formatMoney(total.revenue, total.currency)}</p>
              )) : <p className="text-sm font-bold text-text-muted">No budgets</p>}
            </div>
          </div>
          <div className="panel-dark px-4 py-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Expenses</p>
            <div className="mt-1 space-y-0.5">
              {totals.currencies.length ? totals.currencies.map((total) => (
                <p key={total.currency} className="text-lg font-bold text-semantic-error">{formatMoney(total.expenses, total.currency)}</p>
              )) : <p className="text-sm font-bold text-text-muted">No budgets</p>}
            </div>
          </div>
          <div className="panel-dark px-4 py-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Net profit</p>
            <div className="mt-1 space-y-0.5">
              {totals.currencies.length ? totals.currencies.map((total) => (
                <p key={total.currency} className={`text-lg font-bold ${total.profit >= 0 ? 'text-gradient-accent' : 'text-semantic-error'}`}>
                  {formatMoney(total.profit, total.currency)}
                </p>
              )) : <p className="text-sm font-bold text-text-muted">No budgets</p>}
            </div>
          </div>
          <div className="panel-dark px-4 py-3.5">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-tertiary">Miles</p>
            <p className="mt-1 text-2xl font-bold text-gradient-accent">
              {totals.totalMiles == null ? 'Not calculated' : totals.totalMiles.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Shows List */}
        <div>
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => setActiveView('shows')}
              className={`text-3xl font-bold transition-all ${
                activeView === 'shows'
                  ? 'text-gradient-accent'
                  : 'text-text-tertiary hover:text-foreground'
              }`}
            >
              Shows
            </button>
            <button
              onClick={() => setActiveView('routing')}
              className={`text-3xl font-bold transition-all ${
                activeView === 'routing'
                  ? 'text-gradient-accent'
                  : 'text-text-tertiary hover:text-foreground'
              }`}
            >
              Routing
            </button>
          </div>

          {/* Shows View */}
          {activeView === 'shows' && (
            <>
              {shows.length === 0 ? (
            <div className="text-center py-16 panel-dark">
              <div className="mb-6">
                <svg className="w-16 h-16 mx-auto text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <p className="text-xl font-semibold text-foreground mb-3">No shows in this tour yet</p>
              <p className="text-text-tertiary mb-6">Add shows to start building your tour itinerary</p>
              <button
                onClick={() => router.push('/shows')}
                className="px-8 py-3 bg-gradient-to-r from-[#ff5a36] via-[#f05a32] to-[#c8f135] text-foreground rounded-xl font-semibold hover:shadow-glow-lg hover:scale-[1.02] transition-all"
              >
                Add Shows to Tour
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {shows.map((show, index) => (
                <TourShowRow
                  key={show.id}
                  show={show}
                  index={index}
                  budget={budgets.find((budget) => budget.showId === show.id)}
                  tourCurrency={tour.currency}
                  onDaySheet={() => router.push(`/shows/${show.id}`)}
                  onEdit={() => handleEditShow(show)}
                  onShare={() => { setShowToShare(show); setShowShareModal(true); }}
                  onDelete={() => { void handleDeleteShow(show.id); }}
                />
              ))}
            </div>
          )}
          </>
          )}

          {/* Routing View */}
          {activeView === 'routing' && (
            <div className="space-y-6">
              {/* Map Container */}
              <div className="overflow-hidden rounded-2xl border border-border-subtle bg-surface-elevated shadow-sm">
                <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border-subtle px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff5738]">Route overview</p>
                    <h3 className="mt-1 text-xl font-black text-foreground">{shows.length} stops across {totals.totalMiles == null ? "mileage not calculated" : totals.totalMiles.toLocaleString() + " miles"}</h3>
                  </div>
                  <p className="max-w-md text-xs text-text-tertiary">The map stays locked while you scroll. Choose Explore map when you want to move or zoom it.</p>
                </div>
                {shows.length === 0 ? (
                  <div className="flex h-[440px] w-full items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-surface-elevated">
                    <div className="text-center p-8">
                      <div className="mb-4">
                        <svg className="w-16 h-16 mx-auto text-text-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                      </div>
                      <h4 className="text-lg font-semibold text-foreground mb-2">No Shows to Map</h4>
                      <p className="text-text-secondary text-sm max-w-md mx-auto mb-4">
                        Add shows to this tour to see them on the route map.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="h-[460px] w-full overflow-hidden sm:h-[520px]">
                    <TourMap
                      shows={shows}
                      totalMiles={totals.totalMiles ?? undefined}
                      startDate={tour.startDate}
                      endDate={tour.endDate}
                      currency={tour.currency}
                    />
                  </div>
                )}
              </div>

              {/* Route Summary */}
              <div className="rounded-2xl border border-border-subtle bg-surface-elevated shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-subtle px-5 py-4 sm:px-6">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[#ff5738]">Itinerary</p>
                    <h3 className="mt-1 text-xl font-black text-foreground">Route stops</h3>
                  </div>
                  <div className="flex gap-2 text-xs font-bold text-text-secondary">
                    <span className="rounded-full bg-surface-hover px-3 py-2">{shows.length} dates</span>
                    <span className="rounded-full bg-surface-hover px-3 py-2">{Math.ceil((new Date(tour.endDate).getTime() - new Date(tour.startDate).getTime()) / 86400000)} days</span>
                  </div>
                </div>
                <div className="divide-y divide-border-subtle">
                  {shows.map((show, index) => (
                    <button key={show.id} type="button" onClick={() => router.push(`/shows/${show.id}`)} className="grid w-full grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 px-5 py-3.5 text-left transition hover:bg-surface-hover sm:grid-cols-[36px_110px_minmax(0,1fr)_minmax(130px,auto)_auto] sm:px-6">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ff5738]/10 text-xs font-black text-[#ff5738]">
                        {index + 1}
                      </div>
                      <p className="hidden text-xs font-bold text-text-secondary sm:block">{new Date(show.showDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      <div className="min-w-0">
                        <p className="truncate font-bold text-foreground">{show.venueName || show.venueCity || 'Location TBC'}</p>
                        <p className="truncate text-xs text-text-tertiary sm:hidden">{new Date(show.showDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                      </div>
                      <p className="hidden truncate text-xs text-text-secondary sm:block">{[show.venueCity, show.venueCountry].filter(Boolean).join(', ') || 'Location TBC'}</p>
                      <span className="text-xs font-bold text-text-tertiary">{budgets.find(b => b.showId === show.id)?.distance > 0 ? `${budgets.find(b => b.showId === show.id)?.distance} mi` : 'Open →'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Edit Tour Modal */}
      {tour && (
        <EditTourModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onRename={async (name) => {
            const updated = await updateTour(tourId, { name });
            setTour(updated);
            refreshTours();
            toast.success('Tour name updated');
          }}
          tourId={tourId}
          tourName={tour.name}
        />
      )}

      {/* Edit Show Modal */}
      {showEditShowModal && showToEdit && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Edit Show</h2>
              <button type="button"
                onClick={() => {
                  setShowEditShowModal(false);
                  setShowToEdit(null);
                }}
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5 shrink-0"><path d="m6 6 12 12M18 6 6 18" /></svg><span>Close</span>
              </button>
            </div>
            <CreateShowForm
              show={showToEdit}
              onSuccess={async () => {
                setShowEditShowModal(false);
                setShowToEdit(null);
                toast.success("Show updated successfully");
                // Refresh shows list
                const updatedShows = await fetchShows(tourId);
                setShows(updatedShows.sort((a, b) =>
                  new Date(a.showDate).getTime() - new Date(b.showDate).getTime()
                ));
              }}
              onCancel={() => {
                setShowEditShowModal(false);
                setShowToEdit(null);
              }}
            />
          </div>
        </div>
      )}

      {/* Share Show Modal */}
      {showShareModal && showToShare && activeProfile && (
        <ShareShowModal
          isOpen={showShareModal}
          onClose={() => {
            setShowShareModal(false);
            setShowToShare(null);
          }}
          showId={showToShare.id}
          showName={showToShare.venueName || showToShare.venueCity || 'Tour stop'}
          entityId={activeProfile.id}
        />
      )}
    </div>
  );
}
