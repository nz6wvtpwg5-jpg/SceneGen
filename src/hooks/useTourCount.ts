"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { getEntityId } from "@/lib/entity";
import { useCountRefreshStore } from "@/store/useCountRefreshStore";

/**
 * Hook to get the count of tours for the current entity
 */
export function useTourCount() {
  const { data: session } = useSession();
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const tourRefreshTrigger = useCountRefreshStore((state) => state.tourRefreshTrigger);

  useEffect(() => {
    const fetchCount = async () => {
      if (!session?.user?.id) {
        setCount(0);
        return;
      }

      setIsLoading(true);
      try {
        const entityId = getEntityId();
        if (!entityId) {
          setCount(0);
          return;
        }
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'X-Entity-Id': entityId,
        };

        const response = await fetch('/api/tours', {
          credentials: 'include',
          headers,
        });

        if (response.ok) {
          const data = await response.json();
          const tours = data.tours || data || [];
          setCount(tours.length);
        } else {
          // Don't log errors for 403 (promoters can't access tours)
          if (response.status !== 403) {
            console.warn('🔍 [useTourCount] Response not OK:', response.status);
          }
          setCount(0);
        }
      } catch (err) {
        // Silent fail - network issues shouldn't spam console
        if (err instanceof Error && !err.message.includes('Failed to fetch')) {
          console.error('Error fetching tour count:', err);
        }
        setCount(0);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCount();

    // Refresh count every 30 seconds
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [session?.user?.id, tourRefreshTrigger]);

  return { count, isLoading };
}
