'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Search, Users } from 'lucide-react';

interface PromoterContact {
  entityId: string;
  name: string;
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
  showCount: number;
  shows: Array<{
    id: string;
    showDate: string;
    venueName: string;
    status: string;
    tourId?: string;
  }>;
}

interface PromoterContactsListProps {
  selectedTourId: string | null;
  selectedPromoterId: string | null;
  onPromoterSelect: (promoterId: string | null) => void;
}

/**
 * PromoterContactsList Component
 * Implements BUILD_PLAN Week 5, Task 5.9
 *
 * Simple list of promoter contacts with search
 */
export default function PromoterContactsList({
  selectedTourId,
  selectedPromoterId,
  onPromoterSelect
}: PromoterContactsListProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [promoters, setPromoters] = useState<PromoterContact[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchPromoters();
    }
  }, [session?.user?.id, selectedTourId]);

  const fetchPromoters = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const url = selectedTourId
        ? `/api/contacts/promoters?tourId=${selectedTourId}`
        : '/api/contacts/promoters';

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPromoters(data);
      }
    } catch (err) {
      console.error('Failed to fetch promoters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredPromoters = promoters.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.state.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="p-4 text-center">
        <div className="inline-block animate-spin h-6 w-6 border-4 border-primary border-t-transparent rounded-full"></div>
        <p className="text-sm text-text-tertiary mt-2">Loading contacts...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold mb-3">Promoter Contacts</h2>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="min-h-11 w-full rounded-lg border border-border-subtle bg-background py-2 pl-10 pr-4 text-base md:text-sm"
          />
        </div>
      </div>

      {/* Contacts List */}
      <div className="flex-1 overflow-y-auto">
        {promoters.length === 0 && !searchQuery ? (
          /* Week 6, Task 6.10: Empty state for no contacts */
          <div className="p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-border-subtle bg-surface-elevated text-primary"><Users size={22} /></div>
            <h3 className="text-lg font-semibold mb-2">No Promoter Contacts Yet</h3>
            <p className="text-sm text-text-tertiary mb-6">
              Promoter contacts connected to your shows will appear here.
            </p>
            <button
              onClick={() => router.push('/contacts')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm"
            >
              Go to Contacts
            </button>
          </div>
        ) : filteredPromoters.length === 0 ? (
          <div className="p-4 text-center text-text-tertiary">
            <p className="text-sm">
              {searchQuery ? 'No contacts match your search' : 'No promoter contacts yet'}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredPromoters.map((promoter) => (
              <div
                key={promoter.entityId}
                role="button"
                tabIndex={0}
                onClick={() => onPromoterSelect(promoter.entityId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onPromoterSelect(promoter.entityId);
                }}
                className={`block min-h-14 w-full cursor-pointer p-4 text-left transition-colors hover:bg-surface-elevated ${
                  selectedPromoterId === promoter.entityId ? 'bg-surface-elevated' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium text-sm mb-1">{promoter.name}</h3>
                    <p className="text-xs text-text-tertiary">
                      {promoter.city}, {promoter.state}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-medium">
                      {promoter.showCount} {promoter.showCount === 1 ? 'show' : 'shows'}
                    </p>
                  </div>
                </div>

                {promoter.shows.length > 0 && (
                  <div className="mt-2 pt-2 border-t">
                    <div className="space-y-1">
                      {promoter.shows.slice(0, 2).map((show) => (
                        <button
                          type="button"
                          key={show.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/shows/${show.id}`);
                          }}
                          className="block min-h-11 w-full py-2 text-left text-sm text-text-tertiary hover:text-foreground"
                        >
                          {new Date(show.showDate).toLocaleDateString()} - {show.venueName}
                        </button>
                      ))}
                      {promoter.shows.length > 2 && (
                        <div className="text-xs text-text-tertiary italic">
                          +{promoter.shows.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
