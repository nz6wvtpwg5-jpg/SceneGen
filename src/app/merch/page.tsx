'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RefreshCw, ShoppingBag, DollarSign, TrendingUp, Calendar, MapPin, Package, Database, Download } from 'lucide-react';
import { toast } from 'sonner';
import { useProfileStore } from '@/store/useProfileStore';
import MerchSalesTable from '@/components/merch/MerchSalesTable';
import MerchAnalytics from '@/components/merch/MerchAnalytics';
import UnmatchedTransactions from '@/components/merch/UnmatchedTransactions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface MerchItem {
  id: string;
  name: string;
  quantity: number;
  variation: string | null;
  basePriceMoney: number;
  totalMoney: number;
  catalogObjectId: string | null;
}

interface MerchSale {
  id: string;
  squareOrderId: string;
  totalMoney: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  state: string;
  locationId?: string;
  showId?: number;
  showName?: string;
  showDate?: string;
  showCity?: string;
  showState?: string;
  matched: boolean;
  itemCount: number;
  items: MerchItem[];
}

interface MerchStats {
  totalOrders: number;
  totalRevenue: number;
  averageOrderValue: number;
  matchedOrders: number;
  unmatchedOrders: number;
  totalItems: number;
}

export default function MerchPage() {
  const { activeProfile } = useProfileStore();
  const [sales, setSales] = useState<MerchSale[]>([]);
  const [stats, setStats] = useState<MerchStats>({
    totalOrders: 0,
    totalRevenue: 0,
    averageOrderValue: 0,
    matchedOrders: 0,
    unmatchedOrders: 0,
    totalItems: 0,
  });
  const [loading, setLoading] = useState(true); // Start with true
  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ processed: 0, total: 0, percentage: 0, message: '' });
  const [error, setError] = useState<string | null>(null);
  const [showSyncDialog, setShowSyncDialog] = useState(false);
  const [syncOptions, setSyncOptions] = useState<{ newOrdersCount: number; totalOrdersCount: number; lastSyncDate: string | null; isFirstSync: boolean; dbOrderCount: number } | null>(null);
  const [loadingSyncOptions, setLoadingSyncOptions] = useState(false);

  useEffect(() => {
    if (activeProfile?.id) {
      loadMerchSales();
    } else {
      setLoading(false);
    }
  }, [activeProfile]);

  const loadMerchSales = async () => {
    if (!activeProfile?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/merch/sales?entityId=${encodeURIComponent(activeProfile.id)}`);

      if (!response.ok) {
        throw new Error('Failed to load merch sales');
      }

      const data = await response.json();
      setSales(data.sales || []);
      setStats(data.stats || stats);
    } catch (error) {
      console.error('Error loading merch sales:', error);
      setError('Failed to load merch sales. Please try again.');
      toast.error('Failed to load merch sales');
    } finally {
      setLoading(false);
    }
  };

  const openSyncDialog = async () => {
    if (!activeProfile?.id) return;

    setLoadingSyncOptions(true);
    setShowSyncDialog(true);

    try {
      const response = await fetch(
        `/api/merch/sync/counts?entityId=${encodeURIComponent(activeProfile.id)}`
      );

      if (!response.ok) {
        throw new Error('Failed to get sync counts');
      }

      const data = await response.json();
      setSyncOptions(data);
    } catch (error) {
      console.error('Error loading sync options:', error);
      toast.error('Failed to load sync options');
      setShowSyncDialog(false);
    } finally {
      setLoadingSyncOptions(false);
    }
  };

  const syncSquareSales = async (syncMode: 'all' | 'incremental' = 'incremental') => {
    if (!activeProfile?.id) return;

    setShowSyncDialog(false); // Close the dialog
    setSyncing(true);
    setSyncProgress({ processed: 0, total: 0, percentage: 0, message: 'Starting sync...' });

    // Start polling for progress
    const pollInterval = setInterval(async () => {
      try {
        const progressRes = await fetch(`/api/merch/sync/progress?entityId=${encodeURIComponent(activeProfile.id)}`);
        const progress = await progressRes.json();
        setSyncProgress(progress);

        if (!progress.inProgress) {
          clearInterval(pollInterval);
        }
      } catch (err) {
        console.error('Error polling progress:', err);
      }
    }, 500); // Poll every 500ms

    try {
      console.log(`🔄 Starting Square sync (${syncMode} mode)...`);

      const response = await fetch('/api/merch/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityId: activeProfile.id,
          syncMode,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to sync Square sales');
      }

      const data = await response.json();

      console.log('✅ Sync complete:', data);

      clearInterval(pollInterval);

      // Show success message with details
      const message = data.newTransactions > 0
        ? `Sync complete. Added ${data.newTransactions} new transactions and matched ${data.matchedCount} to shows. ${data.existingTransactions} were already in the database.`
        : `Sync complete. All ${data.totalFetched} transactions are up to date; no new transactions were found.`;

      toast.success(message, { duration: 5000 });

      // Reload data
      await loadMerchSales();
    } catch (error) {
      console.error('❌ Error syncing Square sales:', error);
      clearInterval(pollInterval);
      toast.error('Failed to sync Square sales. Please check your Square credentials and try again.');
    } finally {
      setSyncing(false);
      setSyncProgress({ processed: 0, total: 0, percentage: 0, message: '' });
    }
  };

  const autoMatchSales = async () => {
    if (!activeProfile?.id) return;

    setLoading(true);
    try {
      const response = await fetch('/api/merch/auto-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityId: activeProfile.id,
        }),
      });

      if (!response.ok) throw new Error('Failed to auto-match sales');

      const data = await response.json();

      toast.success(`Matched ${data.matched} sales to shows`);

      await loadMerchSales();
    } catch (error) {
      console.error('Error auto-matching sales:', error);
      toast.error('Failed to automatically match sales to shows');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full sm:border-l">
      <div className="space-y-5 px-4 py-5 pb-24 sm:space-y-6 sm:p-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold">
              <ShoppingBag className="h-8 w-8 text-accent-cyan" />
              Merch Sales
            </h1>
            <p className="text-muted-foreground mt-1">
              Track and analyze merch sales from your Square card reader
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Button className="min-h-12 px-3 text-xs sm:min-h-10 sm:text-sm"
              onClick={autoMatchSales}
              disabled={loading || syncing}
              variant="outline"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Auto-Match to Shows
            </Button>
            <Button className="min-h-12 px-3 text-xs sm:min-h-10 sm:text-sm"
              onClick={openSyncDialog}
              disabled={loading || syncing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sync Square
            </Button>
          </div>
        </div>

        {/* Sync Progress Bar */}
        {syncing && syncProgress.total > 0 && (
          <Card className="border-accent-cyan/50 bg-accent-cyan/5">
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-foreground">
                    {syncProgress.message}
                  </span>
                  <span className="text-sm font-bold text-accent-cyan">
                    {syncProgress.percentage}%
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-accent-cyan to-accent-purple h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${syncProgress.percentage}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{syncProgress.processed.toLocaleString()} of {syncProgress.total.toLocaleString()} orders processed</span>
                  <span>
                    {syncProgress.total > 0 && syncProgress.processed > 0 && (
                      <>~{Math.round((syncProgress.total - syncProgress.processed) * 0.1)} seconds remaining</>
                    )}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* No Profile Warning */}
        {!activeProfile && !loading && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardHeader>
              <CardTitle className="text-yellow-500">No Profile Selected</CardTitle>
              <CardDescription>
                Please select an artist or entity profile from the sidebar to view merch sales.
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {/* Error State */}
        {error && !loading && (
          <Card className="border-red-500/50 bg-red-500/10">
            <CardHeader>
              <CardTitle className="text-red-500">Error Loading Data</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={loadMerchSales} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Only show content if we have a profile */}
        {activeProfile && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6 lg:gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? (
                      <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                    ) : (
                      stats.totalOrders
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                  <Package className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? (
                      <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                    ) : (
                      stats.totalItems
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? (
                      <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                    ) : (
                      `$${(stats.totalRevenue / 100).toFixed(2)}`
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Order</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? (
                      <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                    ) : (
                      `$${(stats.averageOrderValue / 100).toFixed(2)}`
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Matched Orders</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? (
                      <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                    ) : (
                      stats.matchedOrders
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Unmatched Orders</CardTitle>
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {loading ? (
                      <div className="h-8 w-16 bg-muted animate-pulse rounded" />
                    ) : (
                      stats.unmatchedOrders
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="all" className="space-y-4">
              <TabsList className="flex h-auto w-full overflow-x-auto p-1">
                <TabsTrigger value="all" className="min-h-11 flex-1 whitespace-nowrap">All Sales</TabsTrigger>
                <TabsTrigger value="unmatched" className="min-h-11 flex-1 whitespace-nowrap">
                  Unmatched
                  {stats.unmatchedOrders > 0 && (
                    <Badge variant="outline" className="ml-2">
                      {stats.unmatchedOrders}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="analytics" className="min-h-11 flex-1 whitespace-nowrap">Analytics</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                <MerchSalesTable
                  sales={sales}
                  loading={loading}
                  onRefresh={loadMerchSales}
                />
              </TabsContent>

              <TabsContent value="unmatched" className="space-y-4">
                <UnmatchedTransactions
                  sales={sales.filter(s => !s.matched)}
                  loading={loading}
                  onMatch={loadMerchSales}
                />
              </TabsContent>

              <TabsContent value="analytics" className="space-y-4">
                <MerchAnalytics
                  sales={sales.filter(s => s.matched)}
                  loading={loading}
                />
              </TabsContent>
            </Tabs>

            {/* Sync Dialog */}
            <Dialog open={showSyncDialog} onOpenChange={setShowSyncDialog}>
              <DialogContent className="mobile-safe-top mobile-safe-bottom h-[100dvh] max-h-none w-screen max-w-none overflow-y-auto rounded-none p-5 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-[500px] sm:rounded-lg sm:p-6">
                <DialogHeader>
                  <DialogTitle>Sync Square Orders</DialogTitle>
                  <DialogDescription>
                    Choose how you want to sync your Square sales data.
                  </DialogDescription>
                </DialogHeader>

                {loadingSyncOptions ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-8 w-8 animate-spin text-accent-cyan" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-4 py-4">
                      {/* Sync Statistics */}
                      <Card className="bg-muted/50">
                        <CardContent className="pt-4">
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Last Sync</span>
                              <span className="text-sm text-muted-foreground">
                                {syncOptions?.lastSyncDate
                                  ? new Date(syncOptions.lastSyncDate).toLocaleString()
                                  : 'Never'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">Orders in Database</span>
                              <span className="text-sm font-semibold">{syncOptions?.dbOrderCount || 0}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Sync Options */}
                      <div className="space-y-3">
                        <div className="text-sm font-semibold text-foreground">Select Sync Mode:</div>

                        {/* Incremental Sync Option */}
                        <Card className="border-accent-cyan/50 hover:bg-accent-cyan/5 cursor-pointer transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <Database className="h-4 w-4 text-accent-cyan" />
                                  <h4 className="text-sm font-semibold">Sync New Orders Only</h4>
                                  <Badge variant="outline" className="text-xs">Recommended</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {syncOptions?.isFirstSync
                                    ? 'First sync - will fetch all historical orders'
                                    : 'Fetch only orders created since last sync'}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-accent-cyan">
                                  {syncOptions?.newOrdersCount || 0}
                                </div>
                                <div className="text-xs text-muted-foreground">orders</div>
                              </div>
                            </div>
                            <Button
                              onClick={() => syncSquareSales('incremental')}
                              className="w-full mt-3"
                              disabled={loadingSyncOptions}
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Sync {syncOptions?.newOrdersCount || 0} New Orders
                            </Button>
                          </CardContent>
                        </Card>

                        {/* Full Sync Option */}
                        <Card className="border-purple-500/50 hover:bg-purple-500/5 cursor-pointer transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1 flex-1">
                                <div className="flex items-center gap-2">
                                  <RefreshCw className="h-4 w-4 text-purple-500" />
                                  <h4 className="text-sm font-semibold">Full Re-Import</h4>
                                  <Badge variant="outline" className="text-xs bg-yellow-500/10 border-yellow-500/50">
                                    Slow
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Re-process all orders from Square (may take several minutes)
                                </p>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold text-purple-500">
                                  {syncOptions?.totalOrdersCount || 0}
                                </div>
                                <div className="text-xs text-muted-foreground">orders</div>
                              </div>
                            </div>
                            <Button
                              onClick={() => syncSquareSales('all')}
                              variant="outline"
                              className="w-full mt-3"
                              disabled={loadingSyncOptions}
                            >
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Re-Import All {syncOptions?.totalOrdersCount || 0} Orders
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        onClick={() => setShowSyncDialog(false)}
                        variant="ghost"
                      >
                        Cancel
                      </Button>
                    </DialogFooter>
                  </>
                )}
              </DialogContent>
            </Dialog>
          </>
        )}
      </div>
    </div>
  );
}
