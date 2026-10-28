# Design System Refactor - Quick Status

## ✅ Completed This Session (5 Files)

1. ✅ `/src/app/import/components/Step3Validation.tsx`
2. ✅ `/src/components/tours/TourDetailsModal.tsx`
3. ✅ `/src/app/calendar/page.tsx`
4. ✅ `/src/app/contacts/page.tsx`
5. ✅ `/src/app/artist/[id]/page.tsx`

**Total Replacements**: ~42
**Build Status**: ✅ Passing

---

## 🎯 Top 3 Next Targets

1. 🔥 **ShowsTable.tsx** - High visibility component
2. 🔥 **GoogleCalendarConnectModal.tsx** - User interaction
3. 🔥 **CreateShowForm.tsx** - 50+ violations

---

## 📋 Quick Replacement Guide

| Legacy Class | New Token |
|-------------|-----------|
| `text-muted-foreground` | `text-text-tertiary` |
| `bg-muted` | `bg-surface-elevated` |
| `bg-card` | `bg-surface-elevated` |
| `border-border` | `border-border-subtle` |
| `text-green-600` | `text-semantic-success` |
| `text-red-600` | `text-semantic-error` |
| `text-yellow-600` | `text-semantic-warning` |
| `bg-green-50` | `state-success-subtle` |

---

## 🔍 Remaining Violations

**Legacy Classes**: ~200-300 instances
**Semantic Colors**: ~100+ hard-coded colors
**Estimated Progress**: 25% complete

---

## 📊 File Priority Matrix

### 🔴 Critical (Do Next)
- ShowsTable.tsx
- CreateShowForm.tsx
- GoogleCalendarConnectModal.tsx

### 🟡 High
- ContactsTable.tsx
- CalendarEventContextMenu.tsx
- AddToTourModal.tsx

### 🟢 Medium
- GenerateInvite.tsx
- DocumentUpload.tsx
- EntitySearch.tsx

---

## ✨ Quick Win Commands

```bash
# Search for remaining violations
grep -r "text-muted-foreground" src/

# Check build
npm run build

# Run dev server
npm run dev
```

---

**Last Updated**: Current Session
**See Full Details**: DESIGN_REFACTOR_SESSION_SUMMARY.md
