'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useProfileStore } from '@/store/useProfileStore';
import { ImportWizard } from './components/ImportWizard';

/**
 * CSV Import Page
 * Allows importing shows and budgets from CSV files
 */
function ImportPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session, status } = useSession();
  const { activeProfile } = useProfileStore();

  // Read URL parameters for existing tour context
  const tourIdParam = searchParams.get('tourId');
  const tourNameParam = searchParams.get('tourName');
  const mode = searchParams.get('mode'); // 'add-single-show' or undefined

  // Check if user is an artist
  const isArtist = activeProfile?.entityType === 'artist' ||
    (activeProfile as any)?.entity_type === 'artist';

  const isLoadingAuth = status === 'loading' || (!activeProfile && status === 'authenticated');

  if (isLoadingAuth) {
    return (
      <div className="scene-page">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-text-secondary">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isArtist) {
    return (
      <div className="scene-page">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-2xl font-bold mb-2">Artist Feature Only</h2>
          <p className="text-text-secondary">
            CSV import is available for artist profiles only.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="scene-page">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {mode === 'add-single-show'
              ? `Add Show to ${tourNameParam || 'Tour'}`
              : tourIdParam
                ? `Add Shows to ${tourNameParam || 'Tour'}`
                : 'Import Shows & Budgets'}
          </h1>
          <p className="text-text-secondary">
            {mode === 'add-single-show'
              ? 'Add a single show to this tour. The show will use the same budget structure as existing shows.'
              : tourIdParam
                ? 'Import additional shows from a spreadsheet, document, screenshot or pasted schedule.'
                : 'Bring over an existing tour from a spreadsheet, Master Tour export, document, screenshot or pasted email. You will preview everything before saving.'}
          </p>
        </div>

        <ImportWizard
          entityId={activeProfile?.id || ''}
          existingTourId={tourIdParam || undefined}
          existingTourName={tourNameParam || undefined}
          mode={mode || undefined}
        />
      </div>
    </div>
  );
}

export default function ImportPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <ImportPageContent />
    </Suspense>
  );
}
