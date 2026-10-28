# Backend Developer Concerns - NEW Endpoint Implementation

## The Real Concern

**"You're creating NEW endpoints locally that don't exist in Azure yet. When I implement them in Azure, they might not match what you built, causing rework."**

This is a **completely valid concern**. Let me address it directly.

## The Current Situation

### Endpoints We Created Locally (That Don't Exist in Azure Yet):

1. `GET /api/user/entities` - Fetch user's entities
2. `POST /api/artist/add` - Create artist entity
3. `POST /api/promoter/add` - Create promoter entity

**Your concern:** When you implement these in Azure, the structure might be different, breaking the frontend.

## Solution: Two Approaches

### Option 1: **I Design, You Implement** (Recommended)

**What this means:**
- I spec out the NEW endpoints we need
- You review the spec and suggest changes
- We agree on the final API contract
- You implement in Azure to match the agreed spec
- We update local backend to match (if needed)

**Benefits:**
- You control the Azure implementation
- We align before any code is written
- No rework needed
- Clear contract for both teams

**Process:**
1. I create an API specification document (OpenAPI format)
2. You review and modify as needed
3. We agree on the final contract
4. You implement in Azure
5. I update local backend to match (if different)
6. Frontend works with both

### Option 2: **You Design, I Follow** (Safest)

**What this means:**
- You design the endpoints for Azure first
- Share the API contract with me
- I implement local backend to match exactly
- Frontend builds against your spec

**Benefits:**
- Zero risk of mismatch
- You have full control
- Local backend is just a mock of your design
- Guaranteed compatibility

**Process:**
1. You create API specifications for new endpoints
2. I implement local backend to match exactly
3. Frontend builds against the spec
4. When Azure endpoints are ready, we switch over
5. No frontend changes needed

## Current Local Implementation (For Review)

Here's what we built. **This can be completely changed to match your design:**

### 1. GET /api/user/entities

**Current Local Implementation:**
```http
GET /api/user/entities
Headers:
  Authorization: Bearer {jwt_token}
  X-User-Id: {user_id}

Response: 200 OK
[
  {
    "id": "uuid",
    "administrator_id": "user_id_from_jwt",
    "entity_type": "artist" | "promoter",
    "name": "string",
    "bio": "string",
    "city": "string",
    "state": "string",
    "country": "string",
    "latitude": "decimal",
    "longitude": "decimal",
    "created_at": "timestamp",
    "updated_at": "timestamp"
  }
]
```

**Questions for You:**
- Is this the structure you want?
- Should it return an object instead of an array?
- Different field names?
- Additional fields needed?
- Should user_id be extracted from JWT on backend instead of passed as header?

### 2. POST /api/artist/add

**Current Local Implementation:**
```http
POST /api/artist/add
Headers:
  Authorization: Bearer {jwt_token}
  X-User-Id: {user_id}

Request Body:
{
  "name": "string",
  "bio": "string",
  "city": "string",
  "state": "string",
  "country": "string",
  "latitude": number,
  "longitude": number
}

Response: 201 Created
{
  "id": "uuid",
  "administrator_id": "user_id",
  "entity_type": "artist",
  "name": "string",
  "bio": "string",
  "city": "string",
  "state": "string",
  "country": "string",
  "latitude": "decimal",
  "longitude": "decimal",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}

Response: 409 Conflict (if user already has entity)
{
  "error": {
    "code": "CONFLICT",
    "message": "You already own an entity"
  }
}
```

**Questions for You:**
- Is this the structure you want?
- Should we enforce one entity per user (current behavior)?
- Different error format?
- Additional validation needed?
- Should we return different fields?

### 3. POST /api/promoter/add

Same as `POST /api/artist/add` but with `entity_type: "promoter"`

## Proposed API Contract Review Process

### Step 1: Create Specification Document

I'll create a formal API spec for the endpoints we need:

```yaml
# openapi/new-endpoints.yaml
openapi: 3.0.0
info:
  title: SceneGen New Endpoints Specification
  version: 1.0.0

paths:
  /user/entities:
    get:
      summary: Get user's entities
      parameters:
        - name: Authorization
          in: header
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Success
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Entity'

  /artist/add:
    post:
      summary: Create artist entity
      # ... full specification

components:
  schemas:
    Entity:
      type: object
      properties:
        id:
          type: string
          format: uuid
        administrator_id:
          type: string
        # ... etc
```

### Step 2: You Review & Modify

You review the spec and tell me:
- ✅ Approved as-is
- 🔧 Changes needed (specific modifications)
- ❌ Different approach needed (your design)

### Step 3: Agree on Final Contract

We document the agreed API contract that both teams will follow.

### Step 4: Implementation

- **You implement** in Azure backend
- **I align** local backend to match
- **Frontend** builds against the contract

