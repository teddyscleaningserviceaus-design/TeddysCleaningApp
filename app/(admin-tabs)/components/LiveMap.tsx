import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, Callout } from 'react-native-maps';
import { AntDesign } from '@expo/vector-icons';
import * as Location from 'expo-location';

interface LiveMapProps {
  jobs: any[];
  onJobSelect: (job: any) => void;
  onJobLongPress?: (job: any) => void;
  selectedJobId?: string | null;
  includePast?: boolean;
  showLocateButton?: boolean;
  locateButtonStyle?: 'transparent' | 'solid';
}

export default function LiveMap({ jobs, onJobSelect, onJobLongPress, selectedJobId, includePast = false, showLocateButton = true, locateButtonStyle = 'transparent' }: LiveMapProps) {
  const mapRef = useRef<MapView>(null);
  const [locating, setLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  
  // Animate to selected job when selectedJobId changes
  React.useEffect(() => {
    if (selectedJobId && mapRef.current) {
      const selectedJob = jobs.find(job => job.id === selectedJobId);
      if (selectedJob) {
        console.log('LiveMap: animating to selected job', selectedJobId, selectedJob.latitude, selectedJob.longitude);
        if (selectedJob.latitude && selectedJob.longitude) {
          mapRef.current.animateToRegion({
            latitude: selectedJob.latitude,
            longitude: selectedJob.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          }, 1000);
        } else {
          console.log('LiveMap: selected job has no coordinates, showing placeholder');
        }
      }
    }
  }, [selectedJobId, jobs]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "in progress": return "#fc466b";
      case "completed": return "#38ef7d";
      case "pending": return "#f59e0b";
      case "scheduled": return "#8b5cf6";
      default: return "#6b7280";
    }
  };

  const jobsWithLocation = jobs.filter(job => job.latitude && job.longitude);
  
  // Filter jobs based on includePast flag
  const filteredJobs = includePast 
    ? jobsWithLocation 
    : jobsWithLocation.filter(job => job.status?.toLowerCase() !== 'completed');

  const handleJobPress = (job: any) => {
    onJobSelect(job);
    // Animation is now handled by useEffect when selectedJobId changes
  };

  const handleLocateMe = async () => {
    if (locating) return;
    
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'Please enable location permissions to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Location.requestForegroundPermissionsAsync() }
          ]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
      });

      const { latitude, longitude } = location.coords;
      setUserLocation({ latitude, longitude });

      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }, 1000);
      }

      setTimeout(() => {
        setUserLocation(null);
      }, 5000);

    } catch (error) {
      console.error('Location error:', error);
      Alert.alert(
        'Location Error',
        'Unable to get your current location. Please check your location settings.',
        [{ text: 'OK' }]
      );
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider="google"
        initialRegion={{
          latitude: -37.8136,
          longitude: 144.9631,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        mapPadding={{ top: 0, right: 0, bottom: 40, left: 0 }}
      >
        {filteredJobs.map((job) => {
          const isSelected = selectedJobId === job.id;
          return (
            <Marker
              key={job.id}
              coordinate={{ latitude: job.latitude, longitude: job.longitude }}
              pinColor={isSelected ? '#ff6b35' : getStatusColor(job.status)}
              onPress={() => handleJobPress(job)}
            >
              {isSelected && (
                <View style={styles.selectedJobHighlight}>
                  <View style={styles.selectedJobPulse} />
                </View>
              )}
              <Callout onPress={() => onJobLongPress && onJobLongPress(job)}>
                <View style={[styles.calloutContainer, isSelected && styles.calloutSelected]}>
                  <Text style={styles.calloutTitle}>{job.title}</Text>
                  <Text style={styles.calloutClient}>{job.client}</Text>
                  <Text style={styles.calloutAddress}>{job.address}</Text>
                  <Text style={styles.calloutAssigned}>Assigned: {job.assignedToName || 'Unassigned'}</Text>
                  <Text style={[styles.calloutStatus, { color: getStatusColor(job.status) }]}>
                    {job.status || 'Pending'}
                  </Text>
                  {onJobLongPress && (
                    <Text style={styles.calloutTap}>Tap for details</Text>
                  )}
                </View>
              </Callout>
            </Marker>
          );
        })}
        
        {/* Show placeholder marker for selected job without coordinates */}
        {selectedJobId && (() => {
          const selectedJob = jobs.find(job => job.id === selectedJobId);
          if (selectedJob && (!selectedJob.latitude || !selectedJob.longitude)) {
            // Show placeholder at map center or default location
            const defaultCoords = {
              latitude: -37.8136,
              longitude: 144.9631
            };
            return (
              <Marker
                key={`placeholder-${selectedJobId}`}
                coordinate={defaultCoords}
                pinColor="#ff6b35"
                title="Job Location"
                description={`${selectedJob.title} - Address needs geocoding`}
              >
                <View style={styles.placeholderMarker}>
                  <AntDesign name="questioncircle" size={20} color="#fff" />
                  <View style={styles.placeholderPulse} />
                </View>
              </Marker>
            );
          }
          return null;
        })()}
        
        {userLocation && (
          <Marker
            coordinate={userLocation}
            title="Your Location"
            description="Current location"
          >
            <View style={styles.userLocationMarker}>
              <View style={styles.userLocationPulse} />
              <AntDesign name="enviromento" size={20} color="#4facfe" />
            </View>
          </Marker>
        )}
      </MapView>
      
      {showLocateButton && (
        <TouchableOpacity 
          style={[
            locateButtonStyle === 'transparent' ? styles.locateButtonTransparent : styles.locateButton, 
            locating && styles.locateButtonDisabled
          ]}
          onPress={handleLocateMe}
          disabled={locating}
          testID="locate-button"
        >
          <AntDesign 
            name={locating ? "loading1" : "enviromento"} 
            size={20} 
            color={locating ? "#9ca3af" : "#4facfe"} 
          />
        </TouchableOpacity>
      )}
      
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#fc466b" }]} />
          <Text style={styles.legendText}>In Progress</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#38ef7d" }]} />
          <Text style={styles.legendText}>Completed</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#f59e0b" }]} />
          <Text style={styles.legendText}>Pending</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#8b5cf6" }]} />
          <Text style={styles.legendText}>Scheduled</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  legend: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 10,
    color: '#374151',
    fontWeight: '500',
  },
  calloutContainer: {
    width: 220,
    padding: 10,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  calloutClient: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 2,
  },
  calloutAddress: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  calloutAssigned: {
    fontSize: 11,
    color: '#8b5cf6',
    marginBottom: 2,
    fontWeight: '600',
  },
  calloutStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  calloutSelected: {
    borderWidth: 2,
    borderColor: '#ff6b35',
    backgroundColor: '#fff5f0',
  },
  calloutTap: {
    fontSize: 10,
    color: '#4facfe',
    fontStyle: 'italic',
    marginTop: 4,
    textAlign: 'center',
  },
  selectedJobHighlight: {
    position: 'absolute',
    top: -20,
    left: -20,
    right: -20,
    bottom: -20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedJobPulse: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 107, 53, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.6)',
  },
  locateButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  locateButtonTransparent: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  locateButtonDisabled: {
    backgroundColor: '#f3f4f6',
  },
  userLocationMarker: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  userLocationPulse: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(79, 172, 254, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(79, 172, 254, 0.5)',
  },
  placeholderMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ff6b35',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
    elevation: 4,
  },
  placeholderPulse: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 107, 53, 0.3)',
    borderWidth: 2,
    borderColor: 'rgba(255, 107, 53, 0.6)',
    top: -10,
    left: -10,
  },
});