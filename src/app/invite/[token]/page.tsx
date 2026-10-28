'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useInvites } from '@/hooks/useInvites';
import { useProfileStore } from '@/store/useProfileStore';
import type { Invite } from '@/types/invite';
import { AlertTriangle, CheckCircle2, Clock3, Mail, XCircle } from 'lucide-react';

/**
 * Invite Acceptance Page
 * Implements BUILD_PLAN Week 3, Task 3.8
 * 
 * Flow:
 * 1. Fetch invite details (GET /api/invites/:token)
 * 2. If not authenticated → redirect to sign in
 * 3. If authenticated but no entity:
 *    - Check if user owns entity
 *    - If not: redirect to onboarding (enforce type)
 * 4. If authenticated with entity:
 *    - Check entity type matches
 *    - Show "Accept Invite" button
 *    - On accept: POST /api/invites/:token/accept
 *    ⚠️  Contact is AUTO-CREATED as accepted (not pending)
 */
export default function InviteAcceptancePage() {
    const params = useParams();
    const router = useRouter();
    const { data: session, status: authStatus } = useSession();
    const { activeProfile } = useProfileStore();
    const { fetchInvite, acceptInvite, isLoading, error } = useInvites();
    
    const [invite, setInvite] = useState<Invite | null>(null);
    const [accepting, setAccepting] = useState(false);
    const [accepted, setAccepted] = useState(false);
    
    const token = params.token as string;

    // Fetch invite details
    useEffect(() => {
        const loadInvite = async () => {
            try {
                const inviteData = await fetchInvite(token);
                setInvite(inviteData);
                
                // Check if already accepted
                if (inviteData.status === 'accepted') {
                    setAccepted(true);
                }
            } catch (err) {
                console.error('Failed to fetch invite:', err);
            }
        };

        if (token) {
            loadInvite();
        }
    }, [token, fetchInvite]);

    // Handle authentication redirect
    useEffect(() => {
        if (authStatus === 'unauthenticated') {
            // Redirect to sign in with callback
            router.push(`/api/auth/signin?callbackUrl=/invite/${token}`);
        }
    }, [authStatus, token, router]);

    // Handle onboarding redirect
    useEffect(() => {
        if (authStatus === 'authenticated' && !activeProfile && invite) {
            // Redirect to onboarding with invite context
            router.push(`/onboarding?invite=${token}`);
        }
    }, [authStatus, activeProfile, invite, token, router]);

    const handleAcceptInvite = async () => {
        if (!activeProfile || !invite) {
            return;
        }

        setAccepting(true);
        try {
            await acceptInvite(token, { entityId: activeProfile.id });
            setAccepted(true);
            
            // Redirect after short delay
            setTimeout(() => {
                if (invite.inviteType === 'show_invite' && invite.showId) {
                    router.push(`/shows/${invite.showId}`);
                } else {
                    router.push('/contacts');
                }
            }, 2000);
        } catch (err) {
            console.error('Failed to accept invite:', err);
        } finally {
            setAccepting(false);
        }
    };

    // Loading state
    if (authStatus === 'loading' || isLoading || !invite) {
        return (
            <div className="container max-w-2xl mx-auto px-5 py-12">
                <div className="text-center">
                    <div className="inline-block animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
                    <p className="text-text-tertiary">Loading invite...</p>
                </div>
            </div>
        );
    }

    // Expired invite
    if (invite.status === 'expired' || new Date(invite.expiresAt) < new Date()) {
        return (
            <div className="container max-w-2xl mx-auto px-5 py-12">
                <div className="bg-destructive/10 border border-destructive rounded-lg p-8 text-center">
                    <Clock3 className="mx-auto mb-4 h-10 w-10 text-destructive" />
                    <h1 className="text-2xl font-bold mb-2">Invite Expired</h1>
                    <p className="text-text-tertiary">
                        This invite link has expired. Please contact the person who sent it to request a new one.
                    </p>
                </div>
            </div>
        );
    }

    // Cancelled invite
    if (invite.status === 'cancelled') {
        return (
            <div className="container max-w-2xl mx-auto px-5 py-12">
                <div className="bg-destructive/10 border border-destructive rounded-lg p-8 text-center">
                    <XCircle className="mx-auto mb-4 h-10 w-10 text-destructive" />
                    <h1 className="text-2xl font-bold mb-2">Invite Cancelled</h1>
                    <p className="text-text-tertiary">
                        This invite has been cancelled by the sender.
                    </p>
                </div>
            </div>
        );
    }

    // Already accepted (success state)
    if (accepted || invite.status === 'accepted') {
        return (
            <div className="container max-w-2xl mx-auto px-5 py-12">
                <div className="bg-semantic-success/10 dark:bg-semantic-success/10 border border-semantic-success/30 dark:border-semantic-success/30 rounded-lg p-8 text-center">
                    <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-semantic-success" />
                    <h1 className="text-2xl font-bold mb-2 text-semantic-success dark:text-semantic-success">Invite Accepted!</h1>
                    <p className="text-text-tertiary mb-4">
                        You've successfully accepted the invite. {invite.inviteType === 'show_invite' ? 'Redirecting to show...' : 'Redirecting to contacts...'}
                    </p>
                </div>
            </div>
        );
    }

    // Entity type mismatch
    if (activeProfile && invite.requiredEntityType !== 'any' && 
        activeProfile.entityType !== invite.requiredEntityType) {
        return (
            <div className="container max-w-2xl mx-auto px-5 py-12">
                <div className="bg-semantic-warning/10 dark:bg-semantic-warning/10 border border-semantic-warning/30 dark:border-semantic-warning/30 rounded-lg p-8 text-center">
                    <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-semantic-warning" />
                    <h1 className="text-2xl font-bold mb-2">Wrong Entity Type</h1>
                    <p className="text-text-tertiary">
                        This invite requires a <strong>{invite.requiredEntityType}</strong> entity, but you are signed in as a <strong>{activeProfile.entityType}</strong>.
                    </p>
                    <p className="text-sm text-text-tertiary mt-4">
                        Please contact the person who sent this invite.
                    </p>
                </div>
            </div>
        );
    }

    // Ready to accept
    return (
        <div className="container max-w-2xl mx-auto px-5 py-12">
            <div className="border border-border-subtle rounded-lg p-8">
                <div className="text-center mb-8">
                    <Mail className="mx-auto mb-4 h-10 w-10 text-primary" />
                    <h1 className="text-2xl font-bold mb-2">You've Been Invited!</h1>
                    <p className="text-text-tertiary">
                        {invite.inviteType === 'show_invite' 
                            ? 'You\'ve been invited to collaborate on a show' 
                            : 'You\'ve been invited to connect'}
                    </p>
                </div>

                <div className="bg-surface-elevated rounded-lg p-6 mb-6">
                    <div className="space-y-3">
                        <div>
                            <p className="text-sm text-text-tertiary">Invite Type</p>
                            <p className="font-medium capitalize">
                                {invite.inviteType.replace('_', ' ')}
                            </p>
                        </div>
                        {invite.requiredEntityType !== 'any' && (
                            <div>
                                <p className="text-sm text-text-tertiary">Required Type</p>
                                <p className="font-medium capitalize">{invite.requiredEntityType}</p>
                            </div>
                        )}
                        {invite.recipientEmail && (
                            <div>
                                <p className="text-sm text-text-tertiary">Sent to</p>
                                <p className="font-medium">{invite.recipientEmail}</p>
                            </div>
                        )}
                        <div>
                            <p className="text-sm text-text-tertiary">Expires</p>
                            <p className="font-medium">
                                {new Date(invite.expiresAt).toLocaleDateString()}
                            </p>
                        </div>
                    </div>
                </div>

                {activeProfile && (
                    <div className="mb-6">
                        <p className="text-sm text-text-tertiary mb-2">Accepting as:</p>
                        <div className="bg-background border border-border-subtle rounded-lg p-4">
                            <p className="font-medium">{activeProfile.name}</p>
                            <p className="text-sm text-text-tertiary capitalize">
                                {activeProfile.entityType}
                            </p>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {error && (
                        <div className="p-4 bg-destructive/10 border border-destructive text-destructive text-sm rounded-lg">
                            {error}
                        </div>
                    )}

                    <button
                        onClick={handleAcceptInvite}
                        disabled={accepting || !activeProfile}
                        className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
                    >
                        {accepting ? 'Accepting...' : 'Accept Invite'}
                    </button>

                    <p className="text-xs text-center text-text-tertiary">
                        By accepting this invite, a contact connection will be automatically created.
                        {invite.inviteType === 'show_invite' && ' You will also be added to the show.'}
                    </p>
                </div>
            </div>
        </div>
    );
}
