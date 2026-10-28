# Show Sharing Feature - Complete Implementation

## Overview
You can now share individual show tiles with external email addresses, allowing recipients to view and edit show information without needing to log in to SceneGen.

## How It Works

### 1. **Share a Show**
- On the tour details page, click the **share icon** (purple icon) on any show tile
- Enter the recipient's email address
- Choose permissions:
  - ✅ **Can Edit** - Recipient can update contact info and notes
  - 👁️ **View Only** - Recipient can only view the show
- Set expiration (7, 14, 30, 60, or 90 days)
- Click "Create Share Link"

### 2. **Share Link Generated**
- A unique, secure URL is created (e.g., `http://localhost:3000/shared/show/abc123...`)
- Copy the link and send it to the recipient via email

### 3. **Recipient Experience**
- Recipient opens the link in any browser (no login required)
- They see a clean page with show details:
  - Venue name and address
  - Show date and time
  - Contact information
- If they have **edit permissions**, they can click "Edit Details" to update:
  - Contact name
  - Contact email
  - Contact phone
  - Notes

### 4. **Security Features**
- ✅ Unique token-based URLs
- ✅ Time-limited access (expires after set period)
- ✅ Revocable links (can be revoked by owner)
- ✅ No login required for recipients
- ✅ Permission-based editing

## Database Schema

```sql
show_shares
├── id (UUID)
├── show_id (UUID) → references shows(id)
├── created_by_entity_id (UUID) → references entities(id)
├── recipient_email (VARCHAR)
├── token (VARCHAR) - unique secure token
├── can_edit (BOOLEAN) - whether recipient can edit
├── expires_at (TIMESTAMP) - when link expires
├── revoked_at (TIMESTAMP) - if manually revoked
├── last_accessed_at (TIMESTAMP) - tracking
└── created_at, updated_at (TIMESTAMP)
```

## API Endpoints

### Authenticated Endpoints (requires login)
- `POST /api/shows/:id/share` - Create a share link
- `GET /api/shows/:id/shares` - List all shares for a show
- `DELETE /api/show-shares/:shareId` - Revoke a share link

### Public Endpoints (no auth required)
- `GET /api/shared/show/:token` - View show via share link
- `PATCH /api/shared/show/:token` - Update show via share link (if can_edit=true)

## Files Created/Modified

### New Files
1. `/backend/create_show_shares_table.sql` - Database migration
2. `/src/components/shows/ShareShowModal.tsx` - Share modal UI
3. `/src/app/api/shows/[id]/share/route.ts` - Share creation API
4. `/src/app/api/shared/show/[token]/route.ts` - Public share API
5. `/src/app/shared/show/[token]/page.tsx` - Public share page

### Modified Files
1. `/backend/server.js` - Added show sharing endpoints
2. `/src/app/tours/[id]/page.tsx` - Added share button and modal

## Usage Example

1. **Tour Manager** wants venue contact to fill in their details
2. Click share icon on show tile
3. Enter `contact@thegreenlantern.com`
4. Enable "Can Edit", set 30 days expiration
5. Copy link: `http://localhost:3000/shared/show/a1b2c3d4...`
6. Send link to venue contact
7. Venue contact opens link, fills in their name, email, phone
8. Changes automatically sync to SceneGen database
9. Tour manager sees updated contact info instantly

## Benefits

✅ **No Account Required** - External contacts don't need to sign up
✅ **Secure** - Time-limited, revocable links
✅ **Flexible** - View-only or edit permissions
✅ **Simple** - Just share a link, recipient clicks and edits
✅ **Real-time** - Changes appear immediately in your tour view

## Next Steps

You can enhance this feature with:
- Email notifications when link is created
- Email notifications when recipient makes changes
- Analytics (track when links are accessed)
- Bulk sharing (share multiple shows at once)
- Custom branding for shared pages
