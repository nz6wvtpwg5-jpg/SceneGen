# ⚡ QUICK REFERENCE CARD

Keep this handy while working! 📌

---

## 🎯 RIGHT NOW: Do This First

1. Open: **`CALENDAR_SETUP_CHECKLIST.md`**
2. Get Google OAuth credentials (15 min)
3. Test calendar sync

---

## 📋 Essential Commands

```bash
# Start development
pnpm dev

# Stop server
Ctrl + C

# Clear cache & restart
rm -rf .next && pnpm dev

# Build for production
pnpm build
```

---

## 📁 Must-Know Files

**Configuration:**
- `.env.local` - Add Google credentials here
- `src/auth.ts` - Authentication setup

**Calendar Code:**
- `src/services/google-calendar.ts` - Calendar service
- `src/app/api/calendar/` - API routes
- `src/components/shows/CalendarSyncButton.tsx` - UI

---

## 📖 Document Quick Find

| I want to... | Open this |
|-------------|-----------|
| Set up calendar | `CALENDAR_SETUP_CHECKLIST.md` |
| Test calendar | `CALENDAR_TESTING_GUIDE.md` |
| See what's done | `SESSION_SUMMARY.md` |
| Check progress | `PROJECT_STATUS.md` |
| Find a document | `README_START_HERE.md` |
| Fix backend | `BACKEND_TODO.md` |

---

## 🔧 Google OAuth Setup (Cheat Sheet)

1. https://console.cloud.google.com/
2. Create project → Enable Calendar API
3. OAuth consent → External → Add scope
4. Create credentials → OAuth client ID
5. Copy Client ID & Secret
6. Add to `.env.local`:
   ```bash
   GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=GOCSPX-xxx
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
   ```
7. Restart: `pnpm dev`

---

## 🧪 Quick Test

After setup:
1. Go to `/shows`
2. Click calendar icon (🗓️)
3. Authorize Google (first time)
4. Check Google Calendar
5. ✅ Event should appear!

---

## 🐛 Troubleshooting

**No calendar icon?**
- Clear cache: `rm -rf .next && pnpm dev`
- Hard refresh browser: `Cmd+Shift+R`

**OAuth error?**
- Check redirect URI in Google Console
- Must be: `http://localhost:3000/api/auth/callback/google`

**Missing credentials?**
- Check `.env.local` has all 3 Google vars
- Restart server after adding

---

## 📊 Progress Tracker

- [x] All code implemented
- [x] Documentation complete
- [ ] Calendar OAuth setup ← **YOU ARE HERE**
- [ ] Test calendar sync
- [ ] Full testing pass
- [ ] Backend fixes
- [ ] Launch!

---

## 💡 Tips

✅ Use Chrome for OAuth (best support)
✅ Test in incognito for clean state
✅ Take screenshots of success
✅ Document any issues found
✅ Celebrate small wins! 🎉

---

## 🆘 Help

**Stuck?** Check these in order:
1. `CALENDAR_SETUP_CHECKLIST.md`
2. Browser console (F12)
3. Terminal output
4. `CALENDAR_QUICKSTART.md`

---

## 🎯 Success =

Calendar icon appears → Click it → Google auth → Event in calendar ✨

---

**You've got this! 💪 Now go to CALENDAR_SETUP_CHECKLIST.md!**