### Step 5: Testing

We test frontend against:
1. Local backend (during development)
2. Azure backend (before production)

If they behave identically ✅, we're good to deploy.

## What I Need from You

To avoid creating endpoints that are difficult to implement in Azure:

### 1. Database Schema Constraints

**Questions:**
- What's your entity table structure in Azure?
- Do you have different constraints we should follow?
- Are there foreign key relationships we're missing?
- Should entity IDs be GUIDs, integers, or something else?

### 2. Authentication Pattern

**Questions:**
- How do you want user ID extracted? (From JWT claim, or passed as parameter?)
- Which JWT claim should we use? (`oid`, `sub`, custom claim?)
- Should backend validate the JWT or trust the frontend API route?

### 3. Error Handling

**Questions:**
- What error format do you use in other Azure endpoints?
- Should we follow Azure API Management error format?
- What HTTP status codes for what scenarios?

### 4. Field Naming Conventions

**Questions:**
- Do you use `camelCase` or `snake_case`?
- Do you use `id` or `entityId`?
- Do you use `created_at` or `createdAt` or `createdDate`?

### 5. Validation Rules

**Questions:**
- What fields are required vs optional?
- Any field length limits?
- Any business rules (e.g., one entity per user)?
- Any field format requirements (email, phone, etc.)?

## Immediate Action Items

### For Me:

1. **Create formal API specification** for the 3 new endpoints
2. **Document current local implementation** in detail
3. **List all assumptions** we made
4. **Prepare for changes** based on your feedback

### For You:

1. **Review current implementation** (see above)
2. **Share Azure database schema** (so we can align)
3. **Share existing API patterns** (so we can match your style)
4. **Provide feedback** on endpoint design

### Together:

1. **30-minute sync call** to review API contract
2. **Document agreed specification**
3. **Create alignment checklist**
4. **Set up testing protocol**

## Example: How This Could Go Wrong (and How to Prevent It)

### Bad Scenario (What We Want to Avoid):

```
1. I build: POST /api/artist/add with X-User-Id header
2. You build: POST /api/artist/add that extracts user from JWT
3. Frontend breaks when switching to Azure ❌
4. Rework needed
```

### Good Scenario (What We Want):

```
1. I propose: POST /api/artist/add with X-User-Id header
2. You say: "No, extract from JWT instead, use 'oid' claim"
3. I update local backend to match
4. You implement in Azure following the same pattern
5. Frontend works with both ✅
6. No rework needed
```

## The Flexible Approach

Here's what makes this work:

**The local backend is just TypeScript/Node.js code. I can change it in 5 minutes.**

If you say:
- "Change field names" → 5 minutes
- "Different error format" → 5 minutes
- "Extract user from JWT instead" → 10 minutes
- "Completely different structure" → 30 minutes

**Your Azure implementation is the source of truth. I'll match it.**

## Proposed API Contract Document

I'll create a formal document with:

```markdown
# SceneGen API Contract - New Endpoints

## Agreed Specification
[Final agreed design]

## Backend Implementation Owner
[Your name/team]

## Frontend Dependencies
[What frontend needs from these endpoints]

## Testing Criteria
[How we verify compatibility]

## Change Process
[How we handle changes to the contract]
```

## Bottom Line

**You're right to be concerned.** Here's how we prevent problems:

1. ✅ **You review what I built** (this document)
2. ✅ **You tell me what to change** (I'll update immediately)
3. ✅ **We agree on the final API contract** (documented)
4. ✅ **You implement in Azure** (following the contract)
5. ✅ **I verify local backend matches** (testing against both)
6. ✅ **Frontend works with both** (no rework needed)

## Next Steps

**Immediate (This Week):**
1. ☐ You review this document
2. ☐ I send you detailed API specs for review
3. ☐ We schedule 30-min call to align
4. ☐ We agree on final endpoint designs

**Short-term (Next Week):**
1. ☐ You implement in Azure (your design wins)
2. ☐ I align local backend to match exactly
3. ☐ We test frontend against both
4. ☐ Confirm identical behavior

**Long-term (Ongoing):**
1. ☐ Set up contract testing
2. ☐ Document all new endpoints together
3. ☐ Regular syncs to prevent drift

## Questions?

- What's the best way to share API specs with you? (Swagger/OpenAPI, Word doc, Postman collection?)
- Do you have existing API documentation I should follow?
- What's your preferred timeline for reviewing the proposed endpoints?
- Would you prefer to design these yourself and I just implement locally?

---

**tl;dr**: You're absolutely right to be concerned. Let's align on the API contract BEFORE you implement in Azure, so there's no rework. I can change the local implementation to match whatever you build. Your Azure implementation is the source of truth.
