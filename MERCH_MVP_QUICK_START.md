# 🚀 Merch Analytics MVP - Quick Start Guide

## ✅ Status: **READY TO USE**

The Merch Analytics MVP is fully integrated and ready for testing with your Square data!

---

## 🎯 What You Have Now

### 7 Analytics Tabs
1. **Overview** - Sales summary, top shows, revenue charts
2. **Size Analytics** - Size distribution and trends
3. **Product Analytics** - Best-selling items and categories
4. **City Analytics** - Location-based performance
5. **Seasonal Analytics** - Monthly and seasonal patterns
6. **Recommendations** - AI-powered actionable insights
7. **Tour Loadout** - Smart packing calculator

### Smart Features
- ✅ Global filters (dates, cities, categories)
- ✅ Real-time analytics recalculation
- ✅ CSV export capability
- ✅ Intelligent item normalization
- ✅ Manual override support
- ✅ Responsive design

---

## 📋 Testing Checklist

### 1. Access the Dashboard
```
http://localhost:3000/merch
```
(Or wherever your Merch section lives)

### 2. Verify Data Flow
- [ ] Dashboard loads without errors
- [ ] Sales data appears in Overview tab
- [ ] All 7 tabs are clickable
- [ ] Each tab shows relevant data

### 3. Test Filters
- [ ] Click "Filters" button
- [ ] Select date range
- [ ] Choose cities from dropdown
- [ ] Add garment types/categories
- [ ] See "Active filters" count badge
- [ ] Click "Clear All" to reset

### 4. Explore Each Tab

#### Overview Tab ✅
- View top performing shows
- See average sale metrics
- Hover over shows for details
- Check revenue chart

#### Size Analytics Tab 📏
- Review size distribution chart
- See breakdown by garment type
- Check popular sizes ranking
- Read size-specific insights

#### Product Analytics Tab 🎨
- View best-selling products
- Compare revenue vs quantity sold
- See product category breakdown
- Identify top/bottom performers

#### City Analytics Tab 🌍
- Explore sales by location
- Compare city performance
- View geographic distribution
- See location-based insights

#### Seasonal Analytics Tab 📅
- Check monthly sales trends
- View seasonal performance
- Identify time-based patterns
- Read seasonal recommendations

#### Recommendations Tab 💡
- Read AI-generated insights
- Review inventory suggestions
- Check performance highlights
- Get actionable next steps

#### Tour Loadout Tab 🎒
- Input upcoming tour details
- Get smart packing suggestions
- See quantity recommendations
- Export loadout as CSV

### 5. Test Export (if data exists)
- [ ] Click Export button
- [ ] Select CSV format
- [ ] Download file
- [ ] Verify data in CSV

---

## 🐛 Troubleshooting

### No Data Showing?
1. **Check Square connection**: Ensure Square integration is active
2. **Match transactions**: Link Square sales to shows in your system
3. **Verify date range**: Clear filters to see all-time data

### Analytics Not Updating?
1. **Refresh the page**: Force a full reload
2. **Check console**: Look for any JavaScript errors (F12)
3. **Verify filters**: Try clearing all filters

### Tabs Not Switching?
1. **Check for errors**: Open browser console (F12)
2. **Reload page**: Sometimes a fresh start helps
3. **Check browser**: Ensure modern browser (Chrome, Firefox, Safari, Edge)

### Filters Not Working?
1. **Clear and retry**: Use "Clear All" then reapply
2. **Check data**: Ensure there's data for the filtered criteria
3. **Console check**: Look for filter-related errors

---

## 💻 Developer Notes

### File Locations
```
Main Dashboard:
/src/components/merch/MerchAnalytics.tsx

Analytics Components:
/src/components/merch/analytics/*

Backend Logic:
/src/lib/merch/*
```

### Key State Variables
```typescript
// In MerchAnalytics.tsx
const [activeTab, setActiveTab] = useState<TabId>('overview');
const [filters, setFilters] = useState<AnalyticsFilterState>({...});
const [analytics, setAnalytics] = useState<MerchAnalyticsType | null>(null);
const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
```

### Adding Custom Analytics
1. Extend `buildMerchAnalytics()` in `/src/lib/merch/buildMerchAnalytics.ts`
2. Update types in `/src/lib/merch/types.ts`
3. Create new component in `/src/components/merch/analytics/`
4. Add tab to `MerchAnalytics.tsx`

---

## 🎨 Customization Tips

### Changing Default Tab
```typescript
// In MerchAnalytics.tsx, line ~38
const [activeTab, setActiveTab] = useState<TabId>('overview'); // Change 'overview' to any tab ID
```

