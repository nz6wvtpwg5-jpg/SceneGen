# Google Places Autocomplete Click Fix

## Issue
When typing in the "Venue Name" field in the Edit Show modal (or Create Show modal), Google Places Autocomplete shows suggestions (e.g., "Rockefeller Mariboes gate, Oslo, Norway"), but clicking on them doesn't work - nothing happens when you try to click a suggestion.

## Root Causes
1. **Z-index Issue**: The `.pac-container` (Google's dropdown) wasn't appearing above the modal (z-index 50)
2. **Event Handling**: The mousedown/click event handlers weren't properly attached to dynamically created dropdown items
3. **Styling**: The dropdown wasn't styled to match the dark theme, making it hard to see/interact with

## Solutions Applied

### 1. CSS Z-Index and Styling (`src/app/globals.css`)
Added comprehensive styling for the Google Places autocomplete dropdown:

```css
.pac-container {
  z-index: 9999 !important; /* Above all modals */
  background-color: #151C2B !important;
  border: 1px solid rgba(120, 180, 255, 0.28) !important;
  border-radius: 12px !important;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(90, 160, 255, 0.22) !important;
}

.pac-item {
  cursor: pointer !important; /* Ensure clickable cursor */
  /* ... dark theme styling ... */
}
```

**Key fixes:**
- ✅ `z-index: 9999` ensures dropdown appears above modals (which use z-50 = 50)
- ✅ `cursor: pointer` makes items clearly clickable
- ✅ Dark theme styling matches the rest of the UI
- ✅ Hover states with highlighted background

### 2. Event Handler Improvements (`src/components/ui/PlacesAutocomplete.tsx`)

#### A. Removed `preventDefault()` and `stopPropagation()`
These were blocking Google's own click handlers:
```tsx
// BEFORE (blocking clicks):
e.preventDefault();
e.stopPropagation();

// AFTER (allows clicks):
// Do NOT prevent default - let Google handle the click naturally
```

#### B. Added Direct Click Listeners to Items
In addition to mousedown on the container, now also attaching click listeners directly to each `.pac-item`:

```tsx
const items = container.querySelectorAll('.pac-item');
items.forEach((item) => {
  item.addEventListener('click', () => {
    console.log('🖱️ [PlacesAutocomplete] Item clicked!');
    isSelectingRef.current = true;
  });
});
```

#### C. Multiple Attachment Attempts
Since the dropdown is created dynamically by Google, we attach listeners:
1. On initialization (via MutationObserver)
2. On input focus (100ms delay)
3. On input focus (500ms delay for safety)

This ensures we catch the dropdown no matter when it's created.

### 3. Reset Selection Flag on Focus
```tsx
const handleFocus = () => {
  isSelectingRef.current = false; // Reset the flag
  // ... attach listeners
};
```

This ensures the blur handler doesn't interfere with selections.

## How It Works Now

1. **User types** in the Venue Name field
2. **Google creates** the `.pac-container` dropdown dynamically
3. **MutationObserver detects** the dropdown and attaches event listeners
4. **CSS ensures** the dropdown appears above the modal with proper z-index
5. **User clicks** a suggestion
6. **Event listeners** mark `isSelectingRef.current = true`
7. **Google's handler** fires the `place_changed` event
8. **Our handler** calls `onPlaceSelect()` with the place data
9. **Form auto-fills** venue address, city, state, country from Google's data

## Testing Checklist

✅ Click Edit on a show → Modal opens  
✅ Type in Venue Name field → Google suggestions appear  
✅ Suggestions are styled with dark theme  
✅ Suggestions appear ABOVE the modal (not behind it)  
✅ Hover over suggestion → Background highlights  
✅ Click on suggestion → Form fields auto-fill  
✅ Venue Address, City, State, Country all populate correctly  
✅ Works in Create Show modal too  
✅ Works in Calendar Event → Show conversion  

## Browser Console Logs

You should see:
```
🖱️ [PlacesAutocomplete] Mousedown on pac-container detected!
🖱️ [PlacesAutocomplete] Item clicked!
🔥 [PlacesAutocomplete] place_changed event fired!
📍 [PlacesAutocomplete] Place object: {...}
📝 [PlacesAutocomplete] Setting value to: Rockefeller
🎯 [PlacesAutocomplete] Calling onPlaceSelect callback
```

## Files Modified

1. `/src/app/globals.css` - Added `.pac-container` styling and z-index fix
2. `/src/components/ui/PlacesAutocomplete.tsx` - Improved event handling and removed blocking preventDefault()

## Status
✅ **Complete** - Google Places autocomplete now fully clickable in modals
