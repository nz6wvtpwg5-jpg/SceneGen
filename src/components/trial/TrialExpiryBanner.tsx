'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useProfileStore } from '@/store/useProfileStore';

/**
 * Week 3, Task 3.10: Trial Expiry Banner
 * 
 * Shows a banner when user's trial is about to expire or has expired.
 * - Warning if < 7 days remaining
 * - Error if expired
 * - Shows "Contact support" message
 */
export function TrialExpiryBanner() {
  const { data: session } = useSession();
  const { activeProfile } = useProfileStore();
  const [trialStatus, setTrialStatus] = useState<{
    isExpired: boolean;
    daysRemaining: number | null;
    expiresAt: Date | null;
  } | null>(null);

  useEffect(() => {
    if (!activeProfile?.trialEndsAt) {
      setTrialStatus(null);
      return;
    }

    const expiresAt = new Date(activeProfile.trialEndsAt);
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const isExpired = daysRemaining <= 0;

    setTrialStatus({
      isExpired,
      daysRemaining: isExpired ? null : daysRemaining,
      expiresAt,
    });
  }, [activeProfile?.trialEndsAt]);

  if (!trialStatus) {
    return null;
  }

  // Expired trial
  if (trialStatus.isExpired) {
    return (
      <div className="bg-semantic-error/10 dark:bg-semantic-error/10 border-l-4 border-semantic-error p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-semantic-error" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-semantic-error dark:text-semantic-error">
              Trial Expired
            </h3>
            <div className="mt-2 text-sm text-semantic-error dark:text-semantic-error">
              <p>
                Your trial has expired. Some features may be limited until you upgrade to a paid plan.
              </p>
              <p className="mt-2">
                Please <a href="mailto:support@scenegen.com" className="font-medium underline">contact support</a> to upgrade your account.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Warning if < 7 days remaining
  if (trialStatus.daysRemaining !== null && trialStatus.daysRemaining <= 7) {
    return (
      <div className="bg-semantic-warning/10 dark:bg-semantic-warning/10 border-l-4 border-semantic-warning p-4 mb-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-semantic-warning" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-semantic-warning dark:text-semantic-warning">
              Trial Ending Soon
            </h3>
            <div className="mt-2 text-sm text-semantic-warning dark:text-semantic-warning">
              <p>
                Your trial expires in <strong>{trialStatus.daysRemaining} day{trialStatus.daysRemaining !== 1 ? 's' : ''}</strong>.
              </p>
              <p className="mt-2">
                <a href="mailto:support@scenegen.com" className="font-medium underline">Contact support</a> to upgrade and continue using all features.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
