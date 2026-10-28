import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/bookkeeping/', '/calendar/', '/collaborator-access/', '/contacts/', '/conversations/', '/dashboard/', '/day-sheet-invite/', '/external-day-sheets/', '/forgot-password/', '/import/', '/invite/', '/login/', '/manage/', '/merch/', '/my-day-sheets/', '/notifications/', '/onboarding/', '/profile/', '/resend-verification/', '/reset-password/', '/shared/', '/shows/', '/touring/', '/tours/', '/venues/', '/verify-email/'],
    },
    sitemap: 'https://scenegen-web.onrender.com/sitemap.xml',
  };
}
