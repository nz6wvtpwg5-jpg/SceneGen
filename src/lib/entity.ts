/**
 * Get the current user's entity ID from the profile store
 * This reads from the Zustand store which persists the active profile
 */
export function getEntityId(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // Get from profile-storage (Zustand persist)
    const profileStorage = localStorage.getItem('profile-storage');

    if (profileStorage) {
      const parsed = JSON.parse(profileStorage);
      const activeProfile = parsed?.state?.activeProfile;

      if (activeProfile?.id) {
        return activeProfile.id;
      }
    }
  } catch (error) {
    // Silent fail - no logging
  }

  // Clean up old test entity ID if it exists
  const oldEntityId = localStorage.getItem('entityId');
  if (oldEntityId === 'test-entity-123') {
    localStorage.removeItem('entityId');
  }

  return null;
}

/**
 * Set the entity ID in localStorage
 */
export function setEntityId(entityId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('entityId', entityId);
}

/**
 * Clear the entity ID from localStorage
 */
export function clearEntityId(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('entityId');
}
