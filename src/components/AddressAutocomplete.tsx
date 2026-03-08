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
      // No API key - allow manual entry without error
      return;
    }

    // Handle authentication errors (e.g. invalid key, billing not enabled, API not activated)
    (window as any).gm_authFailure = () => {
      const message = "API Error: Enable 'Maps JavaScript API' & 'Places API' in Google Cloud Console.";
      console.error(message);
      setApiError(message);
    };

    if (window.google?.maps?.places) {
      setIsLoaded(true);
      return;
    }

    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => setIsLoaded(true));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setApiError("Failed to load Google Maps. Switched to manual entry.");
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (apiKey && isLoaded && inputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
        componentRestrictions: { country: 'us' },
        fields: ['address_components', 'formatted_address', 'geometry', 'place_id', 'name'],
        types: ['address']
      });

      autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (place && place.geometry) {
          onAddressSelect(place);
        }
      });
    }
  }, [apiKey, isLoaded, onAddressSelect]);

  const handleManualChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // If no API key or if API failed, treat as manual entry
    if (!apiKey || apiError) {
      onAddressSelect({ manualAddress: e.target.value });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-[#A2B2C8] uppercase tracking-[1.5px] font-montserrat">
        {label}
      </label>
      <input
        ref={inputRef}
        type="text"
        onChange={handleManualChange}
        className={`w-full px-4 py-3 rounded-xl border ${error || apiError ? 'border-red-500' : 'border-[#A2B2C8]/30'} focus:outline-none focus:border-[#004EA8] bg-white text-[#004EA8] placeholder-[#A2B2C8]/50`}
        placeholder={apiKey && !apiError ? "Start typing property address..." : "Enter property address manually (Auto-complete unavailable)"}
      />
      {(error || apiError) && <span className="text-xs text-red-500">{apiError || error}</span>}
    </div>
  );
};
