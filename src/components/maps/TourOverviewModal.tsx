'use client';

import { useEffect, useState } from 'react';
import type { Show } from '@/types/show';

interface TourOverviewModalProps {
  totalShows: number;
  startDate: string;
  endDate: string;
  totalMiles: number;
  shows?: Show[];
}

interface WeatherData {
  temp: number;
  condition: string;
  icon: string;
}

interface NextShowRouteInfo {
  distance: string;
  duration: string;
  distanceValue: number;
  durationValue: number;
  tomorrowVenue?: string;
  tomorrowCity?: string;
  tomorrowState?: string;
}

export function TourOverviewModal({ totalShows, startDate, endDate, totalMiles, shows = [] }: TourOverviewModalProps) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [nextShow, setNextShow] = useState<Show | null>(null);
  const [actualStartDate, setActualStartDate] = useState<string>(startDate);
  const [actualEndDate, setActualEndDate] = useState<string>(endDate);
  const [routeInfo, setRouteInfo] = useState<NextShowRouteInfo | null>(null);
  const [currentShow, setCurrentShow] = useState<Show | null>(null);

  // Calculate actual start and end dates from shows
  useEffect(() => {
    if (shows.length === 0) return;

    const sortedShows = [...shows].sort((a, b) =>
      new Date(a.showDate).getTime() - new Date(b.showDate).getTime()
    );

    setActualStartDate(sortedShows[0].showDate);
    setActualEndDate(sortedShows[sortedShows.length - 1].showDate);
  }, [shows]);

  // Find today's show and tomorrow's show for routing
  useEffect(() => {
    if (shows.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort all shows chronologically
    const sortedShows = [...shows].sort((a, b) =>
      new Date(a.showDate).getTime() - new Date(b.showDate).getTime()
    );

    // Find today's show (the show happening today)
    const todayShow = sortedShows.find(show => {
      const showDate = new Date(show.showDate);
      showDate.setHours(0, 0, 0, 0);
      return showDate.getTime() === today.getTime();
    });

    // Find the show after today's show
    let showAfterToday = null;
    if (todayShow) {
      const todayIndex = sortedShows.indexOf(todayShow);
      if (todayIndex < sortedShows.length - 1) {
        showAfterToday = sortedShows[todayIndex + 1];
      }
    }

    // Set current show (today's show) and next show (show after today)
    if (todayShow) {
      setCurrentShow(todayShow);
      setNextShow(todayShow); // Display today's show in the "Next Show" section

      // Store the show after today separately for route calculation
      if (showAfterToday) {
        // We'll use a ref or calculate inline in the route effect
        setNextShow(todayShow);
      }
    } else {
      // If no show today, find the next upcoming show
      const upcomingShows = sortedShows.filter(show => {
        const showDate = new Date(show.showDate);
        showDate.setHours(0, 0, 0, 0);
        return showDate > today;
      });

      if (upcomingShows.length > 0) {
        setNextShow(upcomingShows[0]);
        // Set current show to previous show if exists
        const nextIndex = sortedShows.indexOf(upcomingShows[0]);
        if (nextIndex > 0) {
          setCurrentShow(sortedShows[nextIndex - 1]);
        } else {
          setCurrentShow(null);
        }
      } else {
        // All shows are in the past
        setNextShow(null);
        setCurrentShow(sortedShows[sortedShows.length - 1]);
      }
    }
  }, [shows]);

  // Calculate route from today's show to tomorrow's show
  useEffect(() => {
    if (!nextShow || shows.length === 0) {
      setRouteInfo(null);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort all shows chronologically
    const sortedShows = [...shows].sort((a, b) =>
      new Date(a.showDate).getTime() - new Date(b.showDate).getTime()
    );

    // Find today's show and the show after it
    const todayShowIndex = sortedShows.findIndex(show => {
      const showDate = new Date(show.showDate);
      showDate.setHours(0, 0, 0, 0);
      return showDate.getTime() === today.getTime();
    });

    if (todayShowIndex === -1 || todayShowIndex >= sortedShows.length - 1) {
      // No show today or no show after today
      setRouteInfo(null);
      return;
    }

    const todayShow = sortedShows[todayShowIndex];
    const tomorrowShow = sortedShows[todayShowIndex + 1];

    // Exact venue coordinates are preferred. Until a venue is confirmed,
    // Directions can route between the saved city/region/country strings.
    const currentLat = (todayShow as any).venue_lat ?? (todayShow as any).venueLat ?? (todayShow as any).latitude;
    const currentLng = (todayShow as any).venue_lng ?? (todayShow as any).venueLng ?? (todayShow as any).longitude;
    const nextLat = (tomorrowShow as any).venue_lat ?? (tomorrowShow as any).venueLat ?? (tomorrowShow as any).latitude;
    const nextLng = (tomorrowShow as any).venue_lng ?? (tomorrowShow as any).venueLng ?? (tomorrowShow as any).longitude;

    const cityLocation = (show: Show) => [show.venueCity, show.venueState, show.venueCountry]
      .filter(Boolean)
      .join(', ');
    const origin: google.maps.LatLngLiteral | string = currentLat && currentLng
      ? { lat: Number(currentLat), lng: Number(currentLng) }
      : cityLocation(todayShow);
    const destination: google.maps.LatLngLiteral | string = nextLat && nextLng
      ? { lat: Number(nextLat), lng: Number(nextLng) }
      : cityLocation(tomorrowShow);

    if (!origin || !destination) {
      setRouteInfo(null);
      return;
    }

    const calculateRoute = async () => {
      try {
        // Check if Google Maps is available
        if (typeof google === 'undefined' || !google.maps) {
          console.log('Google Maps not loaded yet');
          return;
        }

        const directionsService = new google.maps.DirectionsService();

        const result = await new Promise<google.maps.DirectionsResult>((resolve, reject) => {
          directionsService.route(
            {
              origin,
              destination,
              travelMode: google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              if (status === 'OK' && result) {
                resolve(result);
              } else {
                reject(new Error(`Directions request failed: ${status}`));
              }
            }
          );
        });

        if (result.routes[0]?.legs[0]) {
          const leg = result.routes[0].legs[0];
          setRouteInfo({
            distance: leg.distance?.text || 'N/A',
            duration: leg.duration?.text || 'N/A',
            distanceValue: leg.distance?.value || 0,
            durationValue: leg.duration?.value || 0,
            tomorrowVenue: tomorrowShow.venueName || tomorrowShow.venueCity || 'Location TBC',
            tomorrowCity: tomorrowShow.venueCity,
            tomorrowState: tomorrowShow.venueState,
          });
        }
      } catch (error) {
        console.error('Error calculating route to next show:', error);
        setRouteInfo(null);
      }
    };

    // Small delay to ensure Google Maps is loaded
    const timer = setTimeout(calculateRoute, 500);
    return () => clearTimeout(timer);
  }, [nextShow, shows]);

  // Fetch weather for next show
  useEffect(() => {
    if (!nextShow?.venueCity) return;

    const fetchWeather = async () => {
      try {
        // Using Open-Meteo API (free, no API key required)
        // First get coordinates for the city
        const geoResponse = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(nextShow.venueCity)}&count=1&language=en&format=json`
        );
        const geoData = await geoResponse.json();

        if (geoData.results && geoData.results.length > 0) {
          const { latitude, longitude } = geoData.results[0];

          // Get weather forecast
          const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit&timezone=auto`
          );
          const weatherData = await weatherResponse.json();

          if (weatherData.current) {
            const weatherCode = weatherData.current.weather_code;
            const condition = getWeatherCondition(weatherCode);
            const icon = getWeatherIcon(weatherCode);

            setWeather({
              temp: Math.round(weatherData.current.temperature_2m),
              condition,
              icon,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching weather:', error);
      }
    };

    fetchWeather();
  }, [nextShow]);

  const getWeatherCondition = (code: number): string => {
    if (code === 0) return 'Clear';
    if (code <= 3) return 'Partly Cloudy';
    if (code <= 48) return 'Foggy';
    if (code <= 67) return 'Rainy';
    if (code <= 77) return 'Snowy';
    if (code <= 82) return 'Showers';
    if (code <= 86) return 'Snow Showers';
    return 'Stormy';
  };

  const getWeatherIcon = (code: number): string => {
    if (code === 0) return '☀️';
    if (code <= 3) return '⛅';
    if (code <= 48) return '🌫️';
    if (code <= 67) return '🌧️';
    if (code <= 77) return '❄️';
    if (code <= 82) return '🌦️';
    if (code <= 86) return '🌨️';
    return '⛈️';
  };

  // Check if the next show is today
  const isShowToday = nextShow ? (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const showDate = new Date(nextShow.showDate);
    showDate.setHours(0, 0, 0, 0);
    return showDate.getTime() === today.getTime();
  })() : false;

  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="bg-background/80 backdrop-blur-md border border-border-subtle rounded-lg shadow-2xl p-3 min-w-[260px] max-w-[280px] transition-all duration-300"
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        zIndex: 1000,
        opacity: isHovered ? 1 : 0.92,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <h3 className="text-base font-bold text-foreground mb-2 flex items-center gap-2">
        <svg className="w-4 h-4 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Tour Overview
      </h3>

      <div className="space-y-2">
        {/* Today's Show / Next Show */}
        {nextShow && (
          <div className="p-2.5 bg-gradient-to-r from-accent-cyan/20 to-accent-purple/20 rounded-lg border border-accent-cyan/40">
            <div className="flex items-center gap-1.5 mb-1.5">
              <svg className="w-3.5 h-3.5 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span className="text-xs text-accent-cyan font-bold">
                {isShowToday ? "Today's Show" : "Next Show"}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-foreground truncate">
                {nextShow.venueName || nextShow.venueCity || 'Location TBC'}
              </p>
              <p className="text-xs text-text-secondary">
                {[nextShow.venueCity, nextShow.venueState, nextShow.venueCountry].filter(Boolean).join(', ')}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-tertiary">
                  {isShowToday ? 'Today' : new Date(nextShow.showDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </p>
                {weather && (
                  <div className="flex items-center gap-1 text-xs">
                    <span>{weather.icon}</span>
                    <span className="font-semibold text-foreground">{weather.temp}°F</span>
                  </div>
                )}
              </div>
              {/* Route Info to Next Show (Tomorrow) */}
              {routeInfo && isShowToday && (
                <div className="mt-2 pt-2 border-t border-accent-cyan/20">
                  <div className="mb-2">
                    <p className="text-xs text-text-tertiary mb-0.5">To Tomorrow's Show:</p>
                    {routeInfo.tomorrowVenue && (
                      <>
                        <p className="text-xs font-semibold text-foreground">{routeInfo.tomorrowVenue}</p>
                        {routeInfo.tomorrowCity && (
                          <p className="text-xs text-text-secondary">
                            {[routeInfo.tomorrowCity, routeInfo.tomorrowState].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-text-secondary">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                        </svg>
                        <span>Distance</span>
                      </div>
                      <span className="font-semibold text-accent-cyan">{routeInfo.distance}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1 text-text-secondary">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Drive Time</span>
                      </div>
                      <span className="font-semibold text-accent-cyan">{routeInfo.duration}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Total Shows */}
        <div className="flex items-center justify-between p-2 bg-surface-elevated rounded-lg border border-border-subtle">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <span className="text-xs text-text-secondary font-medium">Total Shows</span>
          </div>
          <span className="text-base font-bold text-foreground">{totalShows}</span>
        </div>

        {/* Start Date */}
        <div className="flex items-center justify-between p-2 bg-surface-elevated rounded-lg border border-border-subtle">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-text-secondary font-medium">Start Date</span>
          </div>
          <span className="text-xs font-semibold text-foreground">
            {new Date(actualStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* End Date */}
        <div className="flex items-center justify-between p-2 bg-surface-elevated rounded-lg border border-border-subtle">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-accent-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="text-xs text-text-secondary font-medium">End Date</span>
          </div>
          <span className="text-xs font-semibold text-foreground">
            {new Date(actualEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>

        {/* Total Miles */}
        <div className="flex items-center justify-between p-2 bg-gradient-to-r from-accent-cyan/10 to-accent-purple/10 rounded-lg border border-accent-cyan/30">
          <div className="flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5 text-accent-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            <span className="text-xs text-accent-cyan font-semibold">Total Miles</span>
          </div>
          <span className="text-base font-bold text-accent-cyan">{totalMiles.toLocaleString()} mi</span>
        </div>
      </div>
    </div>
  );
}
