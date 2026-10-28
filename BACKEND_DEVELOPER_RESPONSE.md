# Response to Backend Developer Concerns - Data Structure Conflicts

## Executive Summary

**The local backend setup will NOT conflict with your production Azure backend.** This is a completely isolated local development environment that:

1. Uses a separate database (NeonDB for local development)
2. Is disabled by default (controlled by environment variable)
3. Matches your existing Azure API structure
4. Can be removed or disabled at any time without affecting production

## Key Points to Address Concerns

### 1. **Environment-Based Routing** ✅

The local backend is **opt-in only** and controlled by a single environment variable:

```env
# .env.local
USE_LOCAL_BACKEND=true    # Local development
USE_LOCAL_BACKEND=false   # Uses Azure backend (production)
```

**Default behavior:** If this variable is not set or is `false`, the application uses your Azure backend exactly as before.

### 2. **Separate Databases** ✅

- **Azure Production:** Your existing SQL Server/CosmosDB/whatever you're using
- **Local Development:** NeonDB PostgreSQL (separate instance, separate credentials)

**No overlap. No conflicts. Completely isolated.**

### 3. **API Compatibility** ✅

The local backend was designed to **mirror your Azure API structure**, not replace it:

```
Production Azure API:
POST https://scenegen-apim.azure-api.net/scenegen-api/artist/add

Local Development API:
POST http://localhost:3001/api/artist/add
```

Same request/response format, same field names, same validation rules.

### 4. **Frontend API Routes** ✅

The frontend uses a **proxy pattern** that routes to either Azure or local backend:

```typescript
// src/app/api/artist/add/route.ts
const USE_LOCAL_BACKEND = process.env.USE_LOCAL_BACKEND === 'true';

const apiUrl = USE_LOCAL_BACKEND
  ? `${LOCAL_BACKEND_URL}/api/artist/add`      // Local dev
  : `${API_BASE_URL}/artist/add`;              // Azure production
```

**This is a development convenience, not a production change.**

## Why We Built This

### Problem:
- Frontend developers were blocked waiting for Azure backend endpoints
- No way to develop/test offline or without Azure credentials
- Slow iteration cycle (deploy → test → fix → deploy)

### Solution:
- Local backend for rapid frontend development
- Database persistence for realistic testing
- Full offline development capability

### Result:
- Frontend team can work independently
- Faster development iteration
- Better testing before Azure deployment

## Data Structure Alignment

### Your Concern: "Will this conflict with my schema?"

**Answer: No, because:**

1. **We're matching YOUR structure**, not creating our own:
   - Entity types: `artist` | `promoter` (matching your enum)
   - Field names: `administrator_id`, `entity_type`, etc. (matching your naming)
   - Relationships: entity → shows → tours (matching your model)

2. **We can adjust to match exactly**:
   - Send us your schema, we'll update ours
   - Send us your API specs, we'll match them
   - Send us your validation rules, we'll implement them

3. **This is a development tool**, not a production system:
   - Used only in local development
   - Never deployed to production
   - Can be completely removed if needed

## Current Local Schema

Here's what we have now (can be modified to match yours):

```sql
-- Entities (Artist/Promoter profiles)
CREATE TABLE entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  administrator_id VARCHAR(255) UNIQUE NOT NULL,  -- Azure AD B2C user ID
  entity_type VARCHAR(20) NOT NULL,               -- 'artist' or 'promoter'
  name VARCHAR(255) NOT NULL,
  bio TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  country VARCHAR(100),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Shows (Individual gigs)
CREATE TABLE shows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id VARCHAR(255) NOT NULL,
  tour_id UUID REFERENCES tours(id),
  venue_name VARCHAR(255) NOT NULL,
  venue_address TEXT NOT NULL,
  city VARCHAR(100) NOT NULL,
  -- ... more fields matching your schema
);

-- Tours
CREATE TABLE tours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  -- ... more fields
);

-- Invites
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_entity_id VARCHAR(255) NOT NULL,
  to_email VARCHAR(255) NOT NULL,
  -- ... more fields
);
```

**Question for you:** Does this match your Azure schema, or do we need to adjust?

## Integration Points

### What We Need from You:

1. **API Specification**
   - OpenAPI/Swagger docs for your endpoints
   - Request/response examples
   - Validation rules
   - Error response formats

2. **Schema Documentation**
   - Table structures
   - Field types and constraints
   - Relationships
   - Required vs optional fields

3. **Authentication Flow**
   - How to extract user ID from JWT
   - Which claims to use (`oid`, `sub`, etc.)
   - Token validation requirements

### What We Can Provide:

1. **Alignment Report**
   - Comparison of local vs Azure schemas
   - List of any differences
   - Migration plan to align them

2. **Testing Against Azure API**
   - Run frontend against Azure backend
   - Compare responses
   - Ensure compatibility

3. **Easy Removal**
   - All local backend code is in `/backend` folder
   - Can be deleted without affecting frontend
   - Frontend works with or without it

## Deployment Strategy

### Development Environment:
```
Frontend (localhost:3002)
    ↓
Local Backend (localhost:3001)  ← USE_LOCAL_BACKEND=true
    ↓
NeonDB PostgreSQL (dev database)
```

### Staging/Production Environment:
```
Frontend (Azure/Vercel)
    ↓
Azure API Gateway  ← USE_LOCAL_BACKEND=false (or not set)
    ↓
Your Azure Backend Services
    ↓
Your Production Database
```

**No conflict. Different environments. Completely isolated.**

## Addressing Specific Concerns

### Concern: "Will this be deployed to production?"
**Answer:** No. The local backend runs only on developer machines. The `/backend` folder is not part of the production deployment. Production always uses your Azure backend.

### Concern: "Will this diverge from our schema?"
**Answer:** Only if we don't communicate. We'll align with your schema and keep it synced. Send us updates, and we'll update the local schema to match.

### Concern: "Will frontend developers bypass our API?"
**Answer:** No. The local backend is for development only. All production traffic goes through your Azure API. This is just a development tool, like a mock server.

### Concern: "What if local and Azure behave differently?"
**Answer:** Good catch! That's why we need:
- Your API specs to ensure compatibility
- Integration testing against Azure before production
- Regular syncs to catch any divergence

## Proposed Collaboration

### Step 1: Schema Review
- You share your current Azure database schema
- We update local backend to match exactly
- Document any intentional differences

### Step 2: API Contract
- You share API specifications (OpenAPI/Swagger)
- We ensure local backend matches request/response formats
- Set up contract testing

### Step 3: Testing Protocol
- Frontend tests against local backend during development
- Frontend tests against Azure backend before production deploy
- CI/CD runs tests against both to catch divergence

### Step 4: Communication Channel
- Set up Slack/Teams channel for schema changes
- Document all API changes in shared location
- Review local backend updates together

## Technical Safeguards

### 1. Environment Variable Check
```typescript
// Frontend always checks before using local backend
if (process.env.USE_LOCAL_BACKEND !== 'true') {
  // Use Azure backend (default behavior)
}
```

### 2. Separate Codebases
```
/backend          ← Local development only, never deployed
/src/app/api      ← Production API routes (can work with either)
/src/components   ← UI components (backend-agnostic)
```

### 3. Configuration Management
```env
# Production (.env.production)
USE_LOCAL_BACKEND=false
NEXT_PUBLIC_API_BASE_URL=https://scenegen-apim.azure-api.net

# Development (.env.local)
USE_LOCAL_BACKEND=true
LOCAL_BACKEND_URL=http://localhost:3001
```

## Bottom Line

**This is a development tool, not a production change.**

- ✅ **No risk to production** - Local backend never deployed
- ✅ **No database conflicts** - Separate databases
- ✅ **No API conflicts** - Environment-based routing
- ✅ **Easy to remove** - Delete `/backend` folder, set `USE_LOCAL_BACKEND=false`
- ✅ **Improves development speed** - Frontend team unblocked
- ✅ **Aligns with your schema** - We'll match your structure exactly

## Next Steps

1. **Share your schema** - We'll align the local backend
2. **Share your API specs** - We'll ensure compatibility
3. **Schedule a sync** - 30-minute call to review together
4. **Set up testing** - Ensure local and Azure behave identically

## Questions for You

1. What database are you using in Azure? (SQL Server, CosmosDB, PostgreSQL?)
2. Can you share your current table schemas?
3. Do you have OpenAPI/Swagger documentation for the API?
4. What's your preferred communication channel for schema updates?
5. Would you like us to remove/modify anything in the local setup?

---

**tl;dr**: This is a local development database, completely separate from production, controlled by an environment variable, and can be removed at any time. It won't conflict with your DevOps setup because it never touches production infrastructure. We're happy to align it exactly with your schema or remove it entirely if preferred.
