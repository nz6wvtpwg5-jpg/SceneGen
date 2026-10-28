'use client';

import { useState } from 'react';
import { useInvites } from '@/hooks/useInvites';
import type { InviteType, EntityType } from '@/types/invite';
import { copyText } from '@/lib/clipboard';

interface GenerateInviteProps {
    inviteType?: InviteType;
    showId?: string;
    onGenerated?: (url: string) => void;
    onConfigured?: (configuration: PromoterInviteConfiguration) => void;
}

export type PromoterInviteConfiguration = {
    email: string;
    editScope: 'none' | 'advance' | 'full';
    financialAccess: 'hidden' | 'view' | 'edit';
    expiresInDays: number;
    requireApproval: boolean;
};

/**
 * GenerateInvite Component
 * Implements BUILD_PLAN Week 3, Task 3.7
 * Features:
 * - Select invite type (contact or show)
 * - Select required entity type
 * - Optional: recipient email
 * - Generate button → show URL
 * - Copy to clipboard
 */
export default function GenerateInvite({
    inviteType: defaultInviteType,
    showId,
    onGenerated,
    onConfigured
}: GenerateInviteProps) {
    const { createInvite, isLoading, error } = useInvites();
    const [inviteType, setInviteType] = useState<InviteType>(defaultInviteType || 'contact_invite');
    const [requiredEntityType, setRequiredEntityType] = useState<EntityType>('any');
    const [recipientEmail, setRecipientEmail] = useState('');
    const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [editScope, setEditScope] = useState<PromoterInviteConfiguration['editScope']>('advance');
    const [financialAccess, setFinancialAccess] = useState<PromoterInviteConfiguration['financialAccess']>('hidden');
    const [expiresInDays, setExpiresInDays] = useState(30);
    const [requireApproval, setRequireApproval] = useState(true);
    const [configured, setConfigured] = useState(false);

    const handleGenerate = async () => {
        const email = recipientEmail.trim().toLowerCase();
        if (inviteType === 'show_invite' && !/^\S+@\S+\.\S+$/.test(email)) return;
        if (inviteType === 'show_invite' && !showId && onConfigured) {
            onConfigured({ email, editScope, financialAccess, expiresInDays, requireApproval });
            setConfigured(true);
            return;
        }
        try {
            const result = await createInvite({
                type: inviteType,
                requiredEntityType,
                showId: inviteType === 'show_invite' ? showId : undefined,
                recipientEmail: recipientEmail || undefined
            });

            const fullUrl = `${window.location.origin}${result.url}`;
            setGeneratedUrl(fullUrl);

            if (onGenerated) {
                onGenerated(fullUrl);
            }
        } catch (err) {
            console.error('Failed to generate invite:', err);
        }
    };

    const handleCopy = async () => {
        if (generatedUrl) {
            try {
                if (!(await copyText(generatedUrl))) throw new Error('Clipboard unavailable');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            } catch (err) {
                console.error('Failed to copy:', err);
            }
        }
    };

    const handleReset = () => {
        setGeneratedUrl(null);
        setRecipientEmail('');
        setCopied(false);
    };

    if (generatedUrl) {
        return (
            <div className="space-y-4">
                <div>
                    <h3 className="text-lg font-semibold mb-2">Invite Generated!</h3>
                    <p className="text-sm text-text-tertiary mb-4">
                        Share this link with the person you want to invite:
                    </p>
                </div>

                <div className="flex gap-2">
                    <input
                        type="text"
                        value={generatedUrl}
                        readOnly
                        className="flex-1 px-3 py-2 border border-border-subtle rounded-lg bg-surface-elevated"
                    />
                    <button
                        type="button"
                        onClick={handleCopy}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                    >
                        {copied ? 'Copied!' : 'Copy'}
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleReset}
                    className="text-sm text-text-tertiary hover:text-foreground"
                >
                    Generate another invite
                </button>
            </div>
        );
    }

    if (configured) {
        return <div className="rounded-2xl border border-[#a9c46b] bg-[#f1f6df] p-5"><p className="font-black text-[#30381b]">Promoter access prepared</p><p className="mt-2 text-sm text-[#596044]">The email-bound invitation will be created after this show is saved.</p><button type="button" onClick={() => setConfigured(false)} className="mt-3 text-sm font-bold underline">Change access</button></div>;
    }

    return (
        <div className="space-y-4">
            {!defaultInviteType && (
                <div>
                    <label className="block text-sm font-medium mb-2">Invite Type</label>
                    <select
                        value={inviteType}
                        onChange={(e) => setInviteType(e.target.value as InviteType)}
                        className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                    >
                        <option value="contact_invite">Contact Invite</option>
                        <option value="show_invite">Show Invite</option>
                    </select>
                </div>
            )}

            {inviteType !== 'show_invite' && <div>
                <label className="block text-sm font-medium mb-2">Required Entity Type</label>
                <select
                    value={requiredEntityType}
                    onChange={(e) => setRequiredEntityType(e.target.value as EntityType)}
                    className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                >
                    <option value="any">Any</option>
                    <option value="artist">Artist</option>
                    <option value="promoter">Promoter</option>
                </select>
            </div>}

            <div>
                <label className="block text-sm font-medium mb-2">
                    Recipient email
                </label>
                <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 border border-border-subtle rounded-lg"
                />
                <p className="text-xs text-text-tertiary mt-1">
                    The invitation will only work when they sign in using this address.
                </p>
            </div>

            {inviteType === 'show_invite' && <>
                <div><label className="block text-sm font-medium mb-2">Day-sheet access</label><select value={editScope} onChange={(e) => setEditScope(e.target.value as PromoterInviteConfiguration['editScope'])} className="w-full px-3 py-3 border border-border-subtle rounded-lg bg-white"><option value="advance">Edit advance information</option><option value="none">View only</option><option value="full">Edit the entire day sheet</option></select><p className="mt-1 text-xs text-text-tertiary">Advance access covers venue, contact, schedule and operational notes.</p></div>
                <div><label className="block text-sm font-medium mb-2">Financial access</label><select value={financialAccess} onChange={(e) => setFinancialAccess(e.target.value as PromoterInviteConfiguration['financialAccess'])} className="w-full px-3 py-3 border border-border-subtle rounded-lg bg-white"><option value="hidden">Financial details hidden</option><option value="view">Can view financial details</option><option value="edit">Can view and edit financial details</option></select></div>
                <div><label className="block text-sm font-medium mb-2">Access expires</label><select value={expiresInDays} onChange={(e) => setExpiresInDays(Number(e.target.value))} className="w-full px-3 py-3 border border-border-subtle rounded-lg bg-white"><option value={7}>After 7 days</option><option value={14}>After 14 days</option><option value={30}>After 30 days</option><option value={90}>After 90 days</option><option value={365}>After one year</option></select></div>
                {editScope !== 'none' && <label className="flex items-start gap-3 rounded-2xl border border-[#d8d0c3] bg-white p-4"><input type="checkbox" checked={requireApproval} onChange={(e) => setRequireApproval(e.target.checked)} className="mt-1 h-5 w-5 accent-[#ff5738]"/><span><strong className="block">Approve sensitive changes</strong><span className="mt-1 block text-xs text-text-tertiary">Venue, timings, status and financial changes wait for an administrator before going live.</span></span></label>}
                <div className="rounded-2xl border border-[#d8d0c3] bg-[#f4ede2] p-4 text-sm text-[#4f4a42]"><strong>{recipientEmail || 'This promoter'}</strong> will only have access to this show. They {editScope === 'none' ? 'can view but not edit the day sheet' : editScope === 'advance' ? 'can edit advance information' : 'can edit the entire day sheet'}; financial details are {financialAccess === 'hidden' ? 'hidden' : financialAccess === 'view' ? 'view only' : 'editable'}{editScope !== 'none' && requireApproval ? '; sensitive changes require your approval' : ''}.</div>
            </>}

            {error && (
                <div className="p-3 bg-destructive/10 border border-destructive text-destructive text-sm rounded-lg">
                    {error}
                </div>
            )}

            <button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading || (inviteType === 'show_invite' && !/^\S+@\S+\.\S+$/.test(recipientEmail.trim()))}
                className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
            >
                {isLoading ? 'Generating...' : inviteType === 'show_invite' && !showId ? 'Use these access settings' : 'Generate Invite Link'}
            </button>
        </div>
    );
}
