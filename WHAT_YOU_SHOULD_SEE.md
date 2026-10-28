# 👀 What You Should See in SceneGen

## 🏠 **Root Page (http://localhost:3000)**
**Expected:** Just shows "Homepage" text - this is intentional!
**Why:** The root page is minimal. The real app starts after you navigate to other pages.

---

## 🎨 **What the App SHOULD Look Like:**

### **Layout (All Pages):**
```
┌─────────────────────────────────────────────────┐
│ 🎸 [Logo]                    🔔 👤            │ ← Header (gray bar)
├──────────┬──────────────────────────────────────┤
│          │                                      │
│ [🧭]     │                                      │
│ Dashboard│         MAIN CONTENT                 │
│          │                                      │
│ [📅]     │                                      │
│ Shows    │                                      │
│          │                                      │
│ [👥]     │                                      │
│ Contacts │                                      │
│          │                                      │
│ [💡]     │                                      │
│ Convers. │                                      │
│          │                                      │
│ [📒]     │                                      │
│ Bookkp.  │                                      │
│          │                                      │
│ [👤]     │                                      │
│ Profile  │                                      │
│          │                                      │
└──────────┴──────────────────────────────────────┘
                                          [🌙/☀️] ← Theme toggle
```

---

## 📍 **Page by Page - What You Should See:**

### **1. Dashboard (`/dashboard`)**
**You SHOULD see:**
- "Welcome, [Your Name]!" heading
- "Here's what's rockin' this week" subheading
- "Test Header Image Upload" section (with upload component)

**If you see "Loading...":**
- Authentication is in progress

**If you see "Error: ...":**
- Backend API might be down or authentication failed

---

### **2. Shows (`/shows`)**
**You SHOULD see:**
- "Shows" heading
- "Keep track of your shred schedule here" subheading
- "Add a Show" button
- Orange warning banner: "You have 2 new show responses"
- Calendar component
- "X Upcoming Shows" text
- Filter dropdowns
- Table of shows with columns

---

### **3. Contacts (`/contacts`)**
**You SHOULD see:**
- "Contacts" heading
- "Build community and make more connections!" subheading
- "Add Contact" button
- Filter dropdowns (Roles, Locations, etc.)
- Table of contacts with:
  - Name
  - Location (City, State, Country)
  - Email
  - Actions (view, delete)
- Connection request cards (if any pending)

---

### **4. Conversations (`/conversations`)**
**You SHOULD see:**
- Split screen layout:
  - **Left:** List of conversations
  - **Right:** Chat box with messages
- If no conversations: "Select a conversation to start chatting"
- Real-time chat functionality

---

### **5. Profile (`/profile`)**
**You SHOULD see:**
- Large header image (background)
- Profile name overlay
- Location information
- Genre tags (#thrashmetal #glammetal)
- "Download EPK as Zip" button
- Music player section
- Profile details:
  - Video/message section
  - Genres
  - Bio
  - Band members
  - Upcoming shows

---

## 🎨 **Styling Elements:**

### **Colors:**
- **Primary accent:** Orange/Volcano color (#aa3e19)
- **Dark mode:** Dark gray backgrounds
- **Light mode:** White/light gray backgrounds

### **Fonts:**
- Geist Sans for body text
- Geist Mono for code/monospace

### **Components:**
- Radix UI components (dropdowns, tooltips, etc.)
- Tailwind CSS styling
- Smooth animations and transitions

---

## ❌ **What Might Make It Look "Basic":**

### **1. Not Logged In**
- If you haven't authenticated, you won't see user-specific data
- Some pages might show loading states or empty states

### **2. No Data from Backend**
- If backend returns empty arrays, you'll see empty tables
- This is normal if you're a new user with no contacts/shows/etc.

### **3. Missing CSS or Theme Not Loading**
- Should have colors and styling
- If everything is black/white with no styling, CSS might not be loading

### **4. Viewing the Wrong Page**
- Root page (`/`) is intentionally minimal
- Navigate to `/dashboard` or other pages for full experience

---

## 🔍 **Quick Checks:**

### **Check 1: Are you seeing the sidebar?**
- ✅ YES → Layout is working
- ❌ NO → CSS might not be loading

### **Check 2: Are you seeing the header with logo?**
- ✅ YES → Layout is working
- ❌ NO → Images/CSS might not be loading

### **Check 3: Can you toggle dark/light mode?**
- ✅ YES → JavaScript is working
- ❌ NO → Click moon/sun icon in bottom-right

### **Check 4: Do you see "Loading..." or actual data?**
- Loading → Backend is being called
- Error → Authentication or API issue
- Data → Everything is working!

---

## 🐛 **Troubleshooting "Basic" Appearance:**

### **Issue: Only seeing "Homepage" text**
**Solution:** Navigate to `/dashboard` instead of `/`

### **Issue: No styling, everything is unstyled**
**Solution:** 
1. Check browser console (F12) for CSS errors
2. Hard refresh: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
3. Clear browser cache

### **Issue: Sidebar not showing**
**Solution:**
- Sidebar is hidden on mobile/small screens
- Resize browser window wider
- Or it's intentionally collapsed - look for expand button

### **Issue: Empty tables/no data**
**Solution:**
- This is normal if you have no data yet
- Backend might be returning empty arrays
- Try adding data (contacts, shows, etc.)

---

## 📸 **Screenshot Comparison:**

If what you're seeing doesn't match the descriptions above, please:
1. Take a screenshot of what you're seeing
2. Check browser console (F12) for errors
3. Check the terminal for API call errors
4. Verify you're logged in by checking for user icon in header

---

## ✅ **Expected Behavior Summary:**

| Page | URL | Should Have |
|------|-----|-------------|
| Home | `/` | Just "Homepage" text |
| Dashboard | `/dashboard` | Welcome message, user data |
| Shows | `/shows` | Calendar, table, filters |
| Contacts | `/contacts` | Table, filters, map |
| Conversations | `/conversations` | Chat interface |
| Profile | `/profile` | Header image, bio, genres |

---

**If you're not seeing these elements, let me know WHICH page and WHAT you're seeing instead!**
