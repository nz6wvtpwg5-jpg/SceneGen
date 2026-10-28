"use client";

import { useState } from "react";
import type { CreateShowInput, Show } from "@/types/show";
import { getEntityId } from "@/lib/entity";

export function useShows() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchShows = async (tourId?: string | null): Promise<Show[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const entityId = getEntityId();
      if (!entityId) return [];
      const url = tourId !== undefined
        ? `/api/shows?tourId=${tourId === null ? 'null' : tourId}`
        : '/api/shows';
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-Entity-Id': entityId,
      };
      const response = await fetch(url, {
        credentials: 'include',
        headers,
      });
      if (!response.ok) {
        throw new Error('Failed to fetch shows');
      }
      const data = await response.json();
      return data.shows || [];
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createShow = async (showData: CreateShowInput): Promise<Show> => {
    setIsLoading(true);
    setError(null);
    try {
      const entityId = getEntityId();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (entityId) {
        headers['X-Entity-Id'] = entityId;
      }
      const response = await fetch('/api/shows', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(showData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(typeof errorData.error === 'string' ? errorData.error : errorData.error?.message || errorData.error?.details || 'Failed to create show');
      }
      return await response.json();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateShow = async (showId: string, updates: Partial<Show>): Promise<Show> => {
    setIsLoading(true);
    setError(null);
    try {
      const entityId = getEntityId();
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      if (entityId) {
        headers['X-Entity-Id'] = entityId;
      }
      const response = await fetch(`/api/shows/${showId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('❌ Failed to update show:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });
        throw new Error('Failed to update show: ' + (typeof errorData.error === 'string' ? errorData.error : errorData.error?.details || errorData.error?.message || response.statusText));
      }
      return await response.json();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelShow = async (showId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const entityId = getEntityId();
      const headers: HeadersInit = {};
      if (entityId) {
        headers['X-Entity-Id'] = entityId;
      }
      const response = await fetch(`/api/shows/${showId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers,
      });
      if (!response.ok) {
        throw new Error('Failed to cancel show');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteShow = async (showId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const entityId = getEntityId();
      const headers: HeadersInit = {};
      if (entityId) {
        headers['X-Entity-Id'] = entityId;
      }
      const response = await fetch(`/api/shows/${showId}?permanent=true`, {
        method: 'DELETE',
        credentials: 'include',
        headers,
      });
      if (!response.ok) {
        throw new Error('Failed to delete show');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const bulkUpdateShows = async (
    showIds: string[],
    updates: Partial<Show>
  ): Promise<{ updated: number }> => {
    setIsLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };
      const response = await fetch('/api/shows/bulk-update', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ showIds, updates }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update shows');
      }
      return await response.json();
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchShows,
    createShow,
    updateShow,
    cancelShow,
    deleteShow,
    bulkUpdateShows,
    isLoading,
    error,
  };
}
