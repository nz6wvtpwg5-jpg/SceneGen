'use client';

import { useMemo, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, Trophy, Calendar, Loader2 } from 'lucide-react';
import { ShowMerchBreakdown } from './ShowMerchBreakdown';

// New imports for analytics
import { buildMerchAnalytics } from '@/lib/merch/buildMerchAnalytics';
import { buildRecommendations } from '@/lib/merch/buildRecommendations';
import type { MerchSale, MerchAnalytics as MerchAnalyticsType, MerchFilters } from '@/lib/merch/types';
import type { Recommendation } from '@/lib/merch/buildRecommendations';

import {
  AnalyticsFilters,
  SizeAnalytics,
  ProductAnalytics,
  CityAnalytics,
  SeasonalAnalytics,
  Recommendations,
  TourLoadoutGenerator,
  ExportMenu,
} from '@/components/merch/analytics';
import type { AnalyticsFilterState } from '@/components/merch/analytics/AnalyticsFilters';

interface Props {
  sales: MerchSale[];
  loading: boolean;
}

type TabId = 'overview' | 'size' | 'products' | 'cities' | 'seasonal' | 'recommendations' | 'loadout';


export default function MerchAnalytics({ sales, loading }: Props) {
  const [activeShow, setActiveShow] = useState<{ showId: number; position: { x: number; y: number } } | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  // Use the AnalyticsFilterState type from the AnalyticsFilters component
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    cities: [],
    countries: [],
    categories: [],
    garmentTypes: [],
  });

  // Build analytics from sales data
  const [analytics, setAnalytics] = useState<MerchAnalyticsType | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [buildingAnalytics, setBuildingAnalytics] = useState(false);

  // Extract available cities and countries from sales data
  const { availableCities, availableCountries } = useMemo(() => {
    const citiesSet = new Set<string>();
    const countriesSet = new Set<string>();

    sales.forEach(sale => {
      if (sale.showCity) citiesSet.add(sale.showCity);
      if (sale.showState) countriesSet.add(sale.showState); // Using state as country for now
    });

    return {
      availableCities: Array.from(citiesSet).sort(),
      availableCountries: Array.from(countriesSet).sort(),
    };
  }, [sales]);

  useEffect(() => {
    if (sales && sales.length > 0 && !loading) {
      setBuildingAnalytics(true);
      try {
        // Build analytics options from filters
        const opts = {
          dateRange: filters.dateRange
            ? {
                start: filters.dateRange.start.toISOString(),
                end: filters.dateRange.end.toISOString()
              }
            : undefined,
          cities: filters.cities.length > 0 ? filters.cities : undefined,
        };

        // Build comprehensive analytics
        const result = buildMerchAnalytics(sales, opts);
        setAnalytics(result);

        // Generate recommendations
        const recs = buildRecommendations(result, sales);
        setRecommendations(recs);
      } catch (error) {
        console.error('Failed to build analytics:', error);
      } finally {
        setBuildingAnalytics(false);
      }
    }
  }, [sales, loading, filters]);

  // Original overview analytics (for backward compatibility)
  const overviewAnalytics = useMemo(() => {
    // Group sales by show
    const salesByShow = sales.reduce((acc, sale) => {
      if (!sale.showId || !sale.showName) return acc;

      const key = `${sale.showId}`;
      if (!acc[key]) {
        acc[key] = {
          showId: sale.showId,
          showName: sale.showName,
          showDate: sale.showDate || '',
          showCity: sale.showCity || '',
          showState: sale.showState || '',
          totalRevenue: 0,
          transactions: 0,
          items: 0,
        };
      }

      acc[key].totalRevenue += sale.totalMoney;
      acc[key].transactions += 1;
      acc[key].items += sale.itemCount;

      return acc;
    }, {} as Record<string, any>);

    // Convert to array and sort by revenue
    const showData = Object.values(salesByShow)
      .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
      .slice(0, 10); // Top 10 shows

    // Calculate average sale
    const avgSale = showData.length > 0
      ? showData.reduce((sum: number, show: any) => sum + show.totalRevenue, 0) / showData.map((s: any) => s.transactions).reduce((sum: number, t: number) => sum + t, 0)
      : 0;

    // Find best show
    const bestShow = showData.length > 0 ? showData[0] : null;

    return {
      showData,
      avgSale,
      bestShow,
    };
  }, [sales]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount / 100);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const tabs = [
    { id: 'overview' as TabId, label: 'Overview', description: 'Sales summary and top shows' },
    { id: 'size' as TabId, label: 'Size Analytics', description: 'Size distribution and trends' },
    { id: 'products' as TabId, label: 'Products', description: 'Product performance rankings' },
    { id: 'cities' as TabId, label: 'Cities', description: 'Location-based insights' },
    { id: 'seasonal' as TabId, label: 'Seasonal', description: 'Monthly and seasonal trends' },
    { id: 'recommendations' as TabId, label: 'Recommendations', description: 'Actionable insights' },
    { id: 'loadout' as TabId, label: 'Tour Loadout', description: 'Smart packing calculator' },
  ];

  // Show loading state
  if (loading || buildingAnalytics) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-500 animate-spin mx-auto mb-4" />
          <p className="text-lg font-medium">Building Analytics...</p>
          <p className="text-sm text-gray-400 mt-2">Processing {sales.length} sales</p>
        </div>
      </div>
    );
  }

  // Show empty state
  if (!sales || sales.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-lg font-medium">No merch sales data available</p>
        <p className="text-sm text-gray-400 mt-2">Connect Square to see analytics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Filters and Export */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Merch Analytics</h1>
          <p className="text-gray-400 mt-1">
            {analytics ? `${analytics.overview.totalSales} sales • ${analytics.overview.totalItems} items` : 'Loading...'}
          </p>
        </div>
        {analytics && (
          <ExportMenu
            analytics={analytics}
            recommendations={recommendations}
          />
        )}
      </div>

      {/* Filters */}
      <AnalyticsFilters
        availableCities={availableCities}
        availableCountries={availableCountries}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Tab Navigation */}
      <div className="border-b border-gray-700">
        <nav className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-blue-500 text-white bg-blue-500/10'
                  : 'border-transparent text-gray-400 hover:text-white hover:border-gray-600'
              }`}
            >
              <div className="font-medium">{tab.label}</div>
              <div className="text-xs opacity-75">{tab.description}</div>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Insights Cards */}
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Best Performing Show</CardTitle>
                  <Trophy className="h-4 w-4 text-yellow-500" />
                </CardHeader>
                <CardContent>
                  {overviewAnalytics.bestShow ? (
                    <div>
                      <div className="text-2xl font-bold">
                        {formatCurrency(overviewAnalytics.bestShow.totalRevenue)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {overviewAnalytics.bestShow.showName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {overviewAnalytics.bestShow.transactions} orders • {overviewAnalytics.bestShow.items} items
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {overviewAnalytics.bestShow.showCity}, {overviewAnalytics.bestShow.showState}
                      </p>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">No data yet</p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Sale Per Show</CardTitle>
                  <TrendingUp className="h-4 w-4 text-accent-cyan" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(overviewAnalytics.avgSale)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Across {overviewAnalytics.showData.length} shows
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Shows with Sales</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overviewAnalytics.showData.length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    From matched transactions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Sales by Show Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Sales by Show</CardTitle>
                <CardDescription>
                  Top performing shows by merch revenue
                </CardDescription>
              </CardHeader>
              <CardContent>
                {overviewAnalytics.showData.length === 0 ? (
                  <div className="h-[400px] flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-lg font-medium">No data available</p>
                      <p className="text-sm text-muted-foreground">
                        Match transactions to shows to see analytics
                      </p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart
                      data={overviewAnalytics.showData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis
                        dataKey="showName"
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fill: '#888', fontSize: 12 }}
                      />
                      <YAxis
                        tick={{ fill: '#888' }}
                        tickFormatter={(value: number) => `$${(value / 100).toFixed(0)}`}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'rgba(0, 0, 0, 0.8)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                        }}
                        formatter={(value: any) => [formatCurrency(value), 'Revenue']}
                        labelFormatter={(label: any) => `Show: ${label}`}
                      />
                      <Legend />
                      <Bar
                        dataKey="totalRevenue"
                        fill="#00C9FF"
                        name="Total Revenue"
                        radius={[8, 8, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Top Shows Table */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Shows</CardTitle>
                <CardDescription>
                  Shows ranked by merch sales revenue
                </CardDescription>
              </CardHeader>
              <CardContent>
                {overviewAnalytics.showData.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No data available
                  </p>
                ) : (
                  <div className="space-y-4">
                    {overviewAnalytics.showData.map((show: any, index: number) => (
                      <button
                        type="button"
                        key={show.showId}
                        aria-expanded={activeShow?.showId === show.showId}
                        className="-m-3 mb-1 flex min-h-16 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border-b p-3 pb-4 text-left transition-colors last:border-0 hover:bg-accent-cyan/5"
                        onClick={(event) => {
                          const rect = event.currentTarget.getBoundingClientRect();
                          setActiveShow((current) => current?.showId === show.showId ? null : { showId: show.showId, position: { x: rect.left + rect.width / 2, y: rect.top } });
                        }}
                        onMouseEnter={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          setActiveShow({
                            showId: show.showId,
                            position: {
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                            },
                          });
                        }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-cyan/10 text-accent-cyan font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{show.showName}</p>
                            <p className="text-sm text-muted-foreground">
                              {formatDate(show.showDate)} • {show.showCity}, {show.showState}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-xl font-bold">
                            {formatCurrency(show.totalRevenue)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {show.transactions} {show.transactions === 1 ? 'order' : 'orders'} • {show.items} items
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tap/click breakdown sheet; hover remains a desktop convenience. */}
            {activeShow && (() => {
              const show = overviewAnalytics.showData.find((s: any) => s.showId === activeShow.showId);
              const showSales = sales.filter(s => s.showId === activeShow.showId);

              return show ? (
                <ShowMerchBreakdown
                  sales={showSales}
                  showName={show.showName}
                  position={activeShow.position}
                  onClose={() => setActiveShow(null)}
                />
              ) : null;
            })()}
          </div>
        )}

        {activeTab === 'size' && analytics && (
          <SizeAnalytics data={analytics.bySize} />
        )}

        {activeTab === 'products' && analytics && (
          <ProductAnalytics data={analytics.byProduct} />
        )}

        {activeTab === 'cities' && analytics && (
          <CityAnalytics data={analytics.byCity} />
        )}

        {activeTab === 'seasonal' && analytics && (
          <SeasonalAnalytics
            seasonal={analytics.temporal.seasonal}
            monthly={analytics.temporal.monthly}
          />
        )}

        {activeTab === 'recommendations' && (
          <Recommendations recommendations={recommendations} />
        )}

        {activeTab === 'loadout' && analytics && (
          <TourLoadoutGenerator analytics={analytics} />
        )}
      </div>
    </div>
  );
}
