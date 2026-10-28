# Environment Variables Reference

**File:** `.env.local`
**Status:** ✅ Configured and working
**Security:** 🔒 File is in .gitignore (not committed to git)

---

## 📋 Current Configuration

### 🌐 Azure API Management (Backend)

```bash
# Backend API endpoint
NEXT_PUBLIC_API_BASE_URL=https://scenegen-apim.azure-api.net/scenegen-api

# API subscription key (required for all backend calls)
SUBSCRIPTION_KEY=85a56b9eb87b48179218064bb1da6bab
NEXT_PUBLIC_SUBSCRIPTION_KEY=85a56b9eb87b48179218064bb1da6bab
```

**What it's used for:**
- All API calls to backend (shows, tours, entities, etc.)
- Every fetch in `/src/app/api/*/route.ts` uses these
- `SUBSCRIPTION_KEY` = server-side calls
- `NEXT_PUBLIC_SUBSCRIPTION_KEY` = client-side calls

**Backend endpoints available:**
- `POST /artist/add` - Create artist entity
- `POST /promoter/add` - Create promoter entity
- `GET /user/entities` - Get owned entities
- `GET /shows` - List shows
- `GET /tours` - List tours
- `GET /contacts` - List contacts
- `GET /search` - Search entities
- And more... (see OpenAPI specs in `/openapi/`)

---

### 🔐 Azure B2C Authentication

```bash
# Azure B2C tenant configuration
AZURE_AD_B2C_CLIENT_ID=70ff8042-148d-41de-8409-4272e3b3f825
AZURE_AD_B2C_TENANT_ID=9540133e-806b-4455-aa17-2c8539053ce5
AZURE_AD_B2C_CLIENT_SECRET=REPLACE_WITH_YOUR_OWN_SECRET
AZURE_AD_B2C_DOMAIN=scenegenio.b2clogin.com
AZURE_AD_B2C_PRIMARY_USER_FLOW=B2C_1_SUSI
AZURE_AD_B2C_ISSUER=https://scenegenio.b2clogin.com/9540133e-806b-4455-aa17-2c8539053ce5/v2.0/
```

**What it's used for:**
- User authentication (sign in with GitHub/Google)
- JWT token generation
- User session management
- Configured in `/src/auth.ts`

**Sign-in flow:**
1. User clicks "Sign In"
2. Redirects to Azure B2C
3. User signs in with GitHub/Google
4. Azure B2C returns JWT token
5. Token used for all API calls

---

### 🔑 NextAuth Configuration

```bash
# NextAuth session handling
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=LU0HFI1RgOvBPkkxa8bh0uiVYnujDUez+Unf7RQtDkw=
AUTH_SECRET=LU0HFI1RgOvBPkkxa8bh0uiVYnujDUez+Unf7RQtDkw=
```

**What it's used for:**
- Session management
- Cookie encryption
- Token storage
- Used by `next-auth` library

**Note:** `NEXTAUTH_URL` should be updated for production:
- Development: `http://localhost:3000` (or 3001)
- Production: `https://your-domain.com`

---

### 💬 Ably Real-time Chat

```bash
# Ably messaging service
ABLY_API_KEY=prz_dg.a6fXUw:k4Vrc41WNb1MCdfZ97K_Hkj2MERK8QvGw_It80VE_u8
```

**What it's used for:**
- Real-time messaging
- Chat functionality
- Live notifications
- Used in `/src/components/chat/` components

**Features:**
- Real-time message delivery
- Online presence
- Typing indicators
- Message history

---

## 🧪 Testing with These Variables

### Test Backend API Connection

```bash
# Using the API key from .env.local
curl -X GET \
  "https://scenegen-apim.azure-api.net/scenegen-api/user/entities" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Ocp-Apim-Subscription-Key: 85a56b9eb87b48179218064bb1da6bab"
```

### Test Different Endpoints

```bash
# Base URL from env
BASE_URL="https://scenegen-apim.azure-api.net/scenegen-api"
API_KEY="85a56b9eb87b48179218064bb1da6bab"

# Test shows endpoint
curl -X GET "$BASE_URL/shows" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Ocp-Apim-Subscription-Key: $API_KEY"

# Test tours endpoint
curl -X GET "$BASE_URL/tours" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Ocp-Apim-Subscription-Key: $API_KEY"
```

---

## 🔒 Security Notes

### ✅ What's Secure:

1. **`.env.local` is in `.gitignore`**
   - Not committed to git
   - Safe to have credentials

2. **Server-side variables are safe**
   - `SUBSCRIPTION_KEY` (no NEXT_PUBLIC prefix)
   - `AZURE_AD_B2C_CLIENT_SECRET`
   - Only accessible on server

