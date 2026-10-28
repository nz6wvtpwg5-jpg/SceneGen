import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

/**
 * Entity search result types
 * Week 2, Task 2.5
 */
export interface SearchEntity {
    id: string;
    name: string;
    entityType: 'artist' | 'promoter';
    city?: string;
    stateOrProvince?: string;
    country?: string;
    alias?: string;
}

export interface SearchResults {
    artists: SearchEntity[];
    promoters: SearchEntity[];
}

/**
 * Hook for searching entities (artists and promoters)
 * Implements BUILD_PLAN Week 2, Task 2.5
 */
export function useSearch() {
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Search for entities by query and type
     * @param query - Search query string
     * @param type - Filter by entity type ('artist', 'promoter', or 'all')
     */
    const searchEntities = useCallback(async (
        query: string,
        type: 'artist' | 'promoter' | 'all' = 'all'
    ): Promise<SearchResults> => {
        if (!session?.user?.id) {
            throw new Error('No authentication token available');
        }

        if (!query || query.trim().length === 0) {
            return { artists: [], promoters: [] };
        }

        setIsLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams({
                q: query.trim(),
                type: type
            });

            const response = await fetch(`/api/search?${params.toString()}`, {
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to search entities');
            }

            const data = await response.json();

            // Ensure arrays exist even if backend returns null
            return {
                artists: Array.isArray(data.artists) ? data.artists : [],
                promoters: Array.isArray(data.promoters) ? data.promoters : []
            };
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to search entities';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [session?.user?.id]);

    return {
        searchEntities,
        isLoading,
        error
    };
}
