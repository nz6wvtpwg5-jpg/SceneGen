'use client';

import { useState, useEffect } from 'react';
import { useProfileStore } from '@/store/useProfileStore';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { X, MapPin, DollarSign, Calendar, Navigation } from 'lucide-react';
import { formatCurrency } from '@/lib/csv/parser';
import { TourMap } from '@/components/maps/TourMap';
import type { Show as ShowType } from '@/types/show';

interface TourDetailsModalProps {
  tourId: string;
  open: boolean;
  onClose: () => void;
  entityId?: string; // Optional: can be passed from parent
}

interface Budget {
  id: string;
  showId: string;
  budgetName: string;
  totalSales: number;
  totalExpenses: number;
  distance: number;
}

interface Tour {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

export function TourDetailsModal({ tourId, open, onClose, entityId: propEntityId }: TourDetailsModalProps) {
  const { activeProfile } = useProfileStore();
  const [tour, setTour] = useState<Tour | null>(null);
  const [shows, setShows] = useState<ShowType[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Use props if provided, otherwise fall back to activeProfile
  // Note: When used outside import flow, parent should pass session data
  const entityId = propEntityId || activeProfile?.id;

  useEffect(() => {
    if (open && tourId && entityId) {
      fetchTourData();
    }
  }, [open, tourId, entityId]);

  const fetchTourData = async () => {
    if (!entityId) {
      console.error('Tour details require an authenticated entity context');
      return;
    }

    console.log('🔍 TourDetailsModal: Fetching data for tour', tourId);
    setIsLoading(true);
    try {
      // Fetch tour details
      const tourRes = await fetch(`/api/tours/${tourId}`, {
        headers: {
          'X-Entity-Id': entityId,
        },
      });

      if (!tourRes.ok) {
        throw new Error(`Tour fetch failed: ${tourRes.status}`);
      }

      const tourData = await tourRes.json();
      // Extract the tour object if it's wrapped
      const tourObj = tourData.tour || tourData;
      setTour(tourObj);
      console.log('✅ TourDetailsModal: Tour loaded', tourObj);

      // Fetch shows for this tour
      const showsRes = await fetch(`/api/shows?tourId=${tourId}&entityId=${entityId}`, {
        headers: {
          'X-Entity-Id': entityId,
        },
      });

      if (showsRes.ok) {
        const showsData = await showsRes.json();
        // Extract the shows array if it's wrapped
        const showsArray = showsData.shows || showsData;
        if (Array.isArray(showsArray)) {
          const sortedShows = showsArray.sort((a: ShowType, b: ShowType) =>
            new Date(a.showDate).getTime() - new Date(b.showDate).getTime()
          );
          setShows(sortedShows);
          console.log('✅ TourDetailsModal: Shows loaded', sortedShows.length);
        }
      }

      // Fetch budgets for this tour
      const budgetsRes = await fetch(`/api/budgets?tourId=${tourId}&entityId=${entityId}`, {
        headers: {
          'X-Entity-Id': entityId,
        },
      });

      console.log('🔍 TourDetailsModal: Budgets response status', budgetsRes.status);
      if (budgetsRes.ok) {
        const budgetsData = await budgetsRes.json();
        console.log('✅ TourDetailsModal: Budgets loaded', budgetsData);
        if (Array.isArray(budgetsData)) {
          setBudgets(budgetsData);
        }
      } else {
        const errorText = await budgetsRes.text();
        console.error('❌ TourDetailsModal: Failed to fetch budgets', budgetsRes.status, errorText);
      }

    } catch (error) {
      console.error('Failed to fetch tour data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateTotals = () => {
    const totalRevenue = budgets.reduce((sum, b) => sum + (b.totalSales || 0), 0);
    const totalExpenses = budgets.reduce((sum, b) => sum + (b.totalExpenses || 0), 0);

    // Get total miles from budget distance fields (calculated by backend during import)
    const totalMiles = budgets.reduce((sum, b) => sum + (b.distance || 0), 0);

    const totalShows = shows.length;

    console.log('💰 TourDetailsModal: Calculating totals', {
      budgetsCount: budgets.length,
      totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
      totalMiles: Math.round(totalMiles),
      budgets: budgets.map(b => ({ id: b.id, showId: b.showId, totalSales: b.totalSales, totalExpenses: b.totalExpenses, distance: b.distance }))
    });

    return {
      totalRevenue,
      totalExpenses,
      profit: totalRevenue - totalExpenses,
      totalMiles: Math.round(totalMiles),
      totalShows,
    };
  };

  const totals = calculateTotals();

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-7xl h-[90vh] p-0 gap-0">
        <DialogTitle className="sr-only">
          {tour?.name || 'Tour Details'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          View tour details including route, budget breakdown, and show information for {tour?.name || 'this tour'}
        </DialogDescription>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-2xl font-bold">{tour?.name || 'Tour Details'}</h2>
            {shows.length > 0 && (
              <p className="text-sm text-text-tertiary">
                {new Date(shows[0].showDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} - {new Date(shows[shows.length - 1].showDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-5 gap-4 px-6 py-4 bg-surface-elevated/50 border-b">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">{totals.totalShows}</p>
            <p className="text-xs text-text-tertiary">Shows</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-semantic-success">{formatCurrency(totals.totalRevenue)}</p>
            <p className="text-xs text-text-tertiary">Revenue</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-semantic-error">{formatCurrency(totals.totalExpenses)}</p>
            <p className="text-xs text-text-tertiary">Expenses</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{formatCurrency(totals.profit)}</p>
            <p className="text-xs text-text-tertiary">Profit</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-purple-600">{totals.totalMiles.toLocaleString()}</p>
            <p className="text-xs text-text-tertiary">Miles</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="route" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="mx-6 mt-4 w-fit flex-shrink-0">
            <TabsTrigger value="route" className="gap-2">
              <Navigation className="h-4 w-4" />
              Route
            </TabsTrigger>
            <TabsTrigger value="budget" className="gap-2">
              <DollarSign className="h-4 w-4" />
              Budget
            </TabsTrigger>
            <TabsTrigger value="details" className="gap-2">
              <Calendar className="h-4 w-4" />
              Details
            </TabsTrigger>
          </TabsList>

          {/* Route Tab */}
          <TabsContent value="route" className="flex-1 px-6 pb-6 overflow-hidden mt-0 flex flex-col">
            <h3 className="text-lg font-semibold mb-4">Tour Route</h3>

            {isLoading ? (
              <div className="text-center py-12">
                <p className="text-text-tertiary">Loading route...</p>
              </div>
            ) : shows.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-tertiary">No shows found for this tour</p>
              </div>
            ) : (
              <div className="flex-1 rounded-lg overflow-hidden border">
                <TourMap shows={shows} />
              </div>
            )}
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget" className="flex-1 px-6 pb-6 overflow-y-auto mt-0">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Budget Breakdown</h3>

              {isLoading ? (
                <div className="text-center py-12">
                  <p className="text-text-tertiary">Loading budget...</p>
                </div>
              ) : budgets.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-text-tertiary">No budget data found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {shows.map((show) => {
                    const budget = budgets.find(b => b.showId === show.id);
                    if (!budget) return null;

                    const profit = budget.totalSales - budget.totalExpenses;

                    return (
                      <div key={show.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-semibold">{show.venueCity}, {show.venueState}</h4>
                            <p className="text-sm text-text-tertiary">
                              {new Date(show.showDate).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={`text-lg font-bold ${profit >= 0 ? 'text-semantic-success' : 'text-semantic-error'}`}>
                              {formatCurrency(profit)}
                            </p>
                            <p className="text-xs text-text-tertiary">Profit</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <p className="text-text-tertiary">Revenue</p>
                            <p className="font-semibold text-semantic-success">{formatCurrency(budget.totalSales)}</p>
                          </div>
                          <div>
                            <p className="text-text-tertiary">Expenses</p>
                            <p className="font-semibold text-semantic-error">{formatCurrency(budget.totalExpenses)}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="flex-1 px-6 pb-6 overflow-y-auto mt-0">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-4">Tour Information</h3>

              <div className="border rounded-lg p-4 space-y-4">
                <div>
                  <p className="text-sm text-text-tertiary">Tour Name</p>
                  <p className="font-semibold">{tour?.name}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-tertiary">Start Date</p>
                    <p className="font-semibold">
                      {tour?.start_date && new Date(tour.start_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-tertiary">End Date</p>
                    <p className="font-semibold">
                      {tour?.end_date && new Date(tour.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <p className="text-sm text-text-tertiary">Total Shows</p>
                    <p className="font-semibold">{shows.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-text-tertiary">Total Distance</p>
                    <p className="font-semibold">{totals.totalMiles.toLocaleString()} miles</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-text-tertiary">Avg. Miles/Show</p>
                    <p className="font-semibold">
                      {shows.length > 0 ? Math.round(totals.totalMiles / shows.length).toLocaleString() : 0} miles
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-text-tertiary">Avg. Profit/Show</p>
                    <p className="font-semibold">
                      {formatCurrency(shows.length > 0 ? totals.profit / shows.length : 0)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
