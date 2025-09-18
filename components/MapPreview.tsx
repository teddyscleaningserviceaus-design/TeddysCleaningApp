import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { geocodeAddressOSM } from '../services/locationService';

interface MapPreviewProps {
  address?: string;
  latitude?: number;
  longitude?: number;
  jobId?: string;
}

export default function MapPreview({ address, latitude, longitude, jobId }: MapPreviewProps) {
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (latitude && longitude) {
      setCoords({ latitude, longitude });
    } else if (address && !latitude && !longitude) {
      geocodeAddress();
    }
  }, [address, latitude, longitude]);

  const geocodeAddress = async () => {
    if (!address) return;
    
    setLoading(true);
    try {
      const result = await geocodeAddressOSM(address);
      if (result) {
        setCoords(result);
      }
    } catch (error) {
      console.error('Geocoding error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading map...</Text>
      </View>
    );
  }

  if (!coords) {
    return (
      <View style={styles.noMapContainer}>
        <Text style={styles.noMapText}>📍 {address || 'No location available'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: coords.latitude,
          longitude: coords.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        <Marker
          coordinate={coords}
          title="Job Location"
          description={address}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 200,
    borderRadius: 8,
    overflow: 'hidden',
    marginVertical: 8,
  },
  map: {
    flex: 1,
  },
  loadingContainer: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
  },
  noMapContainer: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  noMapText: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
});