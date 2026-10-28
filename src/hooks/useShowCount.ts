"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { getEntityId } from "@/lib/entity";
import { useCountRefreshStore } from "@/store/useCountRefreshStore";
import { apiCache } from "@/lib/api-cache";

/**
 * Hook to get the count of future shows for the current entity
 * Returns both total shows and future shows count
 * OPTIMIZED: Uses caching to prevent redundant API calls
 */
export function useShowCount() {
  const { data: session } = useSession();
  const [count, setCount] = useState<number>(0);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const showRefreshTrigger = useCountRefreshStore((state) => state.showRefreshTrigger);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const fetchCount = async () => {
      if (!session?.user?.id) {
        setCount(0);
        setTotalCount(0);
        return;
      }

      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const entityId = getEntityId();
      if (!entityId) {
        setCount(0);
        setTotalCount(0);
        return;
      }
      const cacheKey = `show-count-${entityId}`;

      // Check cache first
      const cached = apiCache.get<{ count: number; totalCount: number }>(cacheKey);
      if (cached) {
        setCount(cached.count);
        setTotalCount(cached.totalCount);
        return;
      }

      setIsLoading(true);
      abortControllerRef.current = new AbortController();

      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
          'X-Entity-Id': entityId,
        };

        const response = await fetch('/api/shows', {
          credentials: 'include',
          headers,
          signal: abortControllerRef.current.signal,
        });

        if (response.ok) {
          const data = await response.json();
          const shows = data.shows || data || [];

          // Set total count
          const total = shows.length;

          // Count shows in the future (including today)
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const futureCount = shows.filter((show: any) => {
            const showDateStr = show.showDate || show.date;
            if (!showDateStr) return false;

            // Parse date as local time by extracting YYYY-MM-DD
            const datePart = showDateStr.split('T')[0];
            const [year, month, day] = datePart.split('-').map(Number);
            const showDate = new Date(year, month - 1, day);

            return showDate >= today;
          }).length;

          // Cache the result for 20 seconds
          apiCache.set(cacheKey, { count: futureCount, totalCount: total }, 20000);

          setCount(futureCount);
          setTotalCount(total);
        } else if (response.status !== 401 && response.status !== 403) {
          setCount(0);
          setTotalCount(0);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setCount(0);
          setTotalCount(0);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchCount();

    // Refresh count every 60 seconds (reduced from 30)
    const interval = setInterval(fetchCount, 60000);
    return () => {
      clearInterval(interval);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [session?.user?.id, showRefreshTrigger]);

  return { count, totalCount, isLoading };
}
