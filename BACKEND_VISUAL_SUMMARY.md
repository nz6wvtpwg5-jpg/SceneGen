# Backend Alignment: Visual Summary

```
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND ALIGNMENT STATUS                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Question: Do new endpoints exist in Azure backend?                │
│  Answer:   ✅ YES - All three endpoints are in the OpenAPI spec    │
│                                                                     │
│  Status:   🟢 No architectural conflicts                           │
│            🟡 Minor alignment needed (3-4 hours)                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## Endpoint Status Matrix

```
┌──────────────────────┬──────────────┬───────────────┬──────────────┐
│ Endpoint             │ Azure Backend│ Local Backend │ Status       │
├──────────────────────┼──────────────┼───────────────┼──────────────┤
│ GET /user/entities   │      ✅      │      ✅       │ 🟡 Align     │
│ POST /artist/add     │      ✅      │      ✅       │ 🟡 Align     │
│ POST /promoter/add   │      ✅      │      ✅       │ 🟡 Align     │
└──────────────────────┴──────────────┴───────────────┴──────────────┘

Legend:
  ✅ = Implemented
  🟡 = Needs minor alignment
  🟢 = Fully aligned
```

## Alignment Tasks Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│ Priority │ Task                           │ Effort    │ Impact      │
├──────────┼────────────────────────────────┼───────────┼─────────────┤
│   HIGH   │ 1. Fix response field names    │  30 min   │ Frontend    │
│          │    (entity_type → entityType)  │           │ compatibility│
├──────────┼────────────────────────────────┼───────────┼─────────────┤
│   HIGH   │ 2. Add JWT verification        │  1 hour   │ Security    │
│          │    (remove X-User-Id header)   │           │             │
├──────────┼────────────────────────────────┼───────────┼─────────────┤
│  MEDIUM  │ 3. Add alias field             │  30 min   │ API parity  │
│          │    (database + responses)      │           │             │
├──────────┼────────────────────────────────┼───────────┼─────────────┤
│  MEDIUM  │ 4. Support flat location fields│  30 min   │ Request     │
│          │    (city, state, country)      │           │ compatibility│
├──────────┼────────────────────────────────┼───────────┼─────────────┤
│   LOW    │ 5. Add relationship tables     │  2 hours  │ Future      │
│          │    (users, admins, members)    │           │ features    │
└──────────┴────────────────────────────────┴───────────┴─────────────┘

Total for MVP (tasks 1-4): 2.5 - 3 hours
Total for full parity:     4.5 - 5 hours
```

## Current vs. Aligned Comparison

### GET /user/entities Response

```
CURRENT (Local Backend):          ALIGNED (Matches Azure):
────────────────────────────       ─────────────────────────────
{                                  {
  "id": "abc-123",                   "id": "abc-123",
  "name": "Electric Horizon",        "name": "Electric Horizon",
  "entity_type": "artist",     →     "entityType": "artist",     ✓
  "created_at": "2024-01-15"   →     "createdAt": "2024-01-15"   ✓
}                                  }
```

### POST /artist/add Request

```
CURRENT (Frontend sends):          OPTION 1 (Flat fields):       OPTION 2 (Hybrid):
──────────────────────────         ──────────────────────         ──────────────────────
{                                  {                              {
  "name": "Test Band",               "name": "Test Band",           "name": "Test Band",
  "location": {                →     "city": "Austin",              "city": "Austin",
    "city": "Austin",                "state": "TX",                 "state": "TX",
    "state": "TX",                   "country": "USA",              "country": "USA",
    "country": "USA",                "bio": "..."                   "bio": "...",
    "latitude": 30.27,             }                                "location": {
    "longitude": -97.74,                                              "latitude": 30.27,
    "placeId": "ChIJ..."                                              "longitude": -97.74,
  },                                                                  "placeId": "ChIJ..."
  "bio": "..."                                                      }
}                                                                 }

                                   ✓ Matches Azure spec           ✓ Rich data + compatible
```

### POST /artist/add Response

