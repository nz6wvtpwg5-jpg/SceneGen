# SceneGen UI V2 - Local Development Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher recommended)
- **pnpm** (v8 or higher) - This project uses pnpm for package management

To install pnpm if you don't have it:
```bash
npm install -g pnpm
```

---

## Step 1: Clone & Navigate

You already have the project, so just navigate to it:
```bash
cd /Users/jon/Desktop/scenegen/SceneGenUIV2
```

---

## Step 2: Install Dependencies

Install all required packages:
```bash
pnpm install
```

This will install all dependencies listed in `package.json`, including:
- Next.js 15
- React 18
- NextAuth (Azure B2C authentication)
- Ably (real-time chat)
- Tailwind CSS + Radix UI components
- And more...

---

## Step 3: Configure Environment Variables

You already have `env.local` with credentials. You need to rename it to `.env.local`:

```bash
mv env.local .env.local
```

**Important**: The file should be named `.env.local` (with a dot prefix) for Next.js to recognize it.

### Required Environment Variables

Your `.env.local` should contain (which it already does):

```env
# Azure API Management
SUBSCRIPTION_KEY=85a56b9eb87b48179218064bb1da6bab
NEXT_PUBLIC_API_BASE_URL=https://scenegen-apim.azure-api.net/scenegen-api
NEXT_PUBLIC_SUBSCRIPTION_KEY=85a56b9eb87b48179218064bb1da6bab

# Azure B2C Authentication
AZURE_AD_B2C_CLIENT_ID=70ff8042-148d-41de-8409-4272e3b3f825
AZURE_AD_B2C_TENANT_ID=9540133e-806b-4455-aa17-2c8539053ce5
AZURE_AD_B2C_CLIENT_SECRET=REPLACE_WITH_YOUR_OWN_SECRET
AZURE_AD_B2C_DOMAIN=scenegenio.b2clogin.com
AZURE_AD_B2C_PRIMARY_USER_FLOW=B2C_1_SUSI
AZURE_AD_B2C_ISSUER=https://scenegenio.b2clogin.com/9540133e-806b-4455-aa17-2c8539053ce5/v2.0/

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=LU0HFI1RgOvBPkkxa8bh0uiVYnujDUez+Unf7RQtDkw=
AUTH_SECRET=LU0HFI1RgOvBPkkxa8bh0uiVYnujDUez+Unf7RQtDkw=

# Ably (Real-time Chat)
ABLY_API_KEY=prz_dg.a6fXUw:k4Vrc41WNb1MCdfZ97K_Hkj2MERK8QvGw_It80VE_u8
```

**Note**: I'll help you update the file with the missing variables below.

---

## Step 4: Start the Development Server

Once dependencies are installed and environment variables are set:

```bash
pnpm dev
```

The application will start on **http://localhost:3000**

---

## Step 5: Access the Application

1. Open your browser and navigate to: **http://localhost:3000**
2. You'll be redirected to the Azure B2C login page
3. Sign in with your credentials or create a new account
4. After authentication, you'll be redirected back to the app

---

## Project Structure Overview

```
SceneGenUIV2/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── dashboard/          # Dashboard page
│   │   ├── conversations/      # Chat/messaging
│   │   ├── contacts/           # Contacts management
│   │   ├── profile/            # User profile
│   │   ├── shows/              # Shows/events
│   │   └── api/                # API routes (backend proxies)
│   ├── components/             # React components
│   │   ├── chat/               # Chat components
│   │   ├── contacts/           # Contact components
│   │   ├── profile/            # Profile components
│   │   ├── sidenav/            # Navigation
│   │   └── ui/                 # UI primitives
│   ├── store/                  # Zustand state management
│   ├── auth.ts                 # NextAuth configuration
│   └── middleware.ts           # Auth middleware
├── public/                     # Static assets
├── openapi/                    # OpenAPI specs
└── package.json
```

---

## Available Scripts

```bash
# Start development server (with hot reload)
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run linter
pnpm lint

# Generate OpenAPI TypeScript clients
pnpm openapi-ts
```

---

## Features You Can Test

### 1. **Authentication**
- Sign in/sign out functionality
- Azure B2C integration
- Token refresh mechanism

### 2. **Dashboard**
- View personalized welcome message
- Test header image upload

### 3. **Conversations (Chat)**
- Real-time messaging with Ably
- Conversation list
- Message history
- Send/receive messages

### 4. **Contacts**
- View contacts list
- Add new contacts
- Search contacts
- Connection requests
- Map view of contacts

### 5. **Profile**
- View artist/promoter profiles
- Edit profile information
- Upload images
- Manage band members
- View genres and bio

### 6. **Shows**
- Calendar view of shows
- Shows table
- Filter shows
- Add new shows

---

## Troubleshooting

### Issue: Port 3000 Already in Use
```bash
# Kill the process using port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
pnpm dev -- -p 3001
```

### Issue: Module Not Found
```bash
# Clear cache and reinstall
rm -rf node_modules .next
pnpm install
```

### Issue: Authentication Not Working
1. Check that `.env.local` exists (not `env.local`)
2. Verify all Azure B2C variables are set correctly
3. Clear browser cookies for localhost
4. Check browser console for errors

### Issue: API Calls Failing
1. Verify `SUBSCRIPTION_KEY` is correct
2. Check backend API is accessible
3. Look at Network tab in browser DevTools
4. Check API route logs in terminal

### Issue: Real-time Chat Not Working
1. Verify `ABLY_API_KEY` is set
2. Check Ably dashboard for connection status
3. Ensure you're signed in (chat requires authentication)

---

## Development Tips

### 1. **Hot Reload**
The dev server has hot reload enabled. Changes to files will automatically refresh the browser.

### 2. **Type Safety**
The project uses TypeScript. Check for type errors:
```bash
pnpm tsc --noEmit
```

### 3. **Debugging**
- Check terminal for server-side logs
- Check browser console for client-side logs
- Use React DevTools browser extension
- Use Network tab to inspect API calls

### 4. **Dark Mode**
The app supports dark/light themes. Toggle using the moon/sun icon in the bottom-right corner.

---

## Next Steps

After getting the app running:

1. **Explore the UI**: Navigate through different pages
2. **Test Authentication**: Sign in/out multiple times
3. **Try Chat**: Create conversations and send messages
4. **Add Contacts**: Test the contact management features
5. **View Profiles**: Switch between different entities (artists/promoters)

---

## Need Help?

If you encounter issues:
1. Check the terminal output for errors
2. Check browser console (F12)
3. Review the `.env.local` file
4. Ensure all dependencies are installed
5. Try clearing cache and rebuilding

---

## Production Deployment

When ready to deploy:

```bash
# Build the production version
pnpm build

# Test production build locally
pnpm start

# Deploy to Vercel (recommended for Next.js)
# Install Vercel CLI: npm i -g vercel
vercel
```

Remember to set all environment variables in your production environment (Vercel, AWS, etc.).
