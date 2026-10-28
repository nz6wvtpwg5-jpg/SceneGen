import { useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import type { Invite, CreateInviteInput, InviteResponse, AcceptInviteInput } from '@/types/invite';

/**
 * Hook for managing invites
 * Implements BUILD_PLAN Week 3, Task 3.3
 */
export function useInvites() {
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Create a new invite
     * @param inviteData - Invite data to create
     */
    const createInvite = useCallback(async (inviteData: CreateInviteInput): Promise<InviteResponse> => {
        if (!session?.user?.id) {
            throw new Error('No authentication token available');
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/invites', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(inviteData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to create invite');
            }

            const data = await response.json();
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create invite';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [session?.user?.id]);

    /**
     * Fetch invite details by token (public endpoint, no auth required)
     * @param token - Invite token
     */
    const fetchInvite = useCallback(async (token: string): Promise<Invite> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/invites/${token}`);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to fetch invite');
            }

            const data = await response.json();
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch invite';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Accept an invite
     * @param token - Invite token
     * @param acceptData - Accept data with entityId
     */
    const acceptInvite = useCallback(async (
        token: string,
        acceptData: AcceptInviteInput
    ): Promise<{ success: boolean }> => {
        if (!session?.user?.id) {
            throw new Error('No authentication token available');
        }

        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/invites/${token}/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(acceptData)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to accept invite');
            }

            const data = await response.json();
            return data;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to accept invite';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [session?.user?.id]);

    return {
        createInvite,
        fetchInvite,
        acceptInvite,
        isLoading,
        error
    };
}
