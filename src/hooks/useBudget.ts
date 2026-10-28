import { useState, useEffect } from 'react';
import { useProfileStore } from '@/store/useProfileStore';
import type { Budget } from '@/types/budget';

interface UseBudgetResult {
  budget: Budget | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  updateBudget: (updates: Partial<Budget>) => Promise<void>;
}

export function useBudget(budgetId: string | undefined): UseBudgetResult {
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { activeProfile } = useProfileStore();

  const fetchBudget = async () => {
    if (!activeProfile?.id || !budgetId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        entityId: activeProfile.id,
      });

      const response = await fetch(`/api/budgets/${budgetId}?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to fetch budget');
      }

      const data = await response.json();
      setBudget(data);
    } catch (err) {
      console.error('Error fetching budget:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch budget');
    } finally {
      setLoading(false);
    }
  };

  const updateBudget = async (updates: Partial<Budget>) => {
    if (!activeProfile?.id || !budgetId) {
      throw new Error('No active workspace or budget ID');
    }

    try {
      const response = await fetch(`/api/budgets/${budgetId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entityId: activeProfile.id,
          ...updates,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Failed to update budget');
      }

      const data = await response.json();
      setBudget(data);
    } catch (err) {
      console.error('Error updating budget:', err);
      throw err;
    }
  };

  useEffect(() => {
    fetchBudget();
  }, [activeProfile?.id, budgetId]);

  return {
    budget,
    loading,
    error,
    refetch: fetchBudget,
    updateBudget,
  };
}
