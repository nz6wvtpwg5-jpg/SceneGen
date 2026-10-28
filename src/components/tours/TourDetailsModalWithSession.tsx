'use client';
import { useProfileStore } from '@/store/useProfileStore';
import { TourDetailsModal } from './TourDetailsModal';

interface TourDetailsModalWithSessionProps {
  tourId: string;
  open: boolean;
  onClose: () => void;
}

/**
 * Wrapper component that provides session context to TourDetailsModal
 * Use this when you don't have access to session/entity data
 */
export function TourDetailsModalWithSession({
  tourId,
  open,
  onClose
}: TourDetailsModalWithSessionProps) {
  const { activeProfile } = useProfileStore();

  return (
    <TourDetailsModal
      tourId={tourId}
      open={open}
      onClose={onClose}
      entityId={activeProfile?.id}
    />
  );
}
