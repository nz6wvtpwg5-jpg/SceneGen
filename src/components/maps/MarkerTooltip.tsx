'use client';

import { useEffect, useState } from 'react';
import { Banknote, Cloud, MapPin, Navigation, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/csv/parser';
import { formatDistance } from '@/lib/maps/routeUtils';

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
  timestamp: number;
}

interface MarkerTooltipProps {
  venueName: string;
  venueAddress: string;
  city?: string;
  state?: string;
  country?: string;
  locationPrecision?: 'venue' | 'city';
  fee: number;
  currency?: string;
  distanceToNext?: number;
  lat: number;
  lng: number;
  venueCapacity?: number | null;
  nextShowVenue?: string;
  nextShowCity?: string;
  nextShowState?: string;
}

// Simple in-memory cache with 5-minute expiration
const weatherCache = new Map<string, WeatherData>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export function MarkerTooltip({
  venueName,
  venueAddress,
  city,
  state,
  country,
  locationPrecision = 'venue',
  fee,
  currency,
  distanceToNext,
  lat,
  lng,
  venueCapacity,
  nextShowVenue,
  nextShowCity,
  nextShowState,
}: MarkerTooltipProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);

  useEffect(() => {
    // Add a small delay before fetching to debounce rapid hovers
    const timer = setTimeout(() => {
      fetchWeather();
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [lat, lng]);

  const fetchWeather = async () => {
    // Generate cache key based on rounded coordinates (to group nearby locations)
    const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;

    // Check cache first
    const cached = weatherCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('🌤️ Using cached weather data for', venueName);
      setWeather(cached);
      return;
    }

    try {
      setIsLoadingWeather(true);
      console.log('🌤️ Fetching weather for', venueName);

      // Using Open-Meteo API (free, no API key required)
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`
      );

      if (response.ok) {
        const data = await response.json();
        const weatherCode = data.current.weather_code;

        const weatherData: WeatherData = {
          temp: Math.round(data.current.temperature_2m),
          condition: getWeatherCondition(weatherCode),
          icon: getWeatherIcon(weatherCode),
          timestamp: Date.now(),
        };

        // Store in cache
        weatherCache.set(cacheKey, weatherData);
        setWeather(weatherData);
      }
    } catch (error) {
      console.error('Failed to fetch weather:', error);
    } finally {
      setIsLoadingWeather(false);
    }
  };

  const getWeatherCondition = (code: number): string => {
    if (code === 0) return 'Clear';
    if (code <= 3) return 'Partly Cloudy';
    if (code <= 48) return 'Foggy';
    if (code <= 67) return 'Rainy';
    if (code <= 77) return 'Snowy';
    if (code <= 82) return 'Showers';
    if (code <= 99) return 'Thunderstorm';
    return 'Unknown';
  };

  const getWeatherIcon = (code: number): string => {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌦️';
    if (code <= 99) return '⛈️';
    return '🌡️';
  };

  return (
    <div className="bg-background border border-accent-cyan/30 rounded-lg shadow-xl p-4 w-[300px]">
      {/* Venue Info */}
      <div className="flex items-start gap-2 mb-3">
        <MapPin className="h-5 w-5 text-accent-cyan mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-text-primary truncate">
            {venueName || city || 'Location TBC'}
          </h3>
          <p className="text-sm text-text-secondary line-clamp-2">
            {venueAddress || [city, state, country].filter(Boolean).join(', ')}
          </p>
          {locationPrecision === 'city' && (
            <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-accent-cyan">
              Approximate city location
            </p>
          )}
        </div>
      </div>

      {/* Capacity belongs to a confirmed venue, not an approximate city stop. */}
      {locationPrecision === 'venue' && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-accent-purple/10 rounded">
          <Users className="h-4 w-4 text-accent-purple" />
          <div className="flex-1">
            <span className="text-xs text-text-secondary">Capacity: </span>
            <span className="text-sm font-semibold text-text-primary">
              {venueCapacity ? venueCapacity.toLocaleString() : 'TBC'}
            </span>
          </div>
        </div>
      )}

      {/* Fee */}
      <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-semantic-success/10 rounded">
        <Banknote className="h-4 w-4 text-semantic-success" />
        <span className="font-semibold text-semantic-success">
          {currency ? formatCurrency(fee, currency) : `${fee.toFixed(2)} (currency not set)`}
        </span>
      </div>

      {/* Distance to Next */}
      {nextShowVenue && (
        <div className="px-3 py-2 bg-accent-cyan/10 rounded mb-3">
          <div className="flex items-center gap-2 mb-1">
            <Navigation className="h-4 w-4 text-accent-cyan" />
            <span className="text-xs text-text-secondary">Next show:</span>
          </div>
          <div className="ml-6 mb-1">
            <p className="text-sm font-semibold text-text-primary">{nextShowVenue}</p>
            {nextShowCity && nextShowState && (
              <p className="text-xs text-text-secondary">{nextShowCity}, {nextShowState}</p>
            )}
          </div>
          {distanceToNext !== undefined && distanceToNext > 0 && (
            <div className="ml-6">
              <span className="text-sm font-semibold text-accent-cyan">{formatDistance(distanceToNext)}</span>
            </div>
          )}
        </div>
      )}

      {/* Weather - Fixed height to prevent layout shift */}
      <div className="flex items-center gap-2 px-3 py-2 bg-accent-purple/10 rounded h-[42px]">
        <Cloud className="h-4 w-4 text-accent-purple flex-shrink-0" />
        {isLoadingWeather ? (
          <span className="text-sm text-text-tertiary">Loading...</span>
        ) : weather ? (
          <div className="flex items-center gap-2 flex-1">
            <span className="text-xl">{weather.icon}</span>
            <div className="flex-1">
              <span className="text-sm font-semibold text-text-primary">{weather.temp}°F</span>
              <span className="text-xs text-text-secondary ml-2">{weather.condition}</span>
            </div>
          </div>
        ) : (
          <span className="text-sm text-text-tertiary">Weather unavailable</span>
        )}
      </div>

      {/* Click hint */}
      <div className="mt-3 pt-3 border-t border-accent-cyan/20">
        <p className="text-xs text-text-tertiary text-center">Click marker to view day sheet</p>
      </div>
    </div>
  );
}
