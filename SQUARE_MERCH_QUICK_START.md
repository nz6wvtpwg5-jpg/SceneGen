# Square Merch Integration - Quick Start Guide 🚀

## What You Now Have

A complete merch sales tracking system integrated with Square that:
- ✅ Automatically syncs transactions from your Square card reader
- ✅ Matches sales to shows on your calendar
- ✅ Shows you which shows sell the most merch
- ✅ Provides analytics and insights

## How to Use It

### Step 1: Access the Merch Tab
1. Look at the left sidebar in your dashboard
2. Click on **"Merch"** (the shopping bag icon)
3. You'll see your new merch sales dashboard

### Step 2: Sync Your Square Sales
1. Click the **"Sync Square"** button (top right)
2. This pulls the last 30 days of transactions from Square
3. You'll see a notification showing how many new transactions were imported

### Step 3: Match Sales to Shows

**Option A: Auto-Match (Recommended)**
1. Click **"Auto-Match to Shows"** button
2. The system automatically links sales to shows on the same date
3. Perfect for bulk matching after a sync

**Option B: Manual Match**
1. Click the **"Unmatched"** tab
2. For each transaction, use the dropdown to select the correct show
3. The sale is instantly linked to that show

### Step 4: View Analytics
1. Click the **"Analytics"** tab
2. See:
   - Your best performing show (most merch revenue)
   - Average sale per show
   - Bar chart of top 10 shows
   - Detailed rankings

## Dashboard Overview

### Top Stats Row (5 Cards)
- **Total Sales**: Count of all transactions
- **Total Revenue**: Total money from merch
- **Average Sale**: Average transaction amount
- **Matched Sales**: Sales linked to shows
- **Unmatched Sales**: Sales needing attention (shows badge on "Unmatched" tab)

### Three Tabs

**1. All Sales**
- Complete list of all transactions
- Search by show name, venue, or transaction ID
- See status (Completed, Pending, Failed, Canceled)
- Shows which sales are matched to shows

**2. Unmatched**
- Only shows transactions not yet linked to a show
- Dropdown selector for each sale
- Shows venue, city, and date for context
- Displays "All sales matched!" when done

**3. Analytics**
- Best performing show card with revenue
- Average sale per show stat
- Interactive bar chart (top 10 shows)
- Detailed table with rankings

## Your Square Credentials

Already configured in the backend:
```
Environment: Sandbox
Application ID: sandbox-sq0idb-C0jA9ZDj0G8qIJCFbPhA2w
Access Token: Configured in .env
```

## Testing It Out

### Test in Square Sandbox
1. Go to Square Developer Dashboard
2. Use the sandbox testing tools to create test transactions
3. Come back to the app and click "Sync Square"
4. Your test transactions will appear!

### Match Test Sales
1. Look at the "Unmatched" tab
2. Select a show from the dropdown
3. The sale is now linked and will appear in analytics

## Tips for Best Results

### Regular Syncing
- Sync Square daily or weekly to stay current
- New sales won't show until you sync
- Syncing is safe - duplicates are prevented

### Matching Strategy
- Use Auto-Match first (it's smart about dates)
- Then manually match any remaining sales
- The unmatched count badge helps you track progress

### Using Analytics
- Check after tours to see which cities/venues did best
- Plan future inventory based on past performance
- Share insights with your team

## What the Data Tells You

**High Merch Sales Show =**
- Great audience engagement
- Book similar venues in the future
- Bring more inventory to these markets

**Low Merch Sales Show =**
- Maybe wrong audience
- Could be venue/location issue
- Or just need better merch visibility

## Moving to Production

When you're ready to use real Square data:

1. Get production credentials from Square
2. Update `backend/.env`:
   ```
   SQUARE_ENVIRONMENT=production
   SQUARE_APPLICATION_ID=your-production-app-id
   SQUARE_ACCESS_TOKEN=your-production-token
   ```
3. Restart backend server
4. Sync - now you'll get real transactions!

## Common Questions

**Q: Do I have to match every sale?**
A: No, but matching helps you see which shows perform best. Unmatched sales still count in total revenue.

**Q: Can I change a match?**
A: Currently you'd need to re-match it. A future update could add unmatch/rematch features.

**Q: How far back does it sync?**
A: Default is 30 days, but you can configure this in the API call.

**Q: What if I have multiple shows in one day?**
A: Auto-match picks the first show. Use manual matching for precision.

**Q: Can I export this data?**
A: This could be added as a future enhancement (CSV export).

## Troubleshooting

**"Failed to sync Square sales"**
- Check your Square credentials in `backend/.env`
- Make sure backend server is running
- Verify you have an active Square account

**"No sales found"**
- You need to sync first
- Make sure you have transactions in Square
- Check the date range (default is last 30 days)

**"Failed to load shows"**
- Make sure you have shows in your calendar
- Check that the backend is running
- Verify your entity/profile is selected

## What's Next?

**Phase 2 Features (Future):**
- Product-level tracking (t-shirts, CDs, vinyl, etc.)
- Inventory management
- Export reports to CSV/PDF
- Email notifications for new sales
- Tax calculations
- Refund tracking
- Multi-location support

## Need Help?

Check the comprehensive documentation:
- `/SQUARE_MERCH_INTEGRATION_COMPLETE.md`

---

**You're all set!** 🎉

Click "Sync Square" and start tracking your merch sales like a pro!
