# 🎸 SceneGen UI V2

A modern web application for connecting artists, promoters, and venues in the music industry.

## 🚀 Quick Start

### Prerequisites

- **Node.js** v18 or higher
- **pnpm** v8 or higher

### Installation

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Set up environment variables:**
   
   The `.env.local` file should already be configured. If not, copy from `.env.example`:
   ```bash
   cp .env.example .env.local
   ```

3. **Start the development server:**
   ```bash
   pnpm dev
   ```

4. **Open your browser:**
   
   Navigate to [http://localhost:3000](http://localhost:3000)

### Quick Setup Script

Alternatively, run the setup script:
```bash
./start.sh
```

## 📖 Detailed Setup

For detailed setup instructions, see [SETUP.md](./SETUP.md)

## 🏗️ Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Components:** Radix UI, NextUI
- **Authentication:** NextAuth v5 (Azure B2C)
- **Real-time Chat:** Ably
- **State Management:** Zustand
- **API Client:** OpenAPI TypeScript Generator
- **Icons:** Lucide React

## 📁 Project Structure

```
SceneGenUIV2/
├── src/
│   ├── app/                # Next.js App Router pages
│   │   ├── dashboard/      # Dashboard
│   │   ├── conversations/  # Chat/messaging
│   │   ├── contacts/       # Contact management
│   │   ├── profile/        # User profiles
│   │   ├── shows/          # Shows/events
│   │   └── api/            # API routes
│   ├── components/         # React components
│   ├── store/              # Zustand stores
│   ├── auth.ts             # Authentication config
│   └── middleware.ts       # Auth middleware
├── openapi/                # API specifications
└── public/                 # Static assets
```

## 🎯 Features

- ✅ **Authentication** - Azure B2C with token refresh
- ✅ **Real-time Chat** - Ably-powered messaging
- ✅ **Contact Management** - Search, add, manage contacts
- ✅ **Profile Management** - Artist/promoter profiles
- ✅ **Show Calendar** - Track and manage shows
- ✅ **Dark Mode** - Theme switching support
- ✅ **Responsive Design** - Mobile-friendly UI

## 🛠️ Available Scripts

```bash
# Development
pnpm dev          # Start dev server on localhost:3000

# Production
pnpm build        # Build for production
pnpm start        # Start production server

# Code Quality
pnpm lint         # Run ESLint

# API Client Generation
pnpm openapi-ts   # Generate TypeScript clients from OpenAPI specs
```

## 🔧 Configuration

### Environment Variables

Required variables in `.env.local`:

```env
# API Configuration
SUBSCRIPTION_KEY=your_api_key
NEXT_PUBLIC_API_BASE_URL=your_api_url

# Azure B2C
AZURE_AD_B2C_CLIENT_ID=your_client_id
AZURE_AD_B2C_TENANT_ID=your_tenant_id
AZURE_AD_B2C_CLIENT_SECRET=your_client_secret
AZURE_AD_B2C_DOMAIN=your_domain
AZURE_AD_B2C_PRIMARY_USER_FLOW=your_flow

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_secret

# Ably
ABLY_API_KEY=your_ably_key
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9
```

### Clear Cache
```bash
rm -rf .next node_modules
pnpm install
```

### Authentication Issues
1. Verify `.env.local` exists with correct values
2. Clear browser cookies for localhost
3. Check browser console for errors

## 📚 Documentation

- [Setup Guide](./SETUP.md) - Detailed setup instructions
- [Next.js Docs](https://nextjs.org/docs)
- [NextAuth Docs](https://authjs.dev/)
- [Ably Docs](https://ably.com/docs)

## 🚀 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Remember to set all environment variables in your Vercel project settings.

## 📝 License

Copyright © 2026 SceneGen

---

**Built with ❤️ for the music community**