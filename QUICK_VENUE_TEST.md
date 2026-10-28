# Quick Test - Venue Name Fix

## What Was Fixed
- **Problem**: "Burgerw" appeared in both venue name AND address
- **Fix**: If location has no comma, venue address is now empty (not duplicated)

## Quick Test (2 minutes)

### 1. Open Console
- Press **F12** or **Cmd+Option+I**
- Go to **Console** tab

### 2. Create Calendar Event
- Go to `http://localhost:3000/shows`
- Click on a date
- Title: "Test"
- Location: Type "Burgerw" (don't select autocomplete)
- Save

### 3. Convert to Show
- Right-click event → "Add as a show"
- **Look at Console**:
  ```
  Parsed venue name: Burgerw
  Parsed venue address: (empty)  ← Should be EMPTY
  ```

### 4. Check Form
- ✅ Venue Name = "Burgerw"
- ✅ Venue Address = empty (NOT "Burgerw")

## What You Should See

**BEFORE THE FIX:**
```
Venue Name: Burgerw
Venue Address: Burgerw  ← WRONG (duplicated)
```

**AFTER THE FIX:**
```
Venue Name: Burgerw
Venue Address: [empty]  ← CORRECT
```

## Pro Tip
For best results, **always use Google Places Autocomplete**:
1. Type venue name
2. Wait for dropdown
3. **SELECT from dropdown**
4. Complete address auto-fills!

---
📄 Full testing guide: `VENUE_NAME_FIX_TESTING_GUIDE.md`
