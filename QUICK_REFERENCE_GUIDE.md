# SceneGen App: Quick Reference Guide 📚

## Recent Enhancements (Complete)

### 🎨 Design System Refactor
**Status:** ✅ 100% Complete
**Files Modified:** 46+ files
**Verification:** 0 legacy classes, 0 hard-coded semantics

**Key Tokens:**
- Neutrals: `text-text-primary`, `bg-surface-base`, `border-border-default`
- Semantics: `text-semantic-success`, `bg-semantic-error`, `text-semantic-warning`
- Accents: `text-accent-cyan`, `bg-accent-purple`, `border-accent-blue`
- Interactive: `bg-interactive-primary`, `hover:bg-interactive-primary-hover`

**Documentation:** `DESIGN_SYSTEM_REFACTOR_COMPLETE.md`

---

### 🎭 Edit Tour Modal
**Status:** ✅ Complete
**Location:** `/src/components/tours/EditTourModal.tsx`
**Trigger:** "Edit Tour" button on tour details page

**Actions:**
1. **Add Shows from CSV** → `/import?tourId=...`
2. **Edit Tour Budget** → `/bookkeeping?tourId=...`

**Documentation:** `EDIT_TOUR_MODAL_COMPLETE.md`

---

### 📋 Import Wizard: Editable Shows
**Status:** ✅ Complete
**Location:** `/src/app/import/components/Step3Validation.tsx`

**Features:**
- "Already Saved" badge for existing shows
- Read-only address display by default
- "Edit Address" button for intentional edits
- "Cancel Edit" to revert changes
- New shows remain fully editable

**Documentation:** `IMPORT_WIZARD_EDITABLE_SHOWS_COMPLETE.md`

---

## File Structure

```
/Users/jon/Desktop/scenegen/SceneGenUIV2/
├── src/
│   ├── app/                      # Next.js app directory
│   │   ├── tours/[id]/page.tsx  # Tour details (uses EditTourModal)
│   │   ├── import/
│   │   │   └── components/
│   │   │       └── Step3Validation.tsx  # Editable shows logic
│   │   ├── bookkeeping/         # Budget management
│   │   ├── calendar/            # Calendar integration
│   │   ├── shows/               # Show management
│   │   └── ...
│   │
│   ├── components/
│   │   ├── tours/
│   │   │   ├── EditTourModal.tsx      # NEW: Tour edit modal
│   │   │   └── ...
│   │   ├── ui/                        # Reusable UI components
│   │   ├── maps/                      # Google Maps/Places
│   │   └── ...
│   │
│   ├── styles/
│   │   └── globals.css         # Design system tokens defined here
│   │
│   ├── types/                  # TypeScript types
│   ├── hooks/                  # Custom React hooks
│   └── lib/                    # Utility functions
│
├── public/                     # Static assets
├── documentation/              # (Markdown files at root)
└── ...
```

---

## Design System Reference

### Color Token Structure
```css
/* Neutral Colors */
--text-primary: rgba(255, 255, 255, 0.95);
--text-secondary: rgba(255, 255, 255, 0.75);
--text-tertiary: rgba(255, 255, 255, 0.5);

--surface-base: #0A0D14;
--surface-elevated: #12151F;
--surface-raised: #1A1E2E;

--border-default: rgba(255, 255, 255, 0.1);
--border-subtle: rgba(255, 255, 255, 0.05);
--border-strong: rgba(255, 255, 255, 0.2);

/* Semantic Colors */
--semantic-success: #10B981;
--semantic-error: #EF4444;
--semantic-warning: #F59E0B;
--semantic-info: #3B82F6;

/* Accent Colors */
--accent-cyan: #06B6D4;
--accent-purple: #A855F7;
--accent-blue: #3B82F6;

/* Interactive */
--interactive-primary: #06B6D4;
--interactive-primary-hover: #0891B2;
--interactive-secondary: rgba(6, 182, 212, 0.15);
--interactive-secondary-hover: rgba(6, 182, 212, 0.25);
```

### Usage Examples
```tsx
// Text
<p className="text-text-primary">Primary Text</p>
<p className="text-text-secondary">Secondary Text</p>

// Backgrounds
<div className="bg-surface-base">Base Surface</div>
<div className="bg-surface-elevated">Elevated Surface</div>

// Borders
<div className="border border-border-default">Default Border</div>

// Semantics
<div className="bg-semantic-success/20 text-semantic-success">Success</div>
<div className="bg-semantic-error/20 text-semantic-error">Error</div>

// Interactive
<button className="bg-interactive-primary hover:bg-interactive-primary-hover">
  Primary Action
</button>
```

---

## Import Wizard Flow

### Step 1: Upload CSV
- User uploads CSV file with show data
- File is parsed and validated

### Step 2: Map Fields
- User maps CSV columns to show fields
- Intelligent auto-detection helps

