import { useState, useCallback } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { getEntityId } from '@/lib/entity';

export interface Contact {
    id: string;
    entityAId?: string;
    entityBId?: string;
    contactEntityId?: string;
    contactName: string;
    contactType?: string;
    /** City of the contact themselves, when supplied by that person or the workspace. */
    contactCity?: string;
    /** Historical band performances associated with this private contact (not their home address). */
    showLocations?: Array<{
        showId?: string;
        showDate?: string;
        city?: string | null;
        state?: string | null;
        country?: string | null;
        latitude?: string | number | null;
        longitude?: string | number | null;
    }>;
    contactState?: string;
    contactCountry?: string;
    contactLatitude?: string | number | null;
    contactLongitude?: string | number | null;
    contactTags?: string[];
    source?: 'scenegen' | 'private' | 'venue';
    contactKind?: 'person' | 'organization';
    contactGivenName?: string;
    contactSurname?: string;
    contactOrganization?: string;
    contactJobTitle?: string;
    contactEmail?: string;
    contactPhone?: string;
    preferredContactMethod?: 'email' | 'phone' | 'whatsapp' | 'other';
    contactRoles?: string[];
    contactTerritories?: string[];
    contactNotes?: string;
    status: 'pending' | 'accepted' | 'rejected';
    requestedBy: string;
    message?: string;
    createdAt: string;
    acceptedAt?: string;
}

export function useContacts() {
    const { data: session } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchContacts = useCallback(async (status?: 'pending' | 'accepted'): Promise<Contact[]> => {
        if (!session?.user?.id) throw new Error('No authentication token available');
        setIsLoading(true);
        setError(null);
        try {
            const entityId = getEntityId();
            const url = status ? `/api/contacts?status=${status}` : '/api/contacts';
            const headers: HeadersInit = {};
            if (entityId) headers['X-Entity-Id'] = entityId;
            const response = await fetch(url, { headers });
            if (response.status === 401) { await signOut({ callbackUrl: '/login?reason=session-expired' }); throw new Error('Your session has expired. Please sign in again.'); }
            if (!response.ok) throw new Error(await response.text() || 'Failed to fetch contacts');
            const data = await response.json();
            return Array.isArray(data.contacts) ? data.contacts : [];
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to fetch contacts';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [session?.user?.id]);

    const sendContactRequest = useCallback(async (recipientEntityId: string): Promise<Contact> => {
        if (!session?.user?.id) throw new Error('No authentication token available');
        setIsLoading(true);
        setError(null);
        try {
            const entityId = getEntityId();
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (entityId) headers['X-Entity-Id'] = entityId;
            const response = await fetch('/api/contacts/request', {
                method: 'POST', headers, body: JSON.stringify({ recipientEntityId })
            });
            if (!response.ok) throw new Error(await response.text() || 'Failed to send contact request');
            const data = await response.json();
            return data.contact;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to send contact request';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [session?.user?.id]);

    const acceptContact = useCallback(async (contactId: string): Promise<Contact> => {
        if (!session?.user?.id) throw new Error('No authentication token available');
        setIsLoading(true);
        setError(null);
        try {
            const entityId = getEntityId();
            const headers: HeadersInit = { 'Content-Type': 'application/json' };
            if (entityId) headers['X-Entity-Id'] = entityId;
            const response = await fetch(`/api/contacts/accept/${contactId}`, { method: 'POST', headers });
            if (!response.ok) throw new Error(await response.text() || 'Failed to accept contact request');
            const data = await response.json();
            return data.contact;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to accept contact request';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [session?.user?.id]);

    const rejectContact = useCallback(async (contactId: string): Promise<Contact> => {
        if (!session?.user?.id) throw new Error('No authentication token available');
        setIsLoading(true);
        setError(null);
        try {
            const entityId = getEntityId();
            const headers: HeadersInit = {};
            if (entityId) headers['X-Entity-Id'] = entityId;
            const response = await fetch(`/api/contacts/reject/${contactId}`, { method: 'POST', headers });
            if (!response.ok) throw new Error(await response.text() || 'Failed to reject contact request');
            const data = await response.json();
            return data.contact;
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to reject contact request';
            setError(errorMessage);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [session?.user?.id]);

    return { fetchContacts, sendContactRequest, acceptContact, rejectContact, isLoading, error };
}
