# Quick Fix Checklist: Backend Alignment

## Phase 1: Immediate Fixes (Est. 2-3 hours)

### 1. Update Response Field Names (30 min)

#### File: `/backend/server.js`

**Change 1: /api/user/entities response**
```javascript
// BEFORE (line ~35)
const entities = result.rows.map(row => ({
  id: row.id,
  name: row.name,
  entity_type: row.entity_type,
  created_at: row.created_at
}));

// AFTER
const entities = result.rows.map(row => ({
  id: row.id,
  name: row.name,
  entityType: row.entity_type,  // Changed to camelCase
  createdAt: row.created_at     // Changed to camelCase
}));
```

**Change 2: /api/artist/add response**
```javascript
// BEFORE (line ~78)
res.status(201).json({
  id: result.rows[0].id,
  name: result.rows[0].name,
  entity_type: 'artist',
  location: result.rows[0].location,
  created_at: result.rows[0].created_at
});

// AFTER
res.status(201).json({
  id: result.rows[0].id,
  name: result.rows[0].name,
  entityType: 'artist',          // Changed to camelCase
  country: location.country,      // Add flat fields
  city: location.city,
  state: location.state,
  bio: bio || '',
  location: result.rows[0].location, // Keep nested for reference
  createdAt: result.rows[0].created_at
});
```

**Change 3: /api/promoter/add response**
```javascript
// Same pattern as artist/add above
```

---

### 2. Add JWT Verification (1 hour)

#### File: `/backend/package.json`
Add dependency:
```bash
cd backend
npm install jsonwebtoken
```

#### File: `/backend/server.js`
Add at top:
```javascript
const jwt = require('jsonwebtoken');

// JWT verification middleware
function authenticateUser(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No authorization token provided' });
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    // For NextAuth JWT, use the NEXTAUTH_SECRET from frontend .env
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET);
    req.userId = decoded.sub || decoded.userId; // Extract user ID from JWT
    console.log('Authenticated user:', req.userId);
    next();
  } catch (error) {
    console.error('JWT verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}
```

Update routes to use middleware:
```javascript
// Replace this pattern in ALL routes:
// const userId = req.headers['x-user-id'];
// if (!userId) { return res.status(401)... }

// WITH:
app.get('/api/user/entities', authenticateUser, async (req, res) => {
  const userId = req.userId; // From JWT middleware
  // ... rest of code
});

app.post('/api/artist/add', authenticateUser, async (req, res) => {
  const userId = req.userId; // From JWT middleware
  // ... rest of code
});

app.post('/api/promoter/add', authenticateUser, async (req, res) => {
  const userId = req.userId; // From JWT middleware
  // ... rest of code
});
```

#### File: `/backend/.env`
Add:
```bash
NEXTAUTH_SECRET=<same value from frontend .env>
```

---

### 3. Add Alias Field to Database (30 min)

#### File: `/backend/migrate.js`

Add after line ~8 (in CREATE TABLE entities):
```sql
CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL CHECK (entity_type IN ('artist', 'promoter')),
  name VARCHAR(255) NOT NULL,
  alias VARCHAR(255) UNIQUE,  -- ADD THIS LINE
  location JSONB,
  bio TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name, entity_type)
);
```

Run migration:
```bash
cd backend
node migrate.js
```

#### File: `/backend/server.js`

Update artist/add and promoter/add to generate alias:
```javascript
// Add helper function at top
function generateAlias(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// In /api/artist/add (line ~50):
const alias = generateAlias(name);

// Update INSERT query:
const result = await pool.query(
  `INSERT INTO entities (user_id, entity_type, name, alias, location, bio)
   VALUES ($1, $2, $3, $4, $5, $6)
   RETURNING *`,
  [userId, 'artist', name, alias, location, bio]
);

// In response:
res.status(201).json({
  id: result.rows[0].id,
  name: result.rows[0].name,
  alias: result.rows[0].alias,  // Add this
  entityType: 'artist',
  // ... rest of fields
});
```

---

### 4. Handle Request Body Format (30 min)

**DECISION**: Keep frontend as-is (nested location) and transform in backend

#### File: `/backend/server.js`

Update both artist/add and promoter/add:
```javascript
app.post('/api/artist/add', authenticateUser, async (req, res) => {
  try {
    const userId = req.userId;
    let { name, location, bio } = req.body;

    // Support both formats: nested location object OR flat fields
    if (!location && (req.body.city || req.body.country)) {
      location = {
        city: req.body.city,
        state: req.body.state,
        country: req.body.country,
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        placeId: req.body.placeId
      };
    }

    // Validation
    if (!name || !location || !location.city || !location.country) {
      return res.status(400).json({
        error: 'Missing required fields: name, location.city, location.country'
      });
    }

    // ... rest of code (duplicate check, insert, etc.)

    // Response with BOTH flat and nested:
    res.status(201).json({
      id: result.rows[0].id,
      name: result.rows[0].name,
      alias: result.rows[0].alias,
      entityType: 'artist',
      country: location.country,
      city: location.city,
      state: location.state || '',
      bio: bio || '',
      location: result.rows[0].location,
      createdAt: result.rows[0].created_at
    });
  } catch (error) {
    // ... error handling
  }
});
```

