import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as Location from 'expo-location';

// Calculate straight-line distance between two points
const getDistance = (point1, point2) => {
  const R = 6371; // Earth's radius in km
  const dLat = (point2.latitude - point1.latitude) * Math.PI / 180;
  const dLon = (point2.longitude - point1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(point1.latitude * Math.PI / 180) * Math.cos(point2.latitude * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from 'react-native-maps-directions';

const { width, height } = Dimensions.get("window");

export default function NavigationPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [userLocation, setUserLocation] = useState(null);
  const [mapRef, setMapRef] = useState(null);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [isNearDestination, setIsNearDestination] = useState(false);

  const destination = {
    latitude: parseFloat(params.latitude as string),
    longitude: parseFloat(params.longitude as string),
  };

  useEffect(() => {
    getCurrentLocation();
  }, []);

  useEffect(() => {
    if (userLocation) {
      const distanceKm = getDistance(userLocation, destination);
      setIsNearDestination(distanceKm < 0.1); // Within 100 meters
      // Distance and duration will be set by MapViewDirections onReady or onError
    }
  }, [userLocation]);

  const handleStartJob = () => {
    Alert.alert(
      "Start Job?",
      "Are you ready to start this job?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Start Job",
          onPress: () => {
            router.push({
              pathname: '/job-progress',
              params: {
                jobId: params.jobId,
                jobTitle: params.jobTitle,
                client: params.client,
                address: params.address,
              },
            });
          },
        },
      ]
    );
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required for navigation');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    } catch (error) {
      Alert.alert('Error', 'Could not get your location');
    }
  };

  const fitToCoordinates = () => {
    if (mapRef && userLocation) {
      mapRef.fitToCoordinates([userLocation, destination], {
        edgePadding: { top: 100, right: 50, bottom: 100, left: 50 },
        animated: true,
      });
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Navigation</Text>
          <Text style={styles.headerSubtitle}>{params.jobTitle}</Text>
        </View>
        
        <TouchableOpacity onPress={fitToCoordinates} style={styles.centerButton}>
          <AntDesign name="enviromento" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <MapView
        ref={setMapRef}
        style={styles.map}
        provider="google"
        initialRegion={{
          latitude: destination.latitude,
          longitude: destination.longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        followsUserLocation={true}
      >
        {/* Destination Marker */}
        <Marker
          coordinate={destination}
          pinColor="#ef4444"
          title={params.jobTitle as string}
          description={params.address as string}
        />

        {/* Directions */}
        {userLocation && (
          <MapViewDirections
            origin={userLocation}
            destination={destination}
            apikey={process.env.GOOGLE_MAPS_API_KEY || "AIzaSyDele-TeUwLAx22J_s0W-9X6LBCGcqlwZ4"}
            strokeWidth={4}
            strokeColor="#4facfe"
            optimizeWaypoints={true}
            mode="DRIVING"
            language="en"
            onReady={(result) => {
              setDistance(result.distance.toFixed(1) + ' km');
              setDuration(Math.ceil(result.duration) + ' min');
              fitToCoordinates();
            }}
            onError={(errorMessage) => {
              console.log('Directions error: ', errorMessage);
              // Fallback to straight-line calculation
              const distanceKm = getDistance(userLocation, destination);
              setDistance(distanceKm.toFixed(1) + ' km');
              setDuration(Math.ceil(distanceKm * 2) + ' min');
            }}
          />
        )}
      </MapView>

      {/* Info Panel */}
      <View style={styles.infoPanel}>
        <View style={styles.routeInfo}>
          <View style={styles.routeItem}>
            <AntDesign name="clockcircleo" size={20} color="#4facfe" />
            <Text style={styles.routeText}>{duration || "Calculating..."}</Text>
          </View>
          <View style={styles.routeItem}>
            <AntDesign name="car" size={20} color="#4facfe" />
            <Text style={styles.routeText}>{distance || "Calculating..."}</Text>
          </View>
        </View>
        
        <View style={styles.jobInfo}>
          <Text style={styles.jobTitle}>{params.jobTitle}</Text>
          <Text style={styles.jobAddress}>{params.address}</Text>
          <Text style={styles.jobClient}>Client: {params.client}</Text>
        </View>
        
        {isNearDestination && (
          <TouchableOpacity style={styles.startJobButton} onPress={handleStartJob}>
            <LinearGradient colors={["#10b981", "#059669"]} style={styles.startJobGradient}>
              <AntDesign name="play" size={20} color="#fff" />
              <Text style={styles.startJobText}>Start Job</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 8,
  },
  backButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  centerButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },

  map: {
    flex: 1,
  },

  infoPanel: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  
  routeInfo: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  routeItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  routeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },

  jobInfo: {
    alignItems: "center",
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },
  jobAddress: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 4,
    textAlign: "center",
  },
  jobClient: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },

  startJobButton: {
    borderRadius: 16,
    overflow: "hidden",
    marginTop: 16,
    elevation: 4,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  startJobGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  startJobText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
});