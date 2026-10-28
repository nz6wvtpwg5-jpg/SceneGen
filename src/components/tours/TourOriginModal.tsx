'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin } from 'lucide-react';

interface TourOriginModalProps {
  open: boolean;
  onConfirm: (originCity: string, originState: string, originLat: number, originLng: number) => void;
  onSkip: () => void;
  tourName: string;
  firstShowCity?: string;
  firstShowState?: string;
}

export function TourOriginModal({
  open,
  onConfirm,
  onSkip,
  tourName,
  firstShowCity,
  firstShowState
}: TourOriginModalProps) {
  const [originAddress, setOriginAddress] = useState('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState('');

  const handleConfirm = async () => {
    if (!originAddress.trim()) {
      setError('Please enter a city');
      return;
    }

    setIsGeocoding(true);
    setError('');

    try {
      // Geocode the origin city
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(originAddress)}`);

      if (!response.ok) {
        throw new Error('Failed to geocode origin city');
      }

      const data = await response.json();

      if (!data.lat || !data.lng) {
        throw new Error('Could not find coordinates for this location');
      }

      // Extract city and state from the formatted address
      const parts = data.formattedAddress?.split(',') || [];
      const city = parts[0]?.trim() || originAddress;
      const state = parts[1]?.trim() || '';

      onConfirm(city, state, data.lat, data.lng);
    } catch (err) {
      console.error('Error geocoding origin:', err);
      setError(err instanceof Error ? err.message : 'Failed to geocode location');
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Where Does Your Tour Start?
          </DialogTitle>
          <DialogDescription>
            This will be used to calculate the distance to your first show.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="origin">Tour Start Location</Label>
            <Input
              id="origin"
              placeholder="e.g., Atlanta, GA or Los Angeles, CA"
              value={originAddress}
              onChange={(e) => {
                setOriginAddress(e.target.value);
                setError('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleConfirm();
                }
              }}
              disabled={isGeocoding}
            />
            {error && (
              <p className="text-sm text-semantic-error">{error}</p>
            )}
          </div>

          <div className="bg-surface-elevated p-3 rounded-md">
            <p className="text-sm text-text-tertiary">
              <strong>Tour:</strong> {tourName}
            </p>
            <p className="text-sm text-text-tertiary">
              <strong>First Show:</strong> {firstShowCity}, {firstShowState}
            </p>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isGeocoding}
            >
              Skip (Use First Show)
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isGeocoding || !originAddress.trim()}
            >
              {isGeocoding ? 'Geocoding...' : 'Confirm Start Location'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
