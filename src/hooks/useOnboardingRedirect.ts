'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

/**
 * Hook to redirect authenticated users without entities to the onboarding page
 *
 * A user may enter the app when they own a workspace or have an active
 * workspace membership. Users with neither are sent through onboarding.
 */
export function useOnboardingRedirect() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [hasEntities, setHasEntities] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    // Don't redirect if we're already on the onboarding page or invite acceptance page
    if (pathname === '/onboarding' || pathname?.startsWith('/invite/')) {
      setIsChecking(false);
      return;
    }

    const checkEntities = async () => {

      // Wait for session to load
      if (status === 'loading') {
        return;
      }

      // If not authenticated, don't check entities
      if (status === 'unauthenticated' || !session?.user?.id) {
        setIsChecking(false);
        setHasEntities(null);
        return;
      }

      try {
        const [response, agentResponse] = await Promise.all([
          fetch('/api/user/entities', { headers: { 'Content-Type': 'application/json' } }),
          fetch('/api/booking-agent/profile', { cache: 'no-store' }),
        ]);

        if (!response.ok) {
          console.error('Error checking entities:', response.status);
          setIsChecking(false);
          return;
        }

        const entities = await response.json();
        const agentData = agentResponse.ok ? await agentResponse.json() : { profile: null };

        const hasWorkspace = Array.isArray(entities) && entities.length > 0;
        const hasAgentProfile = Boolean(agentData.profile);
        setHasEntities(hasWorkspace || hasAgentProfile);

        if (hasAgentProfile && !hasWorkspace) router.replace('/agent');
        else if (!hasWorkspace) router.replace('/onboarding');
      } catch (error) {
        console.error('Error checking entities:', error);
      } finally {
        setIsChecking(false);
      }
    };

    checkEntities();
  }, [session?.user?.id, status, pathname, router]);

  return { hasEntities, isChecking };
}
