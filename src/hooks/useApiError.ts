'use client';

import { useState } from 'react';

/**
 * Week 3, Task 3.10: API Error Handler
 * 
 * Provides standardized error handling for API calls
 * - Catches 403 errors and shows trial expiry messaging
 * - Shows "Contact support" for upgrade
 */
export function useApiError() {
  const [error, setError] = useState<string | null>(null);
  const [isTrialExpired, setIsTrialExpired] = useState(false);

  const handleError = async (response: Response) => {
    if (response.status === 403) {
      // Check if it's a trial expiry error
      try {
        const errorData = await response.json();
        if (errorData.error?.toLowerCase().includes('trial') || 
            errorData.error?.toLowerCase().includes('expired') ||
            errorData.error?.toLowerCase().includes('subscription')) {
          setIsTrialExpired(true);
          setError('Your trial has expired. Please contact support@scenegen.com to upgrade your account.');
          return;
        }
      } catch (e) {
        // If parsing fails, fall through to generic error
      }
      
      setError('Access denied. You may not have permission to perform this action.');
    } else {
      try {
        const errorData = await response.json();
        setError(errorData.error || `Request failed with status ${response.status}`);
      } catch (e) {
        setError(`Request failed with status ${response.status}`);
      }
    }
  };

  const clearError = () => {
    setError(null);
    setIsTrialExpired(false);
  };

  return {
    error,
    isTrialExpired,
    handleError,
    clearError,
  };
}
