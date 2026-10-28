# Profile Viewing & Document Sharing

## ✅ How Other Signed-In Users Can View Your Profile & Download Documents

### Overview
Any **authenticated user** (promoter, artist, etc.) can view another user's profile and download their shared documents by visiting their profile page.

---

## 📍 Profile Routes

### 1. **Your Own Profile** (Edit & Upload)
**Route:** `/profile`
- Shows YOUR active profile (from profile store)
- YOU can upload documents here
- Editable view with upload functionality

### 2. **View Other User's Profile** (Authenticated)
**Route:** `/profile/[entityId]`
- Any signed-in user can visit this URL
- Shows profile details + downloadable documents
- Requires authentication but allows viewing other profiles

**Example:**
```
http://localhost:3000/profile/abc-123-def-456
```

### 3. **Public Artist Profile** (No Auth Required)
**Route:** `/artist/[entityId]`
- Public view without authentication
- Same layout but may have restricted features
- Already exists in your codebase

---

## 🔄 User Flow

### As a Profile Owner (You):
1. Go to `/profile` (your own profile)
2. Click on "Press Kit", "Stage Plot", or "Input List" boxes
3. Upload your documents
4. Documents are saved to Azure backend
5. Share your profile URL with others: `/profile/YOUR_ENTITY_ID`

### As a Visitor (Promoter viewing your profile):
1. Sign in to SceneGen
2. Navigate to `/profile/YOUR_ENTITY_ID`
3. View your profile information
4. See "Downloads" section with three document boxes
5. If documents are uploaded, they show as **download links** with a download icon
6. Click any document box to download the file
7. Files open in new tab or download directly

---

## 📥 Download Experience for Visitors

### When Documents Are Available:
Each box shows:
- 📥 Download icon
- Document name (Press Kit, Stage Plot, Input List)
- "Click to download" text
- Hover effect (border changes color)
- Clicking opens/downloads the document

### When Documents Are NOT Available:
Each box shows:
- Gray placeholder
- Document name + "Not Available"
- No hover effect
- Not clickable

---

## 🔐 Authentication Requirements

| Action | Authentication Required | Who Can Do It |
|--------|------------------------|---------------|
| Upload documents | ✅ Yes | Profile owner only |
| View profile | ✅ Yes | Any signed-in user |
| Download documents | ✅ Yes | Any signed-in user |
| Public artist view | ❌ No | Anyone (via `/artist/[id]`) |

---

## 💾 Backend Storage

**Where Documents Are Stored:**
- Azure backend via `/api/assets`
- Associated with entity ID
- Each document has a unique `fileId`:
  - `pressKit`
  - `stagePlot`
  - `inputList`

**Document URLs:**
- Stored in `assets` array on profile
- Retrieved by matching `fileId`
- URLs point to Azure blob storage

---

## 🧪 How to Test

### Step 1: Upload Your Documents
1. Go to http://localhost:3000/profile
2. Scroll to "Downloads" section
3. Upload a PDF for each document type
4. Verify they show as "Uploaded" with checkmark

### Step 2: Get Your Entity ID
- Check browser console for `entityInfo` or `activeProfile.id`
- Or look at API response in Network tab
- Example: `31abcffb-6c8c-4988-bbbf-fd59350d4038`

### Step 3: Test Viewing as Another User
1. Open an incognito window or different browser
2. Sign in as a different user (or same user for testing)
3. Navigate to: `http://localhost:3000/profile/YOUR_ENTITY_ID`
4. You should see your profile with downloadable documents
5. Click on any uploaded document to download it

---

## 🎯 Use Cases

### Promoters Viewing Artist Profiles:
- Search for artists in the system
- Click on artist name → redirects to `/profile/[artistId]`
- Review artist bio, members, genres
- **Download press kit for promotional materials**
- **Download stage plot for venue setup**
- **Download input list for sound engineer**

### Artists Viewing Promoter Profiles:
- Browse promoters and venues
- Click on promoter name → redirects to `/profile/[promoterId]`
- View venue details
- Download relevant documents they've shared

---

## 🔗 How to Share Your Profile

As a profile owner, you can share your profile URL with:
- Promoters you're working with
- Venues booking your shows
- Other artists collaborating
- Anyone who needs access to your documents

**Your shareable URL:**
```
http://localhost:3000/profile/YOUR_ENTITY_ID
```

Or in production:
```
https://scenegen.io/profile/YOUR_ENTITY_ID
```

---

## ✨ Summary

**YES!** Other signed-in users can:
- ✅ View your profile at `/profile/[yourEntityId]`
- ✅ Download your Press Kit
- ✅ Download your Stage Plot
- ✅ Download your Input List
- ✅ Access all shared information

Documents are stored securely in Azure and accessible to any authenticated user who has your profile link!

---
*Updated: January 8, 2026*
