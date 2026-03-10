// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';

interface AddressAutocompleteProps {
  onAddressSelect: (address: any) => void;
  label: string;
  error?: string;
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ onAddressSelect, label, error }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API;
  
  // Use a ref for the callback to avoid re-initializing autocomplete when parent re-renders
  const onAddressSelectRef = useRef(onAddressSelect);
  useEffect(() => {
    onAddressSelectRef.current = onAddressSelect;
  }, [onAddressSelect]);

  const timeoutRef = useRef<any>(null);
  const isSelectingRef = useRef(false);

  useEffect(() => {
    if (!apiKey) {
      console.warn("Google Places API key is missing. Autocomplete will be disabled.");
      return;
    }

    // Check if script is already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      setIsLoaded(true);
      return;
    }

    const scriptId = 'google-maps-script';
    if (document.getElementById(scriptId)) {
      const existingScript = document.getElementById(scriptId);
      existingScript.addEventListener('load', () => setIsLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    
    // Handle authentication failures (like RefererNotAllowedMapError)
    window.gm_authFailure = () => {
      console.error("Google Maps authentication failed. This is likely due to API key restrictions.");
      setApiError("Google Maps API error: Referrer not allowed. Please check your API key settings.");
    };

    script.onload = () => setIsLoaded(true);
    script.onerror = () => {
      console.error("Failed to load Google Maps script.");
      setApiError("Failed to load Google Maps. Please enter address manually.");
    };
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (isLoaded && inputRef.current && !autocompleteRef.current) {
      try {
        autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
          types: ['address'],
          componentRestrictions: { country: 'us' },
          fields: ['address_components', 'formatted_address', 'geometry', 'place_id']
        });

        autocompleteRef.current.addListener('place_changed', () => {
          isSelectingRef.current = true;
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }

          const place = autocompleteRef.current?.getPlace();
          // Ensure we have geometry or address components as requested
          if (place && (place.geometry || place.address_components)) {
            onAddressSelectRef.current(place);
          }
          
          // Reset the selection flag after a short delay to ignore any trailing change events
          setTimeout(() => {
            isSelectingRef.current = false;
          }, 500);
        });

        // Prevent form submission on Enter
        const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Enter') {
            e.preventDefault();
          }
        };
        inputRef.current.addEventListener('keydown', handleKeyDown);

        return () => {
          if (window.google && window.google.maps && autocompleteRef.current) {
            google.maps.event.clearInstanceListeners(autocompleteRef.current);
          }
          if (inputRef.current) {
            inputRef.current.removeEventListener('keydown', handleKeyDown);
          }
        };
      } catch (e) {
        console.error("Error initializing Google Places Autocomplete:", e);
        setApiError("Error initializing autocomplete.");
      }
    }
  }, [isLoaded]);

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    
    // If we're currently selecting from the dropdown, ignore manual change events
    if (isSelectingRef.current) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Debounce manual entry to avoid racing with Google Places selection
    timeoutRef.current = setTimeout(() => {
      if (!isSelectingRef.current) {
        onAddressSelectRef.current({ manualAddress: value });
      }
    }, 400);
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[#A2B2C8] uppercase tracking-[1.5px] font-montserrat">
        {label}
      </label>
      
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          onChange={handleManualChange}
          className={`w-full px-4 py-3 rounded-xl border ${error || apiError ? 'border-red-500' : 'border-[#A2B2C8]/30'} focus:outline-none focus:border-[#004EA8] bg-white text-[#004EA8] placeholder-[#A2B2C8]/50`}
          placeholder={apiKey && !apiError ? "Start typing property address..." : "Enter property address manually"}
        />
      </div>
      
      {(error || apiError) && <span className="text-xs text-red-500">{apiError || error}</span>}
    </div>
  );
};