```
CURRENT (Local Backend):                    ALIGNED (Matches Azure):
───────────────────────────────────         ──────────────────────────────────────────
{                                           {
  "id": "abc-123",                            "id": "abc-123",
  "name": "Electric Horizon",                 "name": "Electric Horizon",
  "entity_type": "artist",              →     "alias": "electric-horizon",        ✓ NEW
  "location": {...},                          "entityType": "artist",             ✓
  "created_at": "2024-01-15"                  "country": "United States",         ✓ NEW
}                                             "city": "Brooklyn",                 ✓ NEW
                                              "state": "New York",                ✓ NEW
                                              "bio": "...",
                                              "administratorId": "user-123",      ✓ NEW
                                              "users": ["user-123"],              ✓ NEW
                                              "administrators": ["user-123"],     ✓ NEW
                                              "members": [],                      ✓ NEW
                                              "assets": [],                       ✓ NEW
                                              "location": {...},                  ✓ OPTIONAL
                                              "createdAt": "2024-01-15"          ✓
                                            }
```

## Authentication Flow

```
CURRENT (Insecure):                         ALIGNED (Secure):
──────────────────────────────              ─────────────────────────────────

Frontend                                    Frontend
   │                                           │
   │ 1. Extract user ID from JWT               │ 1. Just get JWT token
   │    (manually, in frontend)                │
   │                                           │
   │ 2. Send both:                             │ 2. Send only:
   │    - Authorization: Bearer <jwt>          │    - Authorization: Bearer <jwt>
   │    - X-User-Id: <extracted-id> ❌         │                              ✓
   │                                           │
   ▼                                           ▼
Backend                                     Backend
   │                                           │
   │ 3. Trust X-User-Id header ❌              │ 3. Verify JWT signature      ✓
   │    (no validation)                        │    (secure)
   │                                           │
   │ 4. Use header value for DB                │ 4. Extract user ID from JWT  ✓
   │                                           │    (from verified claims)
   │                                           │
   ▼                                           ▼
Database                                    Database
```

## Database Schema Migration

```
CURRENT:                                    ALIGNED:
────────────────────────────────           ─────────────────────────────────

entities                                   entities
├── id (uuid)                              ├── id (uuid)
├── user_id (uuid)                         ├── user_id (uuid)
├── entity_type (varchar)                  ├── entity_type (varchar)
├── name (varchar)                         ├── name (varchar)
├── location (jsonb)                       ├── alias (varchar) ✓ NEW
├── bio (text)                             ├── location (jsonb)
├── created_at (timestamp)                 ├── bio (text)
└── updated_at (timestamp)                 ├── created_at (timestamp)
                                           └── updated_at (timestamp)

                                           entity_users ✓ NEW (Optional)
                                           ├── entity_id (uuid)
                                           ├── user_id (uuid)
                                           └── role (varchar)

                                           entity_administrators ✓ NEW (Optional)
                                           ├── entity_id (uuid)
                                           └── user_id (uuid)

                                           artist_members ✓ NEW (Optional)
                                           ├── id (uuid)
                                           ├── artist_id (uuid)
                                           ├── name (varchar)
                                           └── instrument (varchar)

                                           entity_assets ✓ NEW (Optional)
                                           ├── id (uuid)
                                           ├── entity_id (uuid)
                                           └── file_id (uuid)
```

## Risk Assessment

```
┌───────────────────────────────────────────────────────────────────┐
│ RISK LEVEL: 🟢 LOW                                                │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ✅ No architectural conflicts                                    │
│  ✅ Endpoints already defined in Azure spec                       │
│  ✅ Frontend already structured for backend switching             │
│  ✅ Database can be migrated incrementally                        │
│  ✅ Changes are backward-compatible                               │
│                                                                   │
│  ⚠️  Minor breaking changes to response format                    │
│      (frontend needs to update field names)                       │
│                                                                   │
│  ⚠️  Security improvement needed                                  │
│      (JWT verification instead of header trust)                   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Decision Tree

```
                        Start Here
                            │
                            ▼
            ┌───────────────────────────────┐
            │ Do you want to use the        │
            │ local backend as a reference  │
            │ for Azure implementation?     │
            └───────────────┬───────────────┘
                            │
              ┌─────────────┴─────────────┐
              │                           │
             YES                         NO
              │                           │
              ▼                           ▼
    ┌─────────────────────┐     ┌──────────────────────┐
    │ Align local backend │     │ Implement directly   │
    │ (3-4 hours)         │     │ in Azure Functions   │
    │                     │     │ (8-12 hours)         │
    └─────────┬───────────┘     └──────────┬───────────┘
              │                            │
              ▼                            ▼
    ┌─────────────────────┐     ┌──────────────────────┐
    │ Test with frontend  │     │ Frontend switches to │
    │ locally             │     │ Azure endpoint       │
    └─────────┬───────────┘     │ (via env variable)   │
              │                 └──────────┬───────────┘
              ▼                            │
    ┌─────────────────────┐               │
    │ Backend team uses   │               │
    │ as reference for    │               │
    │ Azure implementation│               │
    └─────────┬───────────┘               │
              │                            │
              └────────────┬───────────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │ Production:      │
                 │ Use Azure backend│
                 │                  │
                 │ Optional:        │
                 │ Keep local for   │
                 │ development      │
                 └──────────────────┘