### Adjusting Filter Defaults
```typescript
// In MerchAnalytics.tsx, line ~41
const [filters, setFilters] = useState<AnalyticsFilterState>({
  cities: ['Denver'], // Pre-select cities
  garmentTypes: ['T-Shirt'], // Pre-select types
  // etc.
});
```

### Modifying Chart Colors
Look for `fill="#00C9FF"` or similar in component files and replace with your brand colors.

---

## 📊 Data Requirements

### Minimum Data Needed
- At least 1 Square transaction
- Transaction must have:
  - Item name
  - Quantity
  - Price
  - (Optional) Show linkage for full features

### Recommended Data
- 10+ shows worth of sales
- Multiple cities/locations
- Variety of products
- 3+ months of data for seasonal insights

### Optimal Data
- 20+ shows
- Multiple tours/seasons
- Diverse product catalog
- 12+ months for full seasonal analysis

---

## 🚦 Success Indicators

### You'll Know It's Working When:
- ✅ Dashboard loads in <2 seconds
- ✅ All tabs render data
- ✅ Filters update analytics smoothly
- ✅ Recommendations make sense
- ✅ Charts are interactive
- ✅ Export downloads correctly
- ✅ No console errors
- ✅ UI is responsive on mobile

### Expected Performance
- **Initial Load**: 1-3 seconds (depends on data size)
- **Filter Change**: <500ms to rebuild analytics
- **Tab Switch**: Instant (already rendered)
- **Export**: <2 seconds for CSV generation

---

## 🎓 Usage Tips

### For Artists/Managers
1. **Check Overview weekly**: Monitor top shows and trends
2. **Review Recommendations**: Act on suggested inventory changes
3. **Use Loadout Generator**: Before every tour, generate packing list
4. **Export Monthly Reports**: Download CSV for accounting

### For Merch Managers
1. **Track Size Trends**: Avoid stockouts on popular sizes
2. **Monitor City Performance**: Bring more to high-performing cities
3. **Seasonal Planning**: Use seasonal analytics for pre-orders
4. **Product Testing**: Watch new product performance

### For Data Analysis
1. **Export Raw Data**: Download CSV for deeper analysis
2. **Combine Filters**: Get very specific insights
3. **Track Over Time**: Compare different date ranges
4. **Location Analysis**: Identify regional preferences

---

## 📚 Next Steps After Testing

### If Everything Works:
1. ✅ Mark integration as complete
2. 📸 Take screenshots for documentation
3. 👥 Show to team/users for feedback
4. 📝 Document any discovered edge cases
5. 🎯 Plan next phase enhancements

### If Issues Found:
1. 📋 Document the issue clearly
2. 🔍 Check browser console for errors
3. 🧪 Try to reproduce consistently
4. 💬 Report with steps to reproduce
5. 🔧 Fix or schedule for next sprint

---

## 🔗 Related Documents

- `MERCH_MVP_INTEGRATION_COMPLETE.md` - Complete integration summary
- `MERCH_ANALYTICS_MVP_PLAN.txt` - Original MVP plan
- `MERCH_QUICK_REFERENCE.md` - Developer quick reference
- `MERCH_UI_BUILD_SUMMARY.md` - UI component details

---

## ⚡ Quick Commands

### Start Development Servers
```bash
# Terminal 1 - Backend
cd /Users/jon/Desktop/scenegen/SceneGenUIV2
npm run dev:server

# Terminal 2 - Frontend  
cd /Users/jon/Desktop/scenegen/SceneGenUIV2
npm run dev
```

### Check for Type Errors
```bash
npx tsc --noEmit
```

### Run in Production Mode
```bash
npm run build
npm start
```

---

## ✨ Key Features Highlights

### Smart Normalization
- Automatically detects sizes (XS, S, M, L, XL, XXL, XXXL)
- Identifies garment types (T-Shirt, Hoodie, Hat, etc.)
- Categorizes products (Apparel, Accessories, etc.)
- Supports manual overrides for accuracy

### Intelligent Recommendations
- Based on actual sales data
- Considers trends and patterns
- Actionable suggestions
- Contextual insights

### Flexible Filtering
- Date range selection
- City/location filtering
- Garment type filtering
- Product category filtering
- Multiple filters combined

### Export Capabilities
- CSV format for all analytics
- Individual section exports
- Full dataset exports
- Compatible with Excel/Google Sheets

---

## 🎉 You're Ready!

Everything is set up and ready to go. Navigate to your Merch Analytics page and start exploring your data!

**Questions?** Check the full integration docs in `MERCH_MVP_INTEGRATION_COMPLETE.md`

**Issues?** Look for console errors (F12) and check the troubleshooting section above.

**Happy analyzing!** 📊✨

---

*Last Updated: Integration Complete*  
*SceneGen Merch Analytics MVP v1.0*
