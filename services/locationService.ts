/**
 * Location Service for geocoding addresses
 * Uses OpenStreetMap Nominatim API as default (free, no API key required)
 * Can be swapped with Google Maps Geocoding API if needed
 * 
 * Rate limiting: Nominatim has a usage policy of max 1 request per second
 * For production with many addresses, consider using Google Maps API with server-side geocoding
 */

// Simple rate limiting - max 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // 1 second

export async function geocodeAddressOSM(address: string) {
  if (!address) return null;
  
  // Rate limiting
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;
  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise(resolve => setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest));
  }
  lastRequestTime = Date.now();
  
  try {
    const q = encodeURIComponent(address);
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${q}&limit=1`;
    
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'TeddysCleaningApp/1.0 (contact@teddyscleaning.com)'
      }
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon)
      };
    }
    
    return null;
  } catch (err) {
    console.error('Geocode error:', err);
    return null;
  }
}