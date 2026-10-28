'use client';

import { useRouter } from 'next/navigation';
import { useProfileStore } from '@/store/useProfileStore';
import { useOnboardingRedirect } from '@/hooks/useOnboardingRedirect';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { MapPinned } from 'lucide-react';

// Import TouringLayout with SSR disabled to avoid window errors during build
const TouringLayout = dynamic(() => import('@/components/touring/TouringLayout'), { ssr: false });

/**
 * Touring Page
 * Implements BUILD_PLAN Week 5, Task 5.4
 *
 * Artist-only page showing map with promoter contacts and shows
 * Promoters are redirected to dashboard
 */
export default function TouringPage() {
  const router = useRouter();
  const { activeProfile } = useProfileStore();
  const { isChecking } = useOnboardingRedirect();

  const isArtist = activeProfile?.entityType === 'artist';

  // Show loading while checking onboarding status
  if (isChecking) {
    return (
      <div className="scene-page">
        <div className="text-center py-12">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  // Promoter guard - redirect to dashboard
  if (!isArtist) {
    return (
      <div className="scene-page">
        <div className="max-w-2xl mx-auto text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-surface-elevated text-primary"><MapPinned size={22} /></div>
          <h2 className="text-2xl font-bold mb-2">Touring is available in artist workspaces</h2>
          <p className="text-text-secondary mb-6">
            The touring page is available for artist profiles only. Promoters can view shows and contacts from their respective pages.
          </p>
          <Button
            onClick={() => router.push('/dashboard')}
            size="lg"
          >
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Artist view - show touring layout
  return <TouringLayout />;
}
