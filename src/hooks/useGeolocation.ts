import { useState, useCallback } from 'react';
import type { GeoLocation } from '@/types';
import { requestLocation } from '@/services/geolocation';

export function useGeolocation() {
  const [location, setLocation] = useState<GeoLocation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const capture = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const loc = await requestLocation();
      setLocation(loc);
      return loc;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not get location';
      setError(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => { setLocation(null); setError(null); }, []);

  return { location, isLoading, error, capture, clear };
}
