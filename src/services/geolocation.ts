import type { GeoLocation } from '@/types';

export function requestLocation(): Promise<GeoLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by this browser.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const city = await reverseGeocode(lat, lng);
        resolve({ lat, lng, city });
      },
      err => reject(new Error(`Geolocation error: ${err.message}`)),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 300_000 }
    );
  });
}

async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
      { headers: { 'User-Agent': 'AI-Expense-Tracker/1.0' } }
    );
    const data = await res.json() as {
      address?: {
        city?: string; town?: string; village?: string; municipality?: string;
      }
    };
    return (
      data.address?.city ??
      data.address?.town ??
      data.address?.village ??
      data.address?.municipality ??
      'Unknown city'
    );
  } catch {
    return 'Unknown city';
  }
}
