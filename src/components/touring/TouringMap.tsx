'use client';

import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { useSession } from 'next-auth/react';
import { useProfileStore } from '@/store/useProfileStore';
import MarkerPopup from './MarkerPopup';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface PromoterContact {
  entityId: string;
  name: string;
  city: string;
  state: string;
  country: string;
  latitude?: number;
  longitude?: number;
  showCount: number;
  shows: Array<{
    id: string;
    showDate: string;
    venueName: string;
    status: string;
    tourId?: string;
  }>;
}

interface TouringMapProps {
  selectedTourId: string | null;
  selectedPromoterId: string | null;
  onPromoterSelect: (promoterId: string | null) => void;
}

/**
 * MapController Component
 * Week 6, Task 6.9: Centers map on selected promoter
 */
function MapController({
  selectedPromoterId,
  promoters
}: {
  selectedPromoterId: string | null;
  promoters: PromoterContact[];
}) {
  const map = useMap();

  useEffect(() => {
    if (selectedPromoterId) {
      const promoter = promoters.find(p => p.entityId === selectedPromoterId);
      if (promoter?.latitude && promoter?.longitude) {
        map.flyTo([promoter.latitude, promoter.longitude], 8, {
          duration: 1
        });
      }
    }
  }, [selectedPromoterId, promoters, map]);

  return null;
}

/**
 * TouringMap Component
 * Implements BUILD_PLAN Week 5, Tasks 5.7-5.8
 *
 * Basic functional map with Leaflet
 * Shows promoter markers with basic color coding
 */
export default function TouringMap({
  selectedTourId,
  selectedPromoterId,
  onPromoterSelect
}: TouringMapProps) {
  const { data: session } = useSession();
  const { activeProfile } = useProfileStore();
  const [promoters, setPromoters] = useState<PromoterContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (session?.user?.id) {
      fetchPromoters();
    }
  }, [session?.user?.id, selectedTourId]);

  const fetchPromoters = async () => {
    if (!session?.user?.id) return;

    setIsLoading(true);
    try {
      const url = selectedTourId
        ? `/api/contacts/promoters?tourId=${selectedTourId}`
        : '/api/contacts/promoters';

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPromoters(data);
      }
    } catch (err) {
      console.error('Failed to fetch promoters:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Default center (US)
  const defaultCenter: [number, number] = [39.8283, -98.5795];

  // Artist home location (if available)
  const artistHome: [number, number] | null = activeProfile?.latitude && activeProfile?.longitude
    ? [activeProfile.latitude, activeProfile.longitude]
    : null;

  const center = artistHome || defaultCenter;

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-surface-elevated">
        <div className="text-center">
          <div className="inline-block animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
          <p className="text-text-tertiary">Loading map...</p>
        </div>
      </div>
    );
  }

  return (
    <MapContainer
      center={center}
      zoom={artistHome ? 6 : 4}
      style={{ height: '100%', width: '100%' }}
      className="z-0"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* Week 6, Task 6.9: Map controller for centering */}
      <MapController
        selectedPromoterId={selectedPromoterId}
        promoters={promoters}
      />

      {/* Artist Home Marker */}
      {artistHome && (
        <Marker position={artistHome}>
          <Popup>
            <div className="p-2">
              <h3 className="font-semibold">{activeProfile?.name}</h3>
              <p className="text-sm text-text-tertiary">Your Home Base</p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Promoter Markers */}
      {promoters
        .filter(p => p.latitude && p.longitude)
        .map((promoter) => {
          // Week 6, Task 6.5: Dim markers for promoters without shows in selected tour
          const hasShowsInTour = selectedTourId
            ? promoter.shows.some(s => s.tourId === selectedTourId)
            : true;

          const opacity = hasShowsInTour ? 1 : 0.3;

          return (
            <Marker
              key={promoter.entityId}
              position={[promoter.latitude!, promoter.longitude!]}
              opacity={opacity}
              eventHandlers={{
                click: () => onPromoterSelect(promoter.entityId)
              }}
            >
              <Popup>
                <MarkerPopup
                  promoter={promoter}
                  selectedTourId={selectedTourId}
                />
              </Popup>
            </Marker>
          );
        })}
    </MapContainer>
  );
}
