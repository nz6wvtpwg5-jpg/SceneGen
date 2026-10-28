'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { copyText } from '@/lib/clipboard';

interface ShareShowModalProps {
  isOpen: boolean;
  onClose: () => void;
  showId: string;
  showName: string;
  entityId: string;
}

export default function ShareShowModal({
  isOpen,
  onClose,
  showId,
  showName,
  entityId
}: ShareShowModalProps) {
  const [email, setEmail] = useState('');
  const [canEdit, setCanEdit] = useState(true); // Default to true (edit enabled)
  const [expiresInDays, setExpiresInDays] = useState(30);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`/api/shows/${showId}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Entity-Id': entityId,
        },
        body: JSON.stringify({
          email,
          canEdit,
          expiresInDays
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create share link');
      }

      const data = await response.json();
      setShareUrl(data.shareUrl);
      toast.success('Share link created! Send this link to the recipient.');
    } catch (error) {
      console.error('Error creating share:', error);
      toast.error('Failed to create share link');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = async () => {
    if (shareUrl) {
      if (!(await copyText(shareUrl))) {
        toast.error('Could not copy the link. Press and hold the link to copy it.');
        return;
      }
      setCopied(true);
      toast.success('Link copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setEmail('');
    setShareUrl(null);
    setCopied(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="mobile-safe-top mobile-safe-bottom fixed inset-0 z-50 overflow-y-auto bg-black/50 p-0 sm:flex sm:items-center sm:justify-center sm:p-4">
      <div className="min-h-[100dvh] w-full overflow-y-auto border border-border-subtle bg-background p-5 sm:min-h-0 sm:max-h-[calc(100dvh-2rem)] sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Share Show</h2>
            <p className="text-text-secondary text-sm mt-1">{showName}</p>
          </div>
          <button type="button"
            onClick={handleClose}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5 shrink-0"><path d="m6 6 12 12M18 6 6 18" /></svg><span>Close</span>
          </button>
        </div>

        {!shareUrl ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Recipient Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@venue.com"
                className="w-full px-4 py-3 bg-surface-elevated border border-border-subtle rounded-xl text-foreground placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan/50 transition-all"
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="canEdit"
                checked={canEdit}
                onChange={(e) => setCanEdit(e.target.checked)}
                className="w-4 h-4 rounded border-border-subtle bg-surface-elevated text-accent-cyan focus:ring-2 focus:ring-accent-cyan/50"
              />
              <label htmlFor="canEdit" className="text-sm text-foreground">
                Allow recipient to edit show details
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Link Expires In
              </label>
              <select
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(Number(e.target.value))}
                className="w-full px-4 py-3 bg-surface-elevated border border-border-subtle rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 focus:border-accent-cyan/50 transition-all"
              >
                <option value={7}>7 days</option>
                <option value={14}>14 days</option>
                <option value={30}>30 days</option>
                <option value={60}>60 days</option>
                <option value={90}>90 days</option>
              </select>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleShare}
                disabled={isLoading}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ff5a36] via-[#f05a32] to-[#c8f135] text-foreground rounded-xl font-semibold hover:shadow-glow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Share Link'}
              </button>
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-surface-elevated border border-border-subtle text-foreground rounded-xl font-semibold hover:bg-surface-hover transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Share Link
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-4 py-3 bg-surface-elevated border border-border-subtle rounded-xl text-foreground font-mono text-sm"
                />
                <button
                  onClick={handleCopy}
                  className="px-4 py-3 bg-accent-cyan/20 border border-accent-cyan/30 text-accent-cyan rounded-xl font-semibold hover:bg-accent-cyan/30 transition-all"
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
            </div>

            <div className="p-4 bg-surface-elevated rounded-xl border border-border-subtle">
              <p className="text-sm text-text-secondary">
                <strong>Email sent to:</strong> {email}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                <strong>Permissions:</strong> {canEdit ? 'Can view and edit' : 'View only'}
              </p>
              <p className="text-sm text-text-secondary mt-1">
                <strong>Expires:</strong> {expiresInDays} days from now
              </p>
            </div>

            <button
              onClick={handleClose}
              className="w-full px-6 py-3 bg-gradient-to-r from-[#ff5a36] via-[#f05a32] to-[#c8f135] text-foreground rounded-xl font-semibold hover:shadow-glow-lg hover:scale-[1.02] transition-all"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
