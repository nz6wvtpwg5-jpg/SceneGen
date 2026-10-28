'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlacesAutocomplete } from '@/components/maps/PlacesAutocomplete';
import { Loader2, Check, MapPin, AlertCircle } from 'lucide-react';
import { useProfileStore } from '@/store/useProfileStore';
import { toast } from 'sonner';

interface Show {
  id: string;
  date: string;
  venueName: string;
  venueAddress: string | null;
  city: string;
  state: string | null;
  country: string | null;
  venueLat: number | null;
  venueLng: number | null;
}

export default function BulkUpdateVenuePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { activeProfile } = useProfileStore();
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [addressValues, setAddressValues] = useState<Map<string, string>>(new Map());
  const [addresses, setAddresses] = useState<Map<string, any>>(new Map());
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (status === 'loading') return;

    if (!session || !activeProfile?.id) {
      setLoading(false);
      return;
    }

    fetchShows();
  }, [session, activeProfile, status]);

  const fetchShows = async () => {
    try {
      const entityId = activeProfile?.id || '';

      console.log('🔍 Fetching shows with:', {
        entityId,
        hasSession: !!session,
        hasToken: !!session?.user?.id
      });

      const response = await fetch(`/api/shows`, {
        headers: {
          'X-Entity-Id': entityId,
        },
      });

      console.log('📡 Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error('Failed to fetch shows');
      }

      const data = await response.json();

      console.log(`✅ Fetched ${data.length} total shows`);

      // Filter to shows that need addresses
      const needsAddress = data.filter((show: Show) =>
        !show.venueAddress || show.venueAddress === 'TBD' || !show.venueLat || !show.venueLng
      );

      console.log(`📍 ${needsAddress.length} shows need addresses`);

      setShows(needsAddress);
    } catch (error) {
      console.error('Error fetching shows:', error);
      toast.error('Failed to fetch shows');
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = (
    address: string,
    lat: number,
    lng: number,
    name?: string,
    city?: string,
    state?: string,
    country?: string
  ) => {
    const currentShow = shows[currentIndex];
    if (!currentShow) return;

    setAddressValues(prev => new Map(prev).set(currentShow.id, address));
    setAddresses(prev => new Map(prev).set(currentShow.id, {
      address,
      lat,
      lng,
      name,
      city,
      state,
      country
    }));
    console.log(`Address selected for show ${currentIndex}:`, { address, lat, lng, name, city, state, country });
  };

  const handleSaveAndNext = async () => {
    const currentShow = shows[currentIndex];
    if (!currentShow) return;

    const addressData = addresses.get(currentShow.id);
    if (!addressData) {
      toast.error('Please select a venue address first');
      return;
    }

    try {
      setSaving(true);
      const entityId = activeProfile?.id || '';

      const response = await fetch(`/api/shows/${currentShow.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Entity-Id': entityId,
        },
        body: JSON.stringify({
          venueAddress: addressData.address,
          latitude: addressData.lat,
          longitude: addressData.lng,
          city: addressData.city || currentShow.city,
          state: addressData.state || currentShow.state,
          country: addressData.country || currentShow.country,
        }),
      });

      if (!response.ok) throw new Error('Failed to update show');

      setCompletedIds(prev => new Set(prev).add(currentShow.id));
      toast.success(`Updated ${currentShow.venueName}`);

      // Move to next show
      if (currentIndex < shows.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        toast.success('All venues updated!');
        router.push('/tours');
      }
    } catch (error) {
      console.error('Error updating show:', error);
      toast.error('Failed to update venue');
    } finally {
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (currentIndex < shows.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      router.push('/tours');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (shows.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <Check className="h-16 w-16 text-semantic-success mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">All Venues Updated!</h2>
          <p className="text-text-tertiary mb-4">
            All your shows have venue addresses and coordinates.
          </p>
          <Button onClick={() => router.push('/tours')}>
            Back to Tours
          </Button>
        </Card>
      </div>
    );
  }

  const currentShow = shows[currentIndex];
  const progress = ((currentIndex + 1) / shows.length) * 100;
  const hasAddress = addresses.has(currentShow.id);
  const isCompleted = completedIds.has(currentShow.id);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Update Venue Addresses</h1>
        <p className="text-text-tertiary">
          Add venue addresses and coordinates to your shows ({currentIndex + 1} of {shows.length})
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between text-sm text-text-tertiary mb-2">
          <span>Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Current Show Card */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">{currentShow.venueName}</h2>
            <p className="text-text-tertiary">
              {new Date(currentShow.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
            <p className="text-sm text-text-tertiary mt-1">
              {currentShow.city}{currentShow.state ? `, ${currentShow.state}` : ''}
            </p>
          </div>
          {isCompleted && (
            <div className="flex items-center gap-2 text-semantic-success">
              <Check className="h-5 w-5" />
              <span className="text-sm font-medium">Saved</span>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Search for venue address
            </label>
            <PlacesAutocomplete
              value={addressValues.get(currentShow.id) || ''}
              onChange={handleAddressChange}
              placeholder={`Search for ${currentShow.venueName || currentShow.city || 'venue'}...`}
            />
          </div>

          {hasAddress && (
            <div className="state-success-subtle rounded-lg p-4">
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-semantic-success mt-0.5" />
                <div>
                  <p className="font-medium text-text-primary">
                    {addresses.get(currentShow.id)?.name || currentShow.venueName || currentShow.city || 'Location TBC'}
                  </p>
                  <p className="text-sm text-text-secondary">
                    {addresses.get(currentShow.id)?.address}
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">
                    {addresses.get(currentShow.id)?.city}, {addresses.get(currentShow.id)?.state}
                  </p>
                </div>
              </div>
            </div>
          )}

          {!hasAddress && !isCompleted && (
            <div className="state-warning-subtle rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-semantic-warning mt-0.5" />
                <div>
                  <p className="text-sm text-text-primary">
                    Please search for and select the venue address using the search box above.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentIndex === 0 || saving}
        >
          Previous
        </Button>

        <Button
          variant="outline"
          onClick={handleSkip}
          disabled={saving}
        >
          Skip
        </Button>

        <div className="flex-1" />

        <Button
          onClick={handleSaveAndNext}
          disabled={!hasAddress || saving}
          className="min-w-[120px]"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving...
            </>
          ) : currentIndex === shows.length - 1 ? (
            'Save & Finish'
          ) : (
            'Save & Next'
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-3 gap-4">
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-semantic-success">{completedIds.size}</p>
          <p className="text-sm text-text-tertiary">Completed</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold text-accent-blue">{shows.length - completedIds.size}</p>
          <p className="text-sm text-text-tertiary">Remaining</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-2xl font-bold">{shows.length}</p>
          <p className="text-sm text-text-tertiary">Total</p>
        </Card>
      </div>
    </div>
  );
}
