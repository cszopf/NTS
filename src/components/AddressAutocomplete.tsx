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
          const place = autocompleteRef.current?.getPlace();
          if (place && place.geometry) {
            onAddressSelect(place);
          }
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
  }, [isLoaded, onAddressSelect]);

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!apiKey || apiError) {
      onAddressSelect({ manualAddress: e.target.value });
    }
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
