import { useState, useEffect, useRef } from 'react';
import { useProfileStore } from '@/store/useProfileStore';
import type { Budget, BudgetFilters } from '@/types/budget';
import { apiCache } from '@/lib/api-cache';

interface UseBudgetsResult {
  budgets: Budget[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * OPTIMIZED: Hook for fetching budgets with caching and abort controller
 */
export function useBudgets(filters?: BudgetFilters): UseBudgetsResult {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeProfile } = useProfileStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchBudgets = async () => {
    if (!activeProfile?.id) {
      setLoading(false);
      setBudgets([]);
      return;
    }

    // Cancel previous request if still pending
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        entityId: activeProfile.id,
      });

      if (filters?.showId) params.append('showId', filters.showId);
      if (filters?.tourId) params.append('tourId', filters.tourId);
      if (filters?.search) params.append('search', filters.search);

      const cacheKey = `budgets-${params.toString()}`;

      // Check cache first
      const cached = apiCache.get<Budget[]>(cacheKey);
      if (cached) {
        setBudgets(cached);
        setLoading(false);
        return;
      }

      abortControllerRef.current = new AbortController();

      const response = await fetch(`/api/budgets?${params.toString()}`, {
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch budgets');
      }

      const data = await response.json();
      
      // Cache for 15 seconds
      apiCache.set(cacheKey, data, 15000);
      
      setBudgets(data);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error fetching budgets:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch budgets');
        setBudgets([]);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgets();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [activeProfile?.id, filters?.showId, filters?.tourId, filters?.search]);

  return {
    budgets,
    loading,
    error,
    refetch: fetchBudgets,
  };
}
