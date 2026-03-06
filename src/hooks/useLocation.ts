import { useState, useCallback } from "react";

export interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
  label: string;
  fullAddress: string;
  city: string;
  country: string;
  capturedAt: string;
}

/**
 * Reverse geocode coordinates → human-readable address
 * via OpenStreetMap Nominatim (free, no API key needed)
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{
  label: string;
  fullAddress: string;
  city: string;
  country: string;
}> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`;
  const res = await fetch(url, {
    headers: {
      // Nominatim requires a User-Agent identifying your app
      "User-Agent": "TeaBreakTracker/1.0 (https://github.com/your-repo)"
    },
  });
  if (!res.ok) throw new Error("Geocoding request failed");
  const data = await res.json();

  const a = data.address || {};
  const parts = [
    a.road || a.pedestrian || a.footway,
    a.suburb || a.neighbourhood || a.quarter,
    a.city || a.town || a.village || a.county,
    a.state,
    a.country,
  ].filter(Boolean);

  return {
    label: parts.join(", ") || data.display_name || "Unknown Location",
    fullAddress: data.display_name || "Unknown Location",
    city: a.city || a.town || a.village || a.county || "",
    country: a.country || "",
  };
}

/**
 * Custom React hook that grabs geolocation from the browser and optionally
 * reverse–geocodes it.  Used by the clock‑in flow.
 *
 * Returns an object with:
 *   captureLocation(): Promise<LocationData>
 *   loading: boolean
 *   error: string | null
 */
export function useLocationCapture() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const captureLocation = useCallback(async (): Promise<LocationData> => {
    setLoading(true);
    setError(null);

    try {
      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error("Geolocation is not supported by your browser."));
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (err) => {
            switch (err.code) {
              case err.PERMISSION_DENIED:
                reject(
                  new Error(
                    "PERMISSION_DENIED: Location access was denied. Please allow location access to clock in."
                  )
                );
                break;
              case err.POSITION_UNAVAILABLE:
                reject(new Error("Location information is unavailable."));
                break;
              case err.TIMEOUT:
                reject(new Error("Location request timed out."));
                break;
              default:
                reject(new Error("An unknown location error occurred."));
            }
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });

      const { latitude, longitude, accuracy } = coords;
      const geoInfo = await reverseGeocode(latitude, longitude);

      const locationData: LocationData = {
        lat: latitude,
        lng: longitude,
        accuracy: Math.round(accuracy),
        label: geoInfo.label,
        fullAddress: geoInfo.fullAddress,
        city: geoInfo.city,
        country: geoInfo.country,
        capturedAt: new Date().toISOString(),
      };

      setLoading(false);
      return locationData;
    } catch (err: any) {
      setError(err?.message || String(err));
      setLoading(false);
      throw err;
    }
  }, []);

  return { captureLocation, loading, error };
}