```

## Next Steps Flowchart

```
                    You are here
                         │
                         ▼
              ┌──────────────────────┐
              │ 1. Review documents: │
              │  • BACKEND_ALIGNMENT │
              │  • ENDPOINT_MAPPING  │
              │  • QUICK_FIX_CHECKLIST│
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ 2. Answer questions: │
              │  • Auth details      │
              │  • Data schema prefs │
              │  • Business rules    │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ 3. Choose approach:  │
              │  • Quick alignment   │
              │  • Full parity       │
              │  • Azure-first       │
              └──────────┬───────────┘
                         │
              ┌──────────┴──────────┐
              │                     │
         Alignment               Azure-first
              │                     │
              ▼                     ▼
    ┌──────────────────┐  ┌──────────────────┐
    │ I implement      │  │ You implement    │
    │ local changes    │  │ Azure Functions  │
    │ (3-4 hours)      │  │ (8-12 hours)     │
    └────────┬─────────┘  └─────────┬────────┘
             │                      │
             └──────────┬───────────┘
                        │
                        ▼
              ┌──────────────────────┐
              │ 4. Integration test  │
              │    with frontend     │
              └──────────┬───────────┘
                         │
                         ▼
              ┌──────────────────────┐
              │ 5. Deploy to         │
              │    production        │
              └──────────────────────┘
```

## Files Reference Guide

```
📋 DOCUMENTATION FILES (Created for you)
├── 📄 BACKEND_DEVELOPER_SUMMARY.md ──────→ Read this first (executive summary)
├── 📄 BACKEND_ALIGNMENT_ANALYSIS.md ─────→ Detailed technical analysis
├── 📄 BACKEND_ENDPOINT_MAPPING.md ───────→ Side-by-side API comparison
└── 📄 QUICK_FIX_CHECKLIST.md ────────────→ Step-by-step implementation

📁 RELEVANT CODE FILES
├── 🔧 backend/server.js ─────────────────→ Local backend implementation
├── 🔧 backend/migrate.js ────────────────→ Database schema
├── 🔧 src/app/api/*/route.ts ────────────→ Frontend API routes
└── 📋 openapi/scenegen-api.openapi+json.json → Azure backend spec (source of truth)
```

## Summary Checklist

```
☑ Questions Answered
├─ [ ] Are the new endpoints in the Azure backend? ✅ YES
├─ [ ] Will they conflict with existing APIs?       ✅ NO
├─ [ ] How much work to align?                      ⏱️ 3-4 hours
├─ [ ] Is the architecture compatible?              ✅ YES
└─ [ ] What are the risks?                          🟢 LOW

☑ Action Items
├─ [ ] Review documentation files
├─ [ ] Answer questions in BACKEND_DEVELOPER_SUMMARY.md
├─ [ ] Choose alignment approach
├─ [ ] Implement changes (me or you)
└─ [ ] Test and deploy

☑ Success Criteria
├─ [ ] Responses use camelCase field names
├─ [ ] JWT verification implemented
├─ [ ] Alias field in database and responses
├─ [ ] Location data in both flat and nested formats
├─ [ ] Frontend works with both local and Azure backends
└─ [ ] Zero TypeScript errors
```

---

**Bottom Line**: The local backend aligns well with your Azure API spec. No major redesign needed—just 3-4 hours of alignment work to match field naming, add JWT verification, and enhance responses. You can then choose to either keep it as a dev reference or migrate everything to Azure Functions.

