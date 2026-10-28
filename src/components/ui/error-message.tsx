'use client';

import React from 'react';

interface ErrorMessageProps {
  error: string | null;
  isTrialExpired?: boolean;
  className?: string;
}

/**
 * Week 3, Task 3.10: Error Message Component
 * 
 * Displays error messages with special styling for trial expiry
 */
export function ErrorMessage({ error, isTrialExpired = false, className = '' }: ErrorMessageProps) {
  if (!error) return null;

  if (isTrialExpired) {
    return (
      <div className={`bg-semantic-error/10 dark:bg-semantic-error/10 border-l-4 border-semantic-error p-4 rounded ${className}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-semantic-error" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-semantic-error dark:text-semantic-error">
              Trial Expired
            </h3>
            <div className="mt-2 text-sm text-semantic-error dark:text-semantic-error">
              <p>{error}</p>
              <p className="mt-2">
                Please <a href="mailto:support@scenegen.com" className="font-medium underline">contact support</a> to upgrade your account and restore access.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-semantic-error/10 border border-semantic-error rounded-lg p-4 ${className}`}>
      <p className="text-semantic-error text-sm">{error}</p>
    </div>
  );
}
