'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useProfileStore, Entity } from '@/store/useProfileStore';
import { ChevronDown, Plus } from 'lucide-react';

// ✅ Add this prop so the sidebar can tell us when it's collapsed
export default function SidebarEntities({ collapsed = false }: { collapsed?: boolean }) {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [entities, setEntities] = useState<Entity[]>([]);
    const [loading, setLoading] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const { activeProfile, setActiveProfile } = useProfileStore();
    const userName = session?.user?.name || 'User';

    const fetchEntities = useCallback(async () => {
        // Wait for session to load
        if (status === 'loading') {
            return;
        }

        // Don't fetch if not authenticated or no access token
        if (status === 'unauthenticated' || !session?.user?.id) {
            setEntities([]);
            setActiveProfile(null);
            setLoading(false);
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/user/entities', {
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (!response.ok) {
                // For auth errors, just silently clear entities
                if (response.status === 401 || response.status === 403) {
                    setEntities([]);
                    setActiveProfile(null);
                    return;
                }

                // For other errors, log them
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                console.error('Entity fetch error:', {
                    status: response.status,
                    error: errorData
                });
                return;
            }

            const data = await response.json();

            // Transform snake_case from backend to camelCase for frontend
            const transformEntity = (entity: any): Entity => ({
                id: entity.id,
                name: entity.name,
                entityType: entity.entity_type || entity.entityType, // Handle both formats
                administratorId: entity.administrator_id || entity.administratorId,
                membershipRole: entity.membership_role || entity.membershipRole,
                city: entity.city,
                country: entity.country,
                latitude: entity.latitude,
                longitude: entity.longitude,
                trialEndsAt: entity.trial_ends_at || entity.trialEndsAt,
            });

            let accessibleEntities: Entity[] = [];
            if (Array.isArray(data)) {
                accessibleEntities = data.map(transformEntity);
            }
            setEntities(accessibleEntities);
            const validated = accessibleEntities.find((entity) => entity.id === activeProfile?.id) || accessibleEntities[0] || null;
            if (validated?.id !== activeProfile?.id) setActiveProfile(validated);
        } catch (error) {
            // Silently handle network errors
            console.error('Network error fetching entities:', error);
            setEntities([]);
            setActiveProfile(null);
        } finally {
            setLoading(false);
        }
    }, [session?.user?.id, status, activeProfile, setActiveProfile]);

    useEffect(() => {
        fetchEntities();
    }, [fetchEntities]);

    const handleEntityClick = (entity: Entity) => {
        setActiveProfile(entity);
        setIsExpanded(false);
    };

    const handleAddEntity = () => {
        router.push('/onboarding');
        setIsExpanded(false);
    };

    // Close dropdown if sidebar collapses while open
    useEffect(() => {
        if (collapsed && isExpanded) setIsExpanded(false);
    }, [collapsed, isExpanded]);

    // Don't render if not authenticated
    if (status === 'unauthenticated' || !session?.user?.id) {
        return null;
    }

    if (loading) {
        return <div className="px-3 py-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#8b8479]">Loading workspace…</div>;
    }

    const displayName = activeProfile?.name || userName;
    const initial = (displayName?.trim()?.[0] || '?').toUpperCase();

    // If no entities, show a button to create one
    if (entities.length === 0) {
        // Collapsed: just show a + icon button with tooltip via title
        if (collapsed) {
            return (
                <button
                    onClick={handleAddEntity}
                    title="Create Profile"
                    className={cn(
                        'w-full p-2 flex items-center justify-center',
                    'text-[#6f685e] hover:text-[#171612] hover:bg-[#d9d2c5]',
                    'rounded-[10px] transition-colors duration-200'
                    )}
                >
                    <Plus className="w-4 h-4" />
                </button>
            );
        }

        return (
            <button
                onClick={handleAddEntity}
                className={cn(
                    'w-full p-3 flex items-center justify-between',
                    'text-sm font-bold text-[#5f594f] hover:text-[#171612] hover:bg-[#d9d2c5]',
                    'rounded-[10px] transition-colors duration-200'
                )}
            >
                <span>Create Profile</span>
                <Plus className="w-4 h-4" />
            </button>
        );
    }

    return (
        <div className="relative">
            {/* TRIGGER */}
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={collapsed ? displayName : undefined}
                className={cn(
                    'w-full p-3 rounded-[12px] border border-[#d0c9bc] bg-[#f3eee5] transition-colors duration-200',
                    'text-[#39362f] hover:border-[#bdb5a7] hover:bg-white',
                    collapsed
                        ? 'flex items-center justify-center'
                        : 'px-4 flex items-center justify-between'
                )}
            >
                {collapsed ? (
                    // ✅ Collapsed view: monogram avatar (no truncation)
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#171612] text-white font-semibold">
                        {initial}
                    </div>
                ) : (
                    // Expanded view: name + chevron (your current UI)
                    <>
                        <span className="min-w-0 text-left"><span className="block truncate text-sm font-black">{displayName}</span><span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.18em] text-[#918a7f]">Active workspace</span></span>
                        <ChevronDown
                            className={cn(
                                'w-4 h-4 transition-transform duration-200',
                                isExpanded ? 'transform rotate-180' : ''
                            )}
                        />
                    </>
                )}
            </button>

            {/* DROPDOWN */}
            {isExpanded && (
                <div
                    className={cn(
                        'absolute top-full mt-2 bg-[#f8f4ec] border border-[#cfc7ba] rounded-[10px] shadow-xl z-10',
                        // If collapsed, the sidebar is narrow; open the menu to the right so it's usable
                        collapsed ? 'left-full ml-2 w-56' : 'left-0 w-full'
                    )}
                >
                    {entities.map((entity) => (
                        <button
                            key={entity.id}
                            onClick={() => handleEntityClick(entity)}
                            className={cn(
                                'w-full p-2 px-4 text-left text-sm',
                                'flex items-center justify-between',
                                'text-[#625c53] hover:text-[#171612] hover:bg-[#e6dfd3]',
                                'transition-colors duration-200',
                                {
                                    'text-[#171612] bg-[#e6dfd3]': activeProfile?.id === entity.id
                                }
                            )}
                        >
                            <span className="truncate">{entity.name}</span>
                            <span className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#928a7f]">
                                {entity.entityType}
                            </span>
                        </button>
                    ))}

                    {/* Week 1, Task 1.7: One entity per user - "Add Profile" button removed */}
                    {/* Users can only own one entity (artist OR promoter) */}
                </div>
            )}
        </div>
    );
}
