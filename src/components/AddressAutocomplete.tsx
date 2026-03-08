// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';

interface AddressAutocompleteProps {
  onAddressSelect: (address: any) => void;
  label: string;
  error?: string;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'gmp-place-autocomplete': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
  }
}

export const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({ onAddressSelect, label, error }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API;

  useEffect(() => {
    if (!apiKey) {
      return;
    }

    // Check if script is already loaded
    if (document.querySelector('script[src*="maps.googleapis.com"]')) {
      setIsLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly`;
    script.async = true;
    script.defer = true;
    script.onload = () => setIsLoaded(true);
    script.onerror = () => setApiError("Failed to load Google Maps. Switched to manual entry.");
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    const picker = pickerRef.current;
    if (apiKey && isLoaded && picker) {
      const listener = async (event: any) => {
        console.log('gmp-places-select event fired', event);
        const place = event.detail.place;
        if (place) {
          try {
            console.log('Fetching fields for place...', place);
            await place.fetchFields({ fields: ['addressComponents', 'formattedAddress', 'location', 'id'] });
            console.log('Place fields fetched:', {
              addressComponents: place.addressComponents,
              formattedAddress: place.formattedAddress,
              location: place.location,
              id: place.id
            });
            onAddressSelect({
              addressComponents: place.addressComponents,
              formattedAddress: place.formattedAddress,
              location: place.location,
              id: place.id
            });
          } catch (e) {
            console.error("Error fetching place details:", e);
          }
        }
      };
      
      picker.addEventListener('gmp-places-select', listener);
      return () => {
        picker.removeEventListener('gmp-places-select', listener);
      };
    }
  }, [apiKey, isLoaded, onAddressSelect]);

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
      
      {apiKey && !apiError ? (
        <div className={`rounded-xl border ${error ? 'border-red-500' : 'border-[#A2B2C8]/30'} overflow-hidden`}>
          <gmp-place-autocomplete 
            ref={pickerRef}
            placeholder="Start typing property address..."
            style={{ width: '100%', padding: '0.75rem 1rem' }}
          ></gmp-place-autocomplete>
        </div>
      ) : (
        <input
          ref={inputRef}
          type="text"
          onChange={handleManualChange}
          className={`w-full px-4 py-3 rounded-xl border ${error || apiError ? 'border-red-500' : 'border-[#A2B2C8]/30'} focus:outline-none focus:border-[#004EA8] bg-white text-[#004EA8] placeholder-[#A2B2C8]/50`}
          placeholder="Enter property address manually (Auto-complete unavailable)"
        />
      )}
      
      {(error || apiError) && <span className="text-xs text-red-500">{apiError || error}</span>}
    </div>
  );
};
