import { GOOGLE_MAPS_API_KEY } from '../config/appConfig';

/**
 * Calculate travel time and distance between two locations using Google Maps API
 */
export const calculateTravelTime = async (origin, destination) => {
  try {
    if (!GOOGLE_MAPS_API_KEY) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    const originStr = typeof origin === 'string' ? origin : `${origin.latitude},${origin.longitude}`;
    const destinationStr = typeof destination === 'string' ? destination : `${destination.latitude},${destination.longitude}`;

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${encodeURIComponent(originStr)}&destinations=${encodeURIComponent(destinationStr)}&mode=driving&units=metric&key=${GOOGLE_MAPS_API_KEY}`
    );

    const data = await response.json();

    if (data.status === 'OK' && data.rows[0]?.elements[0]?.status === 'OK') {
      const element = data.rows[0].elements[0];
      return {
        distance: {
          text: element.distance.text,
          value: element.distance.value // in meters
        },
        duration: {
          text: element.duration.text,
          value: element.duration.value // in seconds
        },
        durationInTraffic: element.duration_in_traffic ? {
          text: element.duration_in_traffic.text,
          value: element.duration_in_traffic.value // in seconds
        } : null
      };
    }

    return null;
  } catch (error) {
    console.error('Error calculating travel time:', error);
    return null;
  }
};

/**
 * Calculate estimated travel time without API (fallback)
 */
export const calculateEstimatedTravelTime = (distanceKm) => {
  if (!distanceKm) return null;
  
  // Estimate based on average city driving speed (30 km/h)
  const timeInHours = distanceKm / 30;
  const timeInMinutes = Math.round(timeInHours * 60);
  
  return {
    distance: {
      text: `${distanceKm.toFixed(1)} km`,
      value: distanceKm * 1000 // convert to meters
    },
    duration: {
      text: `${timeInMinutes} min`,
      value: timeInMinutes * 60 // convert to seconds
    }
  };
};

/**
 * Get travel time between employee and job location
 */
export const getEmployeeTravelTime = async (employee, job) => {
  if (!employee.latitude || !employee.longitude || !job.latitude || !job.longitude) {
    return null;
  }

  // Try Google Maps API first
  const apiResult = await calculateTravelTime(
    { latitude: employee.latitude, longitude: employee.longitude },
    { latitude: job.latitude, longitude: job.longitude }
  );

  if (apiResult) {
    return apiResult;
  }

  // Fallback to estimated calculation
  const distance = calculateDistance(
    employee.latitude, 
    employee.longitude, 
    job.latitude, 
    job.longitude
  );

  return calculateEstimatedTravelTime(distance);
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};