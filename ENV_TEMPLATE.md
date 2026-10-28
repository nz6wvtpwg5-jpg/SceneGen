# 🔐 Environment Variables Template

Copy this to your `.env.local` file and fill in the actual values.

---

## Current Configuration (✅ Already Set)

```bash
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

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=LU0HFI1RgOvBPkkxa8bh0uiVYnujDUez+Unf7RQtDkw=
AUTH_SECRET=LU0HFI1RgOvBPkkxa8bh0uiVYnujDUez+Unf7RQtDkw=

# Ably Real-time Chat
ABLY_API_KEY=prz_dg.a6fXUw:k4Vrc41WNb1MCdfZ97K_Hkj2MERK8QvGw_It80VE_u8
```

---

## Required for Google Calendar (⏳ TO DO - ADD THESE!)

```bash
# Google Calendar Integration
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID_HERE.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET_HERE
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/callback/google
```

**📝 Instructions:**
1. Go to https://console.cloud.google.com/
2. Create OAuth 2.0 credentials
3. Copy Client ID and Client Secret
4. Replace `YOUR_GOOGLE_CLIENT_ID_HERE` and `YOUR_GOOGLE_CLIENT_SECRET_HERE` above
5. Add these three lines to your `.env.local` file
6. Restart your dev server

---

## Production Environment Variables

For production deployment, also set these with production values:

```bash
# Production NextAuth
NEXTAUTH_URL=https://your-production-domain.com

# Production Google OAuth
GOOGLE_REDIRECT_URI=https://your-production-domain.com/api/auth/callback/google
```

---

## Optional (Future Features)

These are not yet implemented but reserved for future use:

```bash
# Stripe Payment Integration (Future)
# STRIPE_PUBLIC_KEY=pk_...
# STRIPE_SECRET_KEY=sk_...

# SendGrid Email Service (Future)
# SENDGRID_API_KEY=SG...

# AWS S3 for File Storage (Future)
# AWS_ACCESS_KEY_ID=...
# AWS_SECRET_ACCESS_KEY=...
# AWS_S3_BUCKET=...
```

---

## Security Notes

⚠️ **IMPORTANT:**
- **Never commit `.env.local`** to version control
- `.gitignore` already excludes it
- Rotate secrets regularly
- Use different values for dev/staging/production
- Store production secrets in your hosting platform's secure vault

---

## Verification Checklist

After adding Google Calendar variables:

- [ ] All three Google variables added to `.env.local`
- [ ] No typos in variable names
- [ ] Values don't have quotes or extra spaces
- [ ] Dev server restarted after changes
- [ ] Can access Shows page without errors
- [ ] Calendar button appears on shows

---

## Getting Help

If you see errors about missing environment variables:

1. Check `.env.local` exists in project root
2. Verify all required variables are present
3. Check for typos (variables are case-sensitive!)
4. Restart dev server completely (stop & start)
5. Clear browser cache if still having issues

---

✅ **You're ready when:** All variables are set and server starts without env variable warnings!
