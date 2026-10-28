"use client";

import { useState } from "react";
import type { Tour } from "@/types/tour";
import { getEntityId } from "@/lib/entity";

export function useTours() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTours = async (): Promise<Tour[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const entityId = getEntityId();
      if (!entityId) return [];
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
        'X-Entity-Id': entityId,
      };
      const response = await fetch('/api/tours', {
        credentials: 'include',
        headers,
      });
      if (!response.ok) {
        throw new Error('Failed to fetch tours');
      }
      const data = await response.json();
      return data.tours || data;
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTour = async (tourId: string): Promise<Tour> => {
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
      const response = await fetch(`/api/tours/${tourId}`, {
        credentials: 'include',
        headers,
      });
      if (!response.ok) {
        throw new Error('Failed to fetch tour');
      }
      const data = await response.json();
      return data.tour; // Extract tour object from response
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const createTour = async (tourData: {
    name: string;
    notes?: string;
    startDate: string;
    endDate: string;
  }): Promise<Tour> => {
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

      const response = await fetch('/api/tours', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(tourData),
      });
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || errorData.error || errorData.message || 'Failed to create tour';
        throw new Error(errorMessage);
      }
      const data = await response.json();
      return data.tour; // Extract tour object from response
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTour = async (tourId: string, updates: { name?: string; notes?: string }): Promise<Tour> => {
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
      const response = await fetch(`/api/tours/${tourId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers,
        body: JSON.stringify(updates),
      });
      if (!response.ok) {
        throw new Error('Failed to update tour');
      }
      const data = await response.json();
      return data.tour; // Extract tour object from response
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteTour = async (tourId: string): Promise<void> => {
    setIsLoading(true);
    setError(null);
    try {
      const entityId = getEntityId();
      const headers: HeadersInit = {};
      if (entityId) {
        headers['X-Entity-Id'] = entityId;
      }
      const response = await fetch(`/api/tours/${tourId}`, {
        method: 'DELETE',
        credentials: 'include',
        headers,
      });
      if (!response.ok) {
        throw new Error('Failed to delete tour');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const addShowsToTour = async (tourId: string, showIds: string[]): Promise<void> => {
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
      const response = await fetch('/api/shows/bulk-update', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ showIds, updates: { tourId } }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add shows to tour');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const removeShowsFromTour = async (showIds: string[]): Promise<void> => {
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
      const response = await fetch('/api/shows/bulk-update', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({ showIds, updates: { tourId: null } }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to remove shows from tour');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchTours,
    fetchTour,
    createTour,
    updateTour,
    deleteTour,
    addShowsToTour,
    removeShowsFromTour,
    isLoading,
    error,
  };
}
