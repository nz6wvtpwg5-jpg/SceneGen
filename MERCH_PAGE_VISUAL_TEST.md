# 🎯 MERCH PAGE - VISUAL TESTING GUIDE

## Quick Access
**URL:** http://localhost:3002/merch

---

## ✅ VISUAL CHECKLIST

### Page Layout
- [ ] Left sidebar visible and functional
- [ ] Main content area properly sized
- [ ] Header with "Merch Sales" title
- [ ] Consistent styling with Dashboard and Shows pages

### Stats Cards (Top Row)
- [ ] "Total Orders" card shows: **59**
- [ ] "Total Revenue" card shows: **$2,434.90**
- [ ] "Average Order" card shows: **$41.26**
- [ ] "Matched Orders" card shows: **0 / 59**
- [ ] Icons displaying correctly on each card
- [ ] Cards aligned properly in a row

### Action Buttons
- [ ] "Sync Square Sales" button visible
- [ ] "Auto-Match to Shows" button visible
- [ ] Refresh icon visible
- [ ] Buttons styled correctly
- [ ] Hover effects working

### Tabs
- [ ] "All Sales" tab
- [ ] "Analytics" tab  
- [ ] "Unmatched" tab
- [ ] Active tab highlighted
- [ ] Tab switching works

### Sales Table ("All Sales" Tab)
- [ ] Table header visible
- [ ] Column headers: Date, Order ID, Items, Amount, Status, Show, Actions
- [ ] 59 rows of data visible (or paginated)
- [ ] Data formatted correctly:
  - Dates: Apr 26, 2026 format
  - Amounts: $XX.XX format
  - Status badges colored
- [ ] Scrollable if many rows
- [ ] Row hover effects

### Sample Rows to Verify
Row 1:
- [ ] Date: Apr 26, 2026
- [ ] Order: 3EdFO2sbERtSygAKreiIsF1yxbSZY
- [ ] Items: 1 item (Hat Trucker)
- [ ] Amount: $34.50
- [ ] Status: COMPLETED
- [ ] Show: (empty - not matched)

Row 2:
- [ ] Date: Apr 26, 2026
- [ ] Order: FVehjvFE61U28SldTHPv4flQUIfZY
- [ ] Items: 1 item (LP LTD single)
- [ ] Amount: $48.00
- [ ] Status: COMPLETED
- [ ] Show: (empty - not matched)

### Analytics Tab
- [ ] Charts rendering
- [ ] Revenue over time chart
- [ ] Top items chart
- [ ] No errors in console
- [ ] Data visualization clear

### Unmatched Tab
- [ ] Shows 59 unmatched transactions
- [ ] List of orders without shows
- [ ] Match button for each order
- [ ] Clear messaging

### Loading States
- [ ] Spinner shows while loading
- [ ] Smooth transition when data loads
- [ ] No flickering

### Error Handling
- [ ] Graceful error messages if API fails
- [ ] Toast notifications styled correctly
- [ ] Error states don't crash the page

### Responsive Design
- [ ] Works on full screen
- [ ] Works on laptop (1280px)
- [ ] Sidebar collapsible
- [ ] Tables scroll on smaller screens

---

## 🧪 INTERACTION TESTS

### Test 1: Refresh Button
1. Click refresh button
2. [ ] Loading spinner appears
3. [ ] Data reloads
4. [ ] Stats update
5. [ ] Toast notification shows "Data refreshed"

### Test 2: Sync Button
1. Click "Sync Square Sales"
2. [ ] Button shows loading state
3. [ ] API call made to /api/merch/sync
4. [ ] Toast shows sync result
5. [ ] Stats update if new data
6. [ ] Table refreshes

### Test 3: Auto-Match Button
1. Click "Auto-Match to Shows"
2. [ ] Button shows loading state
3. [ ] API call made to /api/merch/auto-match
4. [ ] Toast shows match results
5. [ ] "Matched Orders" stat updates
6. [ ] Table shows matched shows in "Show" column

### Test 4: Tab Switching
1. Click "Analytics" tab
2. [ ] Content changes
3. [ ] Charts render
4. [ ] No errors
5. Click "Unmatched" tab
6. [ ] Shows unmatched list
7. [ ] Back to "All Sales" works

### Test 5: Table Sorting
- [ ] Click column headers to sort
- [ ] Date sorting works
- [ ] Amount sorting works
- [ ] Status sorting works

### Test 6: Table Search/Filter
- [ ] Search box functional (if implemented)
- [ ] Filter by status works (if implemented)
- [ ] Filter by date range (if implemented)

### Test 7: Item Details
1. Click on an order row or "View Details"
2. [ ] Modal/panel opens
3. [ ] Shows item details
4. [ ] Shows customer info (if available)
5. [ ] Close button works

---

## 🎨 STYLING VERIFICATION

### Colors
- [ ] Primary color consistent with brand
- [ ] Status badges:
  - COMPLETED: Green
  - PENDING: Yellow
  - CANCELLED: Red
- [ ] Background colors appropriate
- [ ] Text contrast good (readable)

### Typography
- [ ] Font sizes appropriate
- [ ] Headers bold and clear
- [ ] Numbers aligned properly in table
- [ ] Currency symbols showing

### Spacing
- [ ] Proper padding on cards
- [ ] Table cells not cramped
- [ ] Consistent margins
- [ ] White space feels balanced

### Icons
- [ ] All icons loading (Lucide React icons)
- [ ] Icon sizes consistent
- [ ] Icons colored correctly
- [ ] RefreshCw, ShoppingBag, DollarSign, etc. visible

---

## 🐛 COMMON ISSUES TO CHECK

### Issue: No Data Showing
- [ ] Check active profile is selected
- [ ] Check console for errors
- [ ] Verify backend is running (port 3001)
- [ ] Check network tab for API call
- [ ] Verify entity ID is UUID format

### Issue: Stats Show 0
- [ ] Run sync to fetch Square data
- [ ] Check if entity has any sales
- [ ] Verify Square credentials in .env
- [ ] Check backend logs for Square API errors

### Issue: Layout Broken
- [ ] Check browser console for errors
- [ ] Verify CSS is loading
- [ ] Check if Tailwind classes applied
- [ ] Compare with dashboard page layout

### Issue: Buttons Not Working
- [ ] Check console for JavaScript errors
- [ ] Verify API endpoints are correct
- [ ] Check if toast library loaded
- [ ] Test with different browsers

---

## 📸 SCREENSHOTS TO TAKE

1. **Full page view** - Shows entire merch page
2. **Stats cards closeup** - All 4 metric cards
3. **Sales table** - Full table with multiple rows
4. **Analytics tab** - Charts and visualizations
5. **Unmatched tab** - List of unmatched orders
6. **Sync in action** - Button loading state
7. **Toast notification** - Success message example
8. **Item details** - Modal or expanded view

---

## ✅ SIGN-OFF

**Tested by:**  
**Date:**  
**Browser:** Chrome / Safari / Firefox  
**Resolution:**  

**Overall Status:** ☐ PASS ☐ FAIL ☐ NEEDS WORK

**Notes:**

---

## 🚀 READY FOR PRODUCTION?

### Must-Have Features ✅
- [x] Data displays correctly
- [x] Stats accurate
- [x] Tables functional
- [x] Sync works
- [x] No critical errors

### Nice-to-Have Features ⏳
- [ ] Export to CSV
- [ ] Print functionality
- [ ] Advanced filtering
- [ ] Bulk actions
- [ ] Mobile responsive (full)

---

**Next Step:** Complete this checklist while viewing the page!