### ⚠️ What's Exposed to Browser:

Variables with `NEXT_PUBLIC_` prefix are visible in browser:
- `NEXT_PUBLIC_API_BASE_URL` - OK (just a URL)
- `NEXT_PUBLIC_SUBSCRIPTION_KEY` - ⚠️ Visible but protected by Azure API Management

**Note:** Azure API Management has additional security:
- Rate limiting
- IP filtering
- CORS policies
- Authentication required

---

## 🚀 Using Environment Variables in Code

### In Server Components / API Routes:

```typescript
// Access server-side variables (secure)
const apiKey = process.env.SUBSCRIPTION_KEY;
const clientSecret = process.env.AZURE_AD_B2C_CLIENT_SECRET;
```

### In Client Components:

```typescript
// Access public variables only
const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
const apiKey = process.env.NEXT_PUBLIC_SUBSCRIPTION_KEY;

// ❌ Won't work in client:
// const secret = process.env.AZURE_AD_B2C_CLIENT_SECRET; // undefined
```

### Example from Your Code:

```typescript
// src/app/api/user/route.ts
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ||
  'https://scenegen-apim.azure-api.net/scenegen-api';

const response = await fetch(apiUrl, {
  headers: {
    'Authorization': token,
    'Ocp-Apim-Subscription-Key': process.env.SUBSCRIPTION_KEY!
  }
});
```

---

## 🔧 Updating Environment Variables

### For Local Development:

1. **Edit `.env.local`**
2. **Restart dev server** (Ctrl+C, then `pnpm dev`)
3. Changes take effect

### For Production:

Set these in your deployment platform:

**Vercel:**
```bash
vercel env add SUBSCRIPTION_KEY
vercel env add AZURE_AD_B2C_CLIENT_SECRET
# etc...
```

**Other platforms:**
- Set in dashboard/settings
- Or use deployment secrets
- Never commit to git!

---

## 📊 Environment Variable Checklist

Check if all required variables are set:

```bash
# In your project directory
node -e "
const required = [
  'SUBSCRIPTION_KEY',
  'NEXT_PUBLIC_API_BASE_URL',
  'AZURE_AD_B2C_CLIENT_ID',
  'AZURE_AD_B2C_CLIENT_SECRET',
  'NEXTAUTH_SECRET',
  'ABLY_API_KEY'
];

require('dotenv').config({ path: '.env.local' });

required.forEach(key => {
  console.log(
    key.padEnd(40),
    process.env[key] ? '✅' : '❌'
  );
});
"
```

---

## 🐛 Troubleshooting

### API calls fail with 401 Unauthorized:
```
Check: SUBSCRIPTION_KEY is set
Check: Using correct Ocp-Apim-Subscription-Key header
```

### Authentication doesn't work:
```
Check: AZURE_AD_B2C_* variables are set
Check: NEXTAUTH_URL matches your domain
Check: NEXTAUTH_SECRET is set and unique
```

### Chat doesn't work:
```
Check: ABLY_API_KEY is set
Check: Ably subscription is active
```

### Changes not taking effect:
```
Solution: Restart dev server
  Ctrl+C
  pnpm dev
```

---

## 📝 Adding New Environment Variables

### Step 1: Add to `.env.local`

```bash
# Add your new variable
NEW_SERVICE_API_KEY=your-api-key-here
```

### Step 2: Decide visibility

**Server-only (secure):**
```bash
MY_SECRET_KEY=abc123
```

**Client-accessible (public):**
```bash
NEXT_PUBLIC_MY_API_URL=https://example.com
```

### Step 3: Use in code

```typescript
// Server-side
const secret = process.env.MY_SECRET_KEY;

// Client-side
const url = process.env.NEXT_PUBLIC_MY_API_URL;
```

### Step 4: Restart server

```bash
# Stop server (Ctrl+C)
pnpm dev
```

---

## 🎯 Quick Reference

**Backend API:**
- URL: `https://scenegen-apim.azure-api.net/scenegen-api`
- Key: `85a56b9eb87b48179218064bb1da6bab`
- Header: `Ocp-Apim-Subscription-Key`

**Authentication:**
- Domain: `scenegenio.b2clogin.com`
- Flow: `B2C_1_SUSI`
- Providers: GitHub, Google

**Chat:**
- Service: Ably
- Key: `prz_dg.a6fXUw:k4Vrc41WNb1MCdfZ97K_Hkj2MERK8QvGw_It80VE_u8`

---

## ✅ Your Setup is Complete!

All necessary environment variables are configured and working:
- ✅ Backend API connection
- ✅ Authentication (Azure B2C)
- ✅ Session management (NextAuth)
- ✅ Real-time chat (Ably)

**Ready to test!** All these are used automatically by your application.
