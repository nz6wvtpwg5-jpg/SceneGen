# 🎯 Merch Analytics MVP - Quick Reference Card

## ✅ Status: UI Components COMPLETE

All 8 analytics UI components are built, typed, and ready for integration.

---

## 📦 Import All Components

```typescript
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
```

---

## 🔧 Quick Integration Template

```typescript
import { useState, useEffect } from 'react';
import { buildMerchAnalytics } from '@/lib/merch/buildMerchAnalytics';
import { buildRecommendations } from '@/lib/merch/buildRecommendations';
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

function MerchAnalytics() {
  const [sales, setSales] = useState<MerchSale[]>([]);
  const [analytics, setAnalytics] = useState<MerchAnalytics | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [filters, setFilters] = useState({
    dateRange: { start: null, end: null },
    cities: [],
    countries: [],
    categories: [],
    garmentTypes: [],
  });
  const [activeTab, setActiveTab] = useState('overview');

  // Build analytics when sales or filters change
  useEffect(() => {
    if (sales.length > 0) {
      const opts = {
        dateRange: filters.dateRange.start ? filters.dateRange : undefined,
        cities: filters.cities.length > 0 ? filters.cities : undefined,
      };
      
      const result = buildMerchAnalytics(sales, opts);
      setAnalytics(result);
      
      const recs = buildRecommendations(result, sales);
      setRecommendations(recs);
    }
  }, [sales, filters]);

  if (!analytics) return <div>Loading...</div>;

  return (
    <div className="space-y-6 p-6">
      {/* Header with Filters and Export */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Merch Analytics</h1>
        <ExportMenu 
          analytics={analytics}
          recommendations={recommendations}
        />
      </div>

      <AnalyticsFilters 
        {...filters}
        onFilterChange={setFilters}
      />

      {/* Tab Navigation */}
      <div className="border-b border-gray-700">
        <nav className="flex gap-4">
          {['overview', 'size', 'products', 'cities', 'seasonal', 'recommendations', 'loadout'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 border-b-2 transition-colors ${
                activeTab === tab 
                  ? 'border-blue-500 text-white' 
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'size' && (
        <SizeAnalytics data={analytics.bySize} />
      )}
      
      {activeTab === 'products' && (
        <ProductAnalytics data={analytics.byProduct} />
      )}
      
      {activeTab === 'cities' && (
        <CityAnalytics data={analytics.byCity} />
      )}
      
      {activeTab === 'seasonal' && (
        <SeasonalAnalytics 
          seasonal={analytics.temporal.seasonal}
          monthly={analytics.temporal.monthly}
        />
      )}
      
      {activeTab === 'recommendations' && (
        <Recommendations recommendations={recommendations} />
      )}
      
      {activeTab === 'loadout' && (
        <TourLoadoutGenerator analytics={analytics} />
      )}
    </div>
  );
}
```

---

## 📊 Component Props Quick Reference

| Component | Required Props | Optional Props |
|-----------|----------------|----------------|
| AnalyticsFilters | `dateRange`, `cities`, `countries`, `categories`, `garmentTypes`, `onFilterChange` | - |
| SizeAnalytics | `data: SizeBreakdown[]` | - |
| ProductAnalytics | `data: MerchDesign[]` | - |
| CityAnalytics | `data: CityAnalytics[]` | - |
| SeasonalAnalytics | `seasonal`, `monthly` | - |
| Recommendations | `recommendations: Recommendation[]` | - |
| TourLoadoutGenerator | `analytics: MerchAnalytics` | `onExport` |
| ExportMenu | `analytics: MerchAnalytics` | `recommendations`, `tourLoadout` |

---

## 🎨 Styling Notes

- All components use dark mode (gray-800/900)
- Consistent spacing (space-y-6, gap-4)
- Blue/green/purple gradient accents
- Hover states and transitions
- Responsive grid layouts

---

## 📁 All New Files

**UI Components (9 files):**
1. `src/components/merch/analytics/index.ts`
2. `src/components/merch/analytics/AnalyticsFilters.tsx`
3. `src/components/merch/analytics/SizeAnalytics.tsx`
4. `src/components/merch/analytics/ProductAnalytics.tsx`
5. `src/components/merch/analytics/CityAnalytics.tsx`
6. `src/components/merch/analytics/SeasonalAnalytics.tsx`
7. `src/components/merch/analytics/Recommendations.tsx`
8. `src/components/merch/analytics/TourLoadoutGenerator.tsx`
9. `src/components/merch/analytics/ExportMenu.tsx`

**Backend (already complete):**
- `src/lib/merch/types.ts`
- `src/lib/merch/constants.ts`
- `src/lib/merch/normalizeMerchItem.ts`
- `src/lib/merch/buildMerchAnalytics.ts`
- `src/lib/merch/buildRecommendations.ts`
- `src/lib/merch/tourLoadout.ts`
- `src/lib/merch/exportCsv.ts`

---

## ✅ Completed Features

- ✅ Size distribution analytics with charts
- ✅ Product performance tables (sortable)
- ✅ City-level insights
- ✅ Seasonal & monthly analytics
- ✅ Smart recommendations (size/product/regional/seasonal/inventory)
- ✅ Tour loadout generator with confidence scoring
- ✅ CSV exports for all data
- ✅ Global filtering (date, city, category, type)
- ✅ Dark mode optimized
- ✅ Mobile-responsive layouts
- ✅ TypeScript typed throughout

---

## 🚀 Next Steps

1. **Update `src/components/merch/MerchAnalytics.tsx`**
   - Copy the integration template above
   - Replace existing analytics code
   - Add tab navigation
   - Wire up filters

2. **Test with real Square data**
   - Fetch sales from Square API
   - Build analytics
   - Verify all components render
   - Test filters and exports

3. **Polish**
   - Add loading skeletons
   - Error boundaries
   - Empty state refinements
   - Performance optimization

---

**Status**: 🎉 Ready to integrate. All UI components complete and linting cleanly.