---

## Phase 2: Frontend Adjustments (Est. 1 hour)

### 5. Update Frontend Type Definitions

#### File: `/src/lib/entity.ts` (or types/index.ts)

```typescript
export interface Entity {
  id: string;
  name: string;
  alias?: string;
  entityType: 'artist' | 'promoter';  // Changed from entity_type
  country: string;
  city: string;
  state?: string;
  bio?: string;
  location?: {
    city: string;
    state?: string;
    country: string;
    latitude?: number;
    longitude?: number;
    placeId?: string;
  };
  createdAt: string;  // Changed from created_at
}

export interface AddArtistResponse extends Entity {
  entityType: 'artist';
}

export interface AddPromoterResponse extends Entity {
  entityType: 'promoter';
}
```

### 6. Update Frontend Components

#### File: `/src/app/onboarding/page.tsx`

Update the state/data access to use camelCase:
```typescript
// BEFORE
const entities = await response.json();
const hasEntity = entities.some(e => e.entity_type === 'artist' || e.entity_type === 'promoter');

// AFTER
const entities = await response.json();
const hasEntity = entities.some(e => e.entityType === 'artist' || e.entityType === 'promoter');
```

#### File: `/src/app/dashboard/page.tsx`

Same pattern - update any references to `entity_type` → `entityType`

---

## Testing Checklist

### After Each Change:

#### 1. Test JWT Authentication
```bash
# Get a token from the frontend (browser dev tools → Application → Cookies → next-auth.session-token)
# Or login and copy from Network tab

export TOKEN="your-actual-jwt-token"

curl -X GET http://localhost:3001/api/user/entities \
  -H "Authorization: Bearer $TOKEN"

# Should return 200 with entities array (NOT 401)
```

#### 2. Test Entity Creation
```bash
curl -X POST http://localhost:3001/api/artist/add \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Band",
    "location": {
      "city": "Austin",
      "state": "TX",
      "country": "United States",
      "latitude": 30.2672,
      "longitude": -97.7431
    },
    "bio": "Test bio"
  }'

# Check response has:
# - alias field
# - entityType (camelCase)
# - both flat fields (city, state, country) AND nested location
```

#### 3. Test Frontend Integration
1. Start backend: `cd backend && npm start`
2. Start frontend: `npm run dev`
3. Login to app
4. Go to onboarding page
5. Create an artist/promoter
6. Check browser Network tab:
   - Request should have `Authorization: Bearer <token>`
   - NO `X-User-Id` header needed
   - Response should have camelCase fields
7. Go to dashboard
8. Verify entities display correctly

---

## Rollback Plan

If anything breaks:

1. **Database**: Backup before migration
   ```bash
   pg_dump $DATABASE_URL > backup_before_alias.sql
   ```

2. **Code**: Git commit before changes
   ```bash
   git add .
   git commit -m "Before backend alignment changes"
   ```

3. **Restore**: If needed
   ```bash
   git reset --hard HEAD
   psql $DATABASE_URL < backup_before_alias.sql
   ```

---

## Estimated Timeline

| Task | Time | Priority |
|------|------|----------|
| 1. Update response field names | 30 min | High |
| 2. Add JWT verification | 1 hour | High |
| 3. Add alias field | 30 min | Medium |
| 4. Handle request formats | 30 min | Medium |
| 5. Update frontend types | 15 min | High |
| 6. Update frontend components | 15 min | High |
| Testing all changes | 30 min | High |
| **TOTAL** | **3.5 hours** | |

---

## Questions Before Starting

1. **NEXTAUTH_SECRET**: What is the value in the frontend .env file?
   - Need this for JWT verification in backend

2. **Database backup**: Should I create a backup before migration?
   - Recommendation: Yes, always backup before schema changes

3. **Breaking changes**: This will break existing frontend code temporarily
   - Should I make all changes at once OR incremental?
   - Recommendation: All at once (1 PR with all changes)

---

## Success Criteria

After completing all changes:

✅ Backend verifies JWT tokens (no more X-User-Id header)
✅ Response fields use camelCase (entityType, createdAt)
✅ Entities have an alias field
✅ Backend accepts both nested and flat location formats
✅ Frontend displays entities correctly
✅ All curl tests pass
✅ Browser integration tests pass
✅ Zero TypeScript errors

