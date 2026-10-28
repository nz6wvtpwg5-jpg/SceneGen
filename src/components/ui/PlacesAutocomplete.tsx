
"use client";

import { useEffect, useRef, useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';

// Extend Window interface for Google Maps
declare global {
  interface Window {
    google?: typeof google;
  }
}

interface PlacesAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onPlaceSelect?: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  className?: string;
  useFullAddress?: boolean; // If true, sets full formatted address; if false, sets only name
  types?: string[]; // Google Places types to search for (e.g., ['(cities)'] or ['establishment', 'geocode'])
}

const DEFAULT_PLACE_TYPES = ['establishment', 'geocode'];

/**
 * Google Places Autocomplete Component
 * Provides location search with real-time suggestions
 * Requires Google Maps JavaScript API with Places Library
 */
export default function PlacesAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  placeholder = "Search for a location",
  className = "",
  useFullAddress = false, // Default to name only
  types = DEFAULT_PLACE_TYPES, // Default to venues and addresses
}: PlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const isSelectingRef = useRef(false);
  const lastPlaceRef = useRef<google.maps.places.PlaceResult | null>(null);
  const onChangeRef = useRef(onChange);
  const onPlaceSelectRef = useRef(onPlaceSelect);
  const typesKey = types.join('|');

  useEffect(() => {
    onChangeRef.current = onChange;
    onPlaceSelectRef.current = onPlaceSelect;
  }, [onChange, onPlaceSelect]);

  // Load Google Maps Script
  useEffect(() => {
    // Check if script is already loaded
    if (window.google?.maps?.places?.Autocomplete) {
      setIsScriptLoaded(true);
      return;
    }

    // Check if script is being loaded
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      const handleLoad = () => {
        // Wait a bit for the API to fully initialize
        setTimeout(() => {
          if (window.google?.maps?.places?.Autocomplete) {
            setIsScriptLoaded(true);
          }
        }, 100);
      };
      existingScript.addEventListener('load', handleLoad);
      return () => {
        existingScript.removeEventListener('load', handleLoad);
      };
    }

    // Load the script
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.error('Google Maps API key not found');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async`;
    script.async = true;
    script.defer = true;

    const handleLoad = () => {
      // Wait a bit for the API to fully initialize
      setTimeout(() => {
        if (window.google?.maps?.places?.Autocomplete) {
          setIsScriptLoaded(true);
        }
      }, 100);
    };

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', () => setIsScriptLoaded(false));
    document.head.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
    };
  }, []);

  // Initialize Autocomplete
  useEffect(() => {
    if (!isScriptLoaded || !inputRef.current || autocompleteRef.current) {
      return;
    }

    // Double-check that Google Maps API is actually loaded
    if (!window.google?.maps?.places?.Autocomplete) {
      console.warn('⚠️ [PlacesAutocomplete] Google Maps API not ready yet');
      return;
    }

    let autocomplete: google.maps.places.Autocomplete | null = null;
    let observer: MutationObserver | null = null;
    try {
      const createdAutocomplete = new google.maps.places.Autocomplete(inputRef.current, {
        types: typesKey.split('|'),
        fields: [
          'name',
          'formatted_address',
          'address_components',
          'geometry',
          'place_id',
          'types',
        ],
      });
      autocomplete = createdAutocomplete;

      const handlePlaceSelect = () => {
        isSelectingRef.current = true;
        const place = createdAutocomplete.getPlace();

        if (!place.geometry) {
          console.warn('⚠️ [PlacesAutocomplete] No geometry for input:', place.name);
          isSelectingRef.current = false;
          return;
        }

        // Store the place for potential blur handler use
        lastPlaceRef.current = place;
        setIsLoading(true);

        // Update the input value based on useFullAddress prop
        const displayValue = useFullAddress
          ? (place.formatted_address || place.name || '')
          : (place.name || '');
        onChangeRef.current(displayValue);

        // Call the callback with the full place object
        onPlaceSelectRef.current?.(place);

        setIsLoading(false);
        isSelectingRef.current = false;
      };

      createdAutocomplete.addListener('place_changed', handlePlaceSelect);

      // Add mousedown listener to detect clicks on dropdown
      const handleMouseDown = () => {
        isSelectingRef.current = true;
      };

      // Single MutationObserver to attach listeners once when pac-container appears
      let hasAttached = false;
      const createdObserver = new MutationObserver(() => {
        if (hasAttached) return;

        const pacContainers = document.querySelectorAll('.pac-container');
        if (pacContainers.length > 0) {
          pacContainers.forEach((container) => {
            container.addEventListener('pointerdown', handleMouseDown, { once: false });
          });
          hasAttached = true;
          createdObserver.disconnect(); // Stop observing once attached
        }
      });

      observer = createdObserver;
      createdObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });

      autocompleteRef.current = createdAutocomplete;
    } catch (error) {
      console.error('❌ [PlacesAutocomplete] Error initializing:', error);
    }

    return () => {
      observer?.disconnect();
      if (autocomplete) google.maps.event.clearInstanceListeners(autocomplete);
      autocompleteRef.current = null;
    };
  }, [isScriptLoaded, typesKey, useFullAddress]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  // Handle keyboard events - particularly Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      // Give Google Places a moment to process the selection
      setTimeout(() => {
        if (autocompleteRef.current) {
          const place = autocompleteRef.current.getPlace();

          if (place && place.geometry) {
            const displayValue = useFullAddress
              ? (place.formatted_address || place.name || '')
              : (place.name || '');
            onChange(displayValue);

            if (onPlaceSelect) {
              onPlaceSelect(place);
            }
          }
        }
      }, 100);
    }
  };

  // Handle blur event - catches cases where place_changed doesn't fire
  const handleBlur = () => {
    console.log('👋 [PlacesAutocomplete] Input blur event - isSelecting:', isSelectingRef.current);

    // Give Google Places time to process the selection (important for mouse clicks)
    setTimeout(() => {
      if (autocompleteRef.current) {
        console.log('🔍 [PlacesAutocomplete] Checking for selected place on blur');
        let place = autocompleteRef.current.getPlace();
        console.log('📍 [PlacesAutocomplete] Place from getPlace():', place);

        // If getPlace() didn't work but we have a stored place and user clicked dropdown
        if ((!place || !place.geometry) && lastPlaceRef.current && isSelectingRef.current) {
          console.log('💾 [PlacesAutocomplete] Using stored place from lastPlaceRef');
          place = lastPlaceRef.current;
        }

        if (place && place.geometry && place.place_id) {
          console.log('✅ [PlacesAutocomplete] Valid place found on blur, processing...');

          const displayValue = useFullAddress
            ? (place.formatted_address || place.name || '')
            : (place.name || '');

          // Only update if the value has changed
          if (displayValue !== value) {
            console.log('📝 [PlacesAutocomplete] Updating value to:', displayValue);
            onChange(displayValue);

            if (onPlaceSelect) {
              console.log('🎯 [PlacesAutocomplete] Calling onPlaceSelect callback from blur');
              onPlaceSelect(place);
            }
          }
        } else {
          console.warn('⚠️ [PlacesAutocomplete] No valid place found on blur');
        }

        isSelectingRef.current = false;
        // Don't clear lastPlaceRef here - keep it in case needed for next blur
      }
    }, 500); // Increased from 200ms to 500ms to give more time for dropdown clicks
  };

  const handleFocus = () => {
    console.log('👁️ [PlacesAutocomplete] Input focused - attaching dropdown listeners');
    isSelectingRef.current = false; // Reset the flag when focusing

    // Attach mousedown listeners when input is focused
    setTimeout(() => {
      const pacContainers = document.querySelectorAll('.pac-container');
      pacContainers.forEach((container) => {
        const handler = (e: Event) => {
          console.log('🖱️ [PlacesAutocomplete] Mousedown on pac-container detected!');
          isSelectingRef.current = true;

          // Poll for the selected place after a short delay
          setTimeout(() => {
            console.log('🔍 [PlacesAutocomplete] Polling for place after mousedown...');
            if (autocompleteRef.current) {
              const place = autocompleteRef.current.getPlace();
              console.log('📍 [PlacesAutocomplete] Polled place:', place);

              if (place && place.geometry && place.place_id) {
                console.log('✅ [PlacesAutocomplete] Got valid place from polling!');
                lastPlaceRef.current = place;

                const displayValue = useFullAddress
                  ? (place.formatted_address || place.name || '')
                  : (place.name || '');
                onChange(displayValue);

                if (onPlaceSelect) {
                  console.log('🎯 [PlacesAutocomplete] Calling onPlaceSelect from poll');
                  onPlaceSelect(place);
                }
              }
            }
          }, 300); // Poll after 300ms to give Google time to process
        };
        container.removeEventListener('mousedown', handler);
        container.addEventListener('mousedown', handler);

        // Also attach to individual items
        const items = container.querySelectorAll('.pac-item');
        items.forEach((item) => {
          item.addEventListener('click', () => {
            console.log('🖱️ [PlacesAutocomplete] Item clicked!');
            isSelectingRef.current = true;
          });
        });
      });
      console.log('🎧 [PlacesAutocomplete/Focus] Attached listeners to', pacContainers.length, 'pac-containers');
    }, 100);

    // Also try attaching after a longer delay to catch dynamically created dropdowns
    setTimeout(() => {
      const pacContainers = document.querySelectorAll('.pac-container');
      if (pacContainers.length > 0) {
        pacContainers.forEach((container) => {
          const items = container.querySelectorAll('.pac-item');
          items.forEach((item) => {
            item.addEventListener('click', () => {
              console.log('🖱️ [PlacesAutocomplete] Item clicked (delayed attach)!');
              isSelectingRef.current = true;
            });
          });
        });
        console.log('🎧 [PlacesAutocomplete/Focus] Re-attached to items after delay');
      }
    }, 500);
  };

  return (
    <div className="relative">
      <div className="relative flex items-center">
        <MapPin
          className="absolute left-3 text-text-tertiary pointer-events-none"
          size={18}
        />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          className={`w-full pl-10 pr-10 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${className}`}
        />
        {isLoading && (
          <Loader2
            className="absolute right-3 text-text-tertiary animate-spin"
            size={18}
          />
        )}
      </div>
      {!isScriptLoaded && (
        <p className="text-xs text-text-tertiary mt-1">
          Type your city or location manually while location suggestions load.
        </p>
      )}
    </div>
  );
}
