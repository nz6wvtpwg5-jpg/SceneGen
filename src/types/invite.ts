/**
 * Invite Type Definitions
 * Implements BUILD_PLAN Week 3, Task 3.2
 * Based on Invite model schema from Week 3, Task 3.2
 */

export type InviteType = 'contact_invite' | 'show_invite';

export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';

export type EntityType = 'artist' | 'promoter' | 'any';

export interface Invite {
    token: string;
    invitingEntityId: string;
    requiredEntityType: EntityType;
    inviteType: InviteType;
    showId?: string;
    recipientEmail?: string;
    expiresAt: string;
    acceptedAt?: string;
    acceptedBy?: string;
    status: InviteStatus;
    createdAt: string;
    // Optional expanded fields (may be populated by backend)
    inviterName?: string;
    inviterType?: EntityType;
}

export interface CreateInviteInput {
    type: InviteType;
    requiredEntityType: EntityType;
    showId?: string;
    recipientEmail?: string;
}

export interface InviteResponse {
    token: string;
    url: string;
}

export interface AcceptInviteInput {
    entityId: string;
}
