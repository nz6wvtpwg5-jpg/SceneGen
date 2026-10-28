'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearch, type SearchEntity, type SearchResults } from '@/hooks/useSearch';

interface EntitySearchProps {
    onSelect: (entity: SearchEntity) => void;
    filterType?: 'artist' | 'promoter' | 'all';
    placeholder?: string;
}

/**
 * EntitySearch Component
 * Implements BUILD_PLAN Week 2, Task 2.6
 * Features:
 * - Search input with debounce
 * - Filter by type (artist/promoter/all)
 * - Results list with entity cards
 * - Click handler (onSelect callback)
 */
export default function EntitySearch({ 
    onSelect, 
    filterType = 'all',
    placeholder = 'Search for artists or promoters...'
}: EntitySearchProps) {
    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [results, setResults] = useState<SearchResults>({ artists: [], promoters: [] });
    const { searchEntities, isLoading, error } = useSearch();

    // Debounce search query
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedQuery(query);
        }, 300);

        return () => clearTimeout(timer);
    }, [query]);

    // Perform search when debounced query changes
    useEffect(() => {
        const performSearch = async () => {
            if (debouncedQuery.trim().length === 0) {
                setResults({ artists: [], promoters: [] });
                return;
            }

            try {
                const searchResults = await searchEntities(debouncedQuery, filterType);
                setResults(searchResults);
            } catch (err) {
                console.error('Search error:', err);
                setResults({ artists: [], promoters: [] });
            }
        };

        performSearch();
    }, [debouncedQuery, filterType, searchEntities]);

    const handleEntityClick = (entity: SearchEntity) => {
        onSelect(entity);
        setQuery('');
        setResults({ artists: [], promoters: [] });
    };

    const totalResults = results.artists.length + results.promoters.length;
    const showResults = query.length > 0 && (totalResults > 0 || (!isLoading && debouncedQuery === query));

    return (
        <div className="relative w-full">
            <div className="relative">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={placeholder}
                    className="w-full px-4 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {isLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                )}
            </div>

            {/* Results Dropdown */}
            {showResults && (
                <div className="absolute z-50 w-full mt-2 bg-background border border-border-subtle rounded-lg shadow-lg max-h-96 overflow-y-auto">
                    {error && (
                        <div className="p-4 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {!error && totalResults === 0 && (
                        <div className="p-4 text-sm text-text-tertiary text-center">
                            No results found for "{query}"
                        </div>
                    )}

                    {/* Artists Section */}
                    {results.artists.length > 0 && (
                        <div>
                            <div className="px-4 py-2 text-xs font-semibold text-text-tertiary bg-surface-elevated">
                                ARTISTS ({results.artists.length})
                            </div>
                            {results.artists.map((artist) => (
                                <button
                                    key={artist.id}
                                    onClick={() => handleEntityClick(artist)}
                                    className="w-full px-4 py-3 text-left hover:bg-surface-elevated transition-colors border-b border-border-subtle last:border-b-0"
                                >
                                    <div className="font-medium">{artist.name}</div>
                                    {artist.alias && (
                                        <div className="text-sm text-text-tertiary">
                                            Also known as: {artist.alias}
                                        </div>
                                    )}
                                    <div className="text-sm text-text-tertiary">
                                        {[artist.city, artist.stateOrProvince, artist.country]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Promoters Section */}
                    {results.promoters.length > 0 && (
                        <div>
                            <div className="px-4 py-2 text-xs font-semibold text-text-tertiary bg-surface-elevated">
                                PROMOTERS ({results.promoters.length})
                            </div>
                            {results.promoters.map((promoter) => (
                                <button
                                    key={promoter.id}
                                    onClick={() => handleEntityClick(promoter)}
                                    className="w-full px-4 py-3 text-left hover:bg-surface-elevated transition-colors border-b border-border-subtle last:border-b-0"
                                >
                                    <div className="font-medium">{promoter.name}</div>
                                    {promoter.alias && (
                                        <div className="text-sm text-text-tertiary">
                                            Also known as: {promoter.alias}
                                        </div>
                                    )}
                                    <div className="text-sm text-text-tertiary">
                                        {[promoter.city, promoter.stateOrProvince, promoter.country]
                                            .filter(Boolean)
                                            .join(', ')}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
