# ⚡ SceneGen Performance Guide

## 🐌 Why Pages Load Slowly (First Time Only)

### **The Issue:**
In development mode, Next.js compiles pages **on-demand** when you visit them for the first time.

### **Compilation Times by Page:**

| Page | First Load | Modules | Subsequent Loads |
|------|-----------|---------|------------------|
| Dashboard | 1.6s | 982 | **6ms** ⚡ |
| Shows | 325ms | 969 | **instant** ⚡ |
| Contacts | 328ms | 1,129 | **instant** ⚡ |
| **Conversations** | **3.3s** 😱 | **7,896** | **7ms** ⚡ |
| **Profile** | **617ms** | **7,898** | **instant** ⚡ |
| Bookkeeping | 64ms | 959 | **instant** ⚡ |

---

## 🎯 **Why Are Some Pages So Slow?**

### **Heavy Dependencies:**

1. **Conversations Page (3.3s)**
   - Loads **Ably** (real-time chat library)
   - Imports **7,896 modules**!
   - Includes WebSocket connections, encryption, etc.

2. **Profile Page (617ms)**
   - Still loads **7,898 modules**
   - Large component tree

3. **Contacts Page (328ms)**
   - Loads **Leaflet** (map library)
   - Includes map tiles, clustering, markers

---

## ✅ **Solutions Applied:**

### **1. Dynamic Imports**
Heavy components now load on-demand:
```javascript
// ContactMap loads only when needed
const ContactMap = dynamic(() => import("@/components/contacts/ContactMap"), {
  ssr: false,
  loading: () => <LoadingSpinner />
});
```

### **2. Optimized Package Imports**
Added to `next.config.mjs`:
```javascript
experimental: {
  optimizePackageImports: ['lucide-react', '@radix-ui/react-icons', 'ably'],
}
```

### **3. Cache Benefits**
After first load, subsequent visits are **instant** (6-7ms).

---

## 🚀 **How to Get Fast Performance:**

### **Method 1: Warm Up Cache (Recommended)**
Just navigate through all pages once:
1. Visit Dashboard
2. Visit Shows
3. Visit Contacts
4. Visit Conversations ← (takes 3 seconds)
5. Visit Profile
6. Visit Bookkeeping

**After this, ALL pages load instantly!**

---

### **Method 2: Production Build**
Production builds are pre-compiled and much faster:

```bash
# Build for production
pnpm build

# Run production server
pnpm start
```

**Result:** All pages load in **< 100ms** from the start!

---

## 📊 **Expected Performance:**

### **Development Mode (pnpm dev):**
- **First visit:** 64ms - 3.3s (depends on page)
- **Subsequent visits:** 6-7ms ⚡
- **Hot reload:** < 100ms

### **Production Mode (pnpm build + pnpm start):**
- **All pages:** < 100ms consistently
- **Pre-compiled and optimized**
- **No on-demand compilation**

---

## 🔧 **Additional Optimizations:**

### **If Still Slow:**

1. **Update browserslist data:**
   ```bash
   npx update-browserslist-db@latest
   ```

2. **Check system resources:**
   - Close other heavy applications
   - Ensure adequate RAM available

3. **Clear Next.js cache:**
   ```bash
   rm -rf .next
   pnpm dev
   ```

4. **Use production build for testing:**
   ```bash
   pnpm build && pnpm start
   ```

---

## 💡 **Why This Is Normal:**

**Next.js development mode** is designed for developer experience, not speed:
- Compiles on-demand (saves time if you don't visit all pages)
- Includes source maps and debug info
- Hot reloads on every change
- Runs in unoptimized mode

**Production mode** is optimized for speed:
- Everything pre-compiled
- Minified and tree-shaken
- Optimized bundles
- Static generation where possible

---

## ⚡ **Quick Tips:**

### **For Development:**
✅ Accept the initial slow load (only happens once per page)  
✅ Subsequent navigations are instant  
✅ Keep the dev server running between sessions  

### **For Testing:**
✅ Use production build: `pnpm build && pnpm start`  
✅ All pages will be fast from the start  

### **For Deployment:**
✅ Production builds are always fast  
✅ Users never experience compilation delays  
✅ Everything is pre-optimized  

---

## 🎯 **TL;DR:**

**The slow loading is ONLY:**
- ✅ In development mode
- ✅ On first visit to each page
- ✅ Normal behavior for Next.js

**It's fast:**
- ✅ On subsequent visits (6-7ms)
- ✅ In production builds (always)
- ✅ After the initial warm-up

**Solution:**
Just visit each page once, then enjoy instant navigation! 🚀
