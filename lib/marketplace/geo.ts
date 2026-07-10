// Distance helpers + a small offline ZIP centroid lookup so the app can
// resolve a typed ZIP code to coordinates without any external API.
// Browser geolocation is the primary path; ZIP is the fallback.

export function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(d: number): number {
  return (d * Math.PI) / 180;
}

// Representative centroids for a spread of metro areas. Enough to make
// ZIP-based search work out of the box; extend freely.
export const ZIP_CENTROIDS: Record<string, { lat: number; lng: number; city: string; state: string }> = {
  '78701': { lat: 30.2711, lng: -97.7437, city: 'Austin', state: 'TX' },
  '78704': { lat: 30.2452, lng: -97.7656, city: 'Austin', state: 'TX' },
  '78745': { lat: 30.2061, lng: -97.7969, city: 'Austin', state: 'TX' },
  '73301': { lat: 30.2672, lng: -97.7431, city: 'Austin', state: 'TX' },
  '75201': { lat: 32.7876, lng: -96.7993, city: 'Dallas', state: 'TX' },
  '77002': { lat: 29.7589, lng: -95.3677, city: 'Houston', state: 'TX' },
  '10001': { lat: 40.7506, lng: -73.9972, city: 'New York', state: 'NY' },
  '11201': { lat: 40.6936, lng: -73.9899, city: 'Brooklyn', state: 'NY' },
  '90001': { lat: 33.973, lng: -118.2487, city: 'Los Angeles', state: 'CA' },
  '90012': { lat: 34.0614, lng: -118.2385, city: 'Los Angeles', state: 'CA' },
  '94102': { lat: 37.7793, lng: -122.4193, city: 'San Francisco', state: 'CA' },
  '60601': { lat: 41.8855, lng: -87.6217, city: 'Chicago', state: 'IL' },
  '33101': { lat: 25.7785, lng: -80.1981, city: 'Miami', state: 'FL' },
  '98101': { lat: 47.6109, lng: -122.3358, city: 'Seattle', state: 'WA' },
  '30301': { lat: 33.749, lng: -84.388, city: 'Atlanta', state: 'GA' },
  '80201': { lat: 39.7392, lng: -104.9903, city: 'Denver', state: 'CO' },
  '85001': { lat: 33.4484, lng: -112.074, city: 'Phoenix', state: 'AZ' },
  '02108': { lat: 42.3588, lng: -71.0707, city: 'Boston', state: 'MA' },
};

export function lookupZip(zip: string) {
  const clean = (zip || '').trim().slice(0, 5);
  return ZIP_CENTROIDS[clean] ?? null;
}

// Default map center when a visitor has not shared a location yet.
export const DEFAULT_LOCATION = { lat: 30.2672, lng: -97.7431, city: 'Austin', state: 'TX' };