### Step 3: Validation & Addresses ⭐ (Enhanced)
- Validation results displayed
- User enters venue addresses
- **NEW:** Already-saved shows are read-only by default
- **NEW:** "Edit Address" button for intentional edits
- **NEW:** "Already Saved" badge for visual clarity
- User can mark shows as "Off Day" or "Travel Day"

### Step 4: Summary & Execute
- Import summary with stats
- User confirms and executes import
- Shows/budgets saved to database

---

## Component Library

### Buttons
```tsx
import { Button } from '@/components/ui/button';

<Button variant="default">Primary</Button>
<Button variant="outline">Secondary</Button>
<Button variant="ghost">Tertiary</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

### Modals
```tsx
import { Modal } from '@/components/ui/modal';

<Modal open={isOpen} onClose={() => setIsOpen(false)}>
  <Modal.Header>Title</Modal.Header>
  <Modal.Body>Content</Modal.Body>
  <Modal.Footer>
    <Button onClick={() => setIsOpen(false)}>Close</Button>
  </Modal.Footer>
</Modal>
```

### Forms
```tsx
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

<Input
  type="text"
  placeholder="Enter text..."
  value={value}
  onChange={(e) => setValue(e.target.value)}
/>

<Select value={value} onChange={(e) => setValue(e.target.value)}>
  <option value="1">Option 1</option>
  <option value="2">Option 2</option>
</Select>
```

---

## API Routes

### Tours
- `GET /api/tours` - List all tours
- `GET /api/tours/:id` - Get tour details
- `GET /api/tours/:id/shows` - Get shows for a tour
- `POST /api/tours` - Create new tour
- `PUT /api/tours/:id` - Update tour
- `DELETE /api/tours/:id` - Delete tour

### Shows
- `GET /api/shows` - List all shows
- `GET /api/shows/:id` - Get show details
- `POST /api/shows` - Create new show
- `PUT /api/shows/:id` - Update show
- `DELETE /api/shows/:id` - Delete show

### Import
- `POST /api/import/execute` - Execute import (shows + budgets)

### Budgets
- `GET /api/budgets` - List all budgets
- `GET /api/budgets/:id` - Get budget details
- `POST /api/budgets` - Create new budget
- `PUT /api/budgets/:id` - Update budget

---

## Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_api_key_here
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret_here
```

---

## Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Type check
npx tsc --noEmit
```

---

## Testing Checklist

### Design System
- [ ] All pages use design system tokens
- [ ] No `text-gray-*`, `bg-blue-*`, etc. classes
- [ ] No hard-coded semantic colors (e.g., `text-green-600`)
- [ ] Dark theme is consistent

### Edit Tour Modal
- [ ] Opens on "Edit Tour" click
- [ ] "Add Shows from CSV" navigates correctly
- [ ] "Edit Tour Budget" navigates correctly
- [ ] Modal closes properly

### Import Wizard
- [ ] CSV upload works
- [ ] Field mapping works
- [ ] Address entry works
- [ ] Already-saved shows show badge
- [ ] Address inputs disabled for saved shows
- [ ] "Edit Address" enables editing
- [ ] "Cancel Edit" reverts changes
- [ ] Auto-save triggers correctly
- [ ] Import executes successfully

---

## Common Tasks

### Add a New Page
1. Create file in `/src/app/[route]/page.tsx`
2. Use design system tokens for styling
3. Add to navigation if needed

### Create a New Component
1. Create file in `/src/components/[category]/ComponentName.tsx`
2. Use TypeScript for props
3. Use design system tokens
4. Export from component

### Add a New API Route
1. Create file in `/src/app/api/[route]/route.ts`
2. Export GET, POST, PUT, DELETE handlers
3. Use proper error handling

### Update Design System
1. Edit `/src/styles/globals.css`
2. Add/modify CSS variables
3. Update Tailwind config if needed
4. Document new tokens

---

## Support & Documentation

### Documentation Files
- `ALL_TASKS_COMPLETE_FINAL.md` - Complete project summary
- `DESIGN_SYSTEM_REFACTOR_COMPLETE.md` - Design system details
- `EDIT_TOUR_MODAL_COMPLETE.md` - Edit tour modal guide
- `IMPORT_WIZARD_EDITABLE_SHOWS_COMPLETE.md` - Import wizard enhancement
- `IMPORT_WIZARD_BEFORE_AFTER_VISUAL.md` - Visual comparison guide
- `QUICK_REFERENCE_GUIDE.md` - This file

### Key Technologies
- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + Custom Design System
- **Maps:** Google Maps Platform
- **Backend:** Django REST API
- **Database:** PostgreSQL

---

## Status: ✅ ALL SYSTEMS OPERATIONAL

**Last Updated:** Current session
**Version:** 2.0 (Post-refactor)
**Build Status:** ✅ Compiling successfully
**Design System:** ✅ 100% compliant
**Features:** ✅ All enhancements complete

---

**Happy Coding! 🚀**
