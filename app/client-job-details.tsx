import { AntDesign, Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Stack } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

import { db } from "../config/firebase";

export default function ClientJobDetailsPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.jobId) return;

    const unsubscribe = onSnapshot(
      doc(db, "jobs", params.jobId as string),
      (doc) => {
        if (doc.exists()) {
          setJob({ id: doc.id, ...doc.data() });
        }
        setLoading(false);
      },
      (error) => {
        console.error("Job details error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [params.jobId]);

  const handleCall = () => {
    if (job?.contactNumber) {
      Linking.openURL(`tel:${job.contactNumber}`);
    }
  };

  const handleMessage = () => {
    router.push('/client-chat');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <AntDesign name="loading1" size={32} color="#4facfe" />
        <Text style={styles.loadingText}>Loading job details...</Text>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.errorContainer}>
        <AntDesign name="exclamationcircle" size={48} color="#ef4444" />
        <Text style={styles.errorText}>Job not found</Text>
      </View>
    );
  }

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed": return "#10b981";
      case "In Progress": return "#f59e0b";
      case "Scheduled": return "#4facfe";
      default: return "#6b7280";
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Image source={require('../assets/teddy-logo.png')} style={styles.logo} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Booking Details</Text>
            <Text style={styles.headerSubtitle}>{job.client}</Text>
          </View>
        </View>
        
        <TouchableOpacity onPress={handleMessage} style={styles.messageButton}>
          <AntDesign name="message1" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Job Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{job.title}</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor(job.status) }]} />
              <Text style={styles.statusText}>{job.status}</Text>
            </View>
          </View>
          
          <View style={styles.infoRow}>
            <AntDesign name="calendar" size={16} color="#6b7280" />
            <Text style={styles.infoText}>{job.scheduledDate} at {job.startTime}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <AntDesign name="enviromento" size={16} color="#6b7280" />
            <Text style={styles.infoText}>{job.address}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <AntDesign name="creditcard" size={16} color="#6b7280" />
            <Text style={styles.infoText}>
              ${job.estimatedPrice}{job.isRecurring ? ' (Weekly)' : ''}
            </Text>
          </View>
          
          {job.isRecurring && (
            <View style={styles.infoRow}>
              <AntDesign name="sync" size={16} color="#6b7280" />
              <Text style={styles.infoText}>
                Recurring: {job.recurringDays?.length > 0 ? job.recurringDays.join(', ') : 'Weekly'}
              </Text>
            </View>
          )}
        </View>

        {/* Location Map */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Location</Text>
          {job.latitude && job.longitude ? (
            <View style={styles.mapContainer}>
              <MapView
                style={styles.map}
                provider="google"
                initialRegion={{
                  latitude: parseFloat(job.latitude),
                  longitude: parseFloat(job.longitude),
                  latitudeDelta: 0.01,
                  longitudeDelta: 0.01,
                }}
                showsUserLocation={false}
                showsMyLocationButton={false}
                scrollEnabled={true}
                zoomEnabled={true}
                pitchEnabled={false}
                rotateEnabled={false}
              >
                <Marker
                  coordinate={{
                    latitude: parseFloat(job.latitude),
                    longitude: parseFloat(job.longitude),
                  }}
                  title={job.title}
                  description={job.address}
                  pinColor="#4facfe"
                />
              </MapView>
              <TouchableOpacity 
                style={styles.mapOverlay}
                onPress={() => {
                  const url = `https://maps.google.com/?q=${job.latitude},${job.longitude}`;
                  Linking.openURL(url);
                }}
              >
                <Text style={styles.mapOverlayText}>Tap to open in Maps</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.mapPlaceholder}>
              <AntDesign name="enviromento" size={32} color="#9ca3af" />
              <Text style={styles.mapPlaceholderText}>Location not available</Text>
              <Text style={styles.addressText}>{job.address}</Text>
            </View>
          )}
        </View>

        {/* Recurring Schedule Card */}
        {job.isRecurring && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Recurring Schedule</Text>
            <View style={styles.recurringInfo}>
              <View style={styles.recurringRow}>
                <Text style={styles.recurringLabel}>Frequency:</Text>
                <Text style={styles.recurringValue}>
                  {job.recurringDays?.length > 0 ? job.recurringDays.join(', ') : 'Weekly'}
                </Text>
              </View>
              <View style={styles.recurringRow}>
                <Text style={styles.recurringLabel}>Next Service:</Text>
                <Text style={styles.recurringValue}>
                  {(() => {
                    const nextDate = new Date(job.scheduledDate);
                    nextDate.setDate(nextDate.getDate() + 7);
                    return nextDate.toLocaleDateString('en-AU', { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    });
                  })()} at {job.startTime}
                </Text>
              </View>
              <View style={styles.recurringRow}>
                <Text style={styles.recurringLabel}>Weekly Rate:</Text>
                <Text style={styles.recurringValue}>${job.estimatedPrice}</Text>
              </View>
            </View>
            <View style={styles.recurringNote}>
              <AntDesign name="infocirlceo" size={14} color="#10b981" />
              <Text style={styles.recurringNoteText}>
                You're saving 15% with recurring service! We'll automatically schedule your next cleaning.
              </Text>
            </View>
          </View>
        )}

        {/* Progress Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Progress</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${job.progress || 0}%` }]} />
            </View>
            <Text style={styles.progressText}>{job.progress || 0}% Complete</Text>
          </View>
          
          {job.status === "In Progress" && (
            <Text style={styles.progressNote}>
              Your cleaner is currently working on this job. You'll receive updates as tasks are completed.
            </Text>
          )}
        </View>

        {/* Tasks Card */}
        {job.tasks && job.tasks.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Tasks ({job.tasks.length})</Text>
            {job.tasks.map((task, index) => (
              <View key={task.id || index} style={styles.taskItem}>
                <View style={[
                  styles.taskNumber,
                  task.completed && styles.taskNumberCompleted
                ]}>
                  {task.completed ? (
                    <AntDesign name="check" size={12} color="#fff" />
                  ) : (
                    <Text style={styles.taskNumberText}>{index + 1}</Text>
                  )}
                </View>
                <View style={styles.taskContent}>
                  <Text style={[
                    styles.taskTitle,
                    task.completed && styles.taskTitleCompleted
                  ]}>
                    {task.title}
                  </Text>
                  <Text style={styles.taskTime}>{task.estimatedTime}</Text>
                </View>
                {task.requiresPhoto && (
                  <AntDesign name="camera" size={14} color="#4facfe" />
                )}
              </View>
            ))}
          </View>
        )}

        {/* Notes Card */}
        {job.specialRequests && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Special Requests</Text>
            <Text style={styles.notesText}>{job.specialRequests}</Text>
          </View>
        )}

        {/* Contact Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Need Help?</Text>
          <Text style={styles.contactText}>
            Have questions about your booking? Message our team for quick assistance.
          </Text>
          
          <TouchableOpacity style={styles.contactButton} onPress={handleMessage}>
            <AntDesign name="message1" size={20} color="#4facfe" />
            <Text style={styles.contactButtonText}>Live Chat Support</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f1f5f9",
  },
  errorText: {
    marginTop: 16,
    fontSize: 18,
    color: "#ef4444",
    fontWeight: "600",
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  headerTextContainer: {
    alignItems: "center",
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
  messageButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    flex: 1,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: "#374151",
    marginLeft: 12,
    flex: 1,
    fontWeight: "500",
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 12,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  mapOverlay: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mapOverlayText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  mapPlaceholder: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  mapPlaceholderText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '600',
    marginTop: 8,
  },
  addressText: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
    marginTop: 4,
    paddingHorizontal: 16,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4facfe",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  progressNote: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
    fontStyle: "italic",
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  taskNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#e2e8f0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  taskNumberCompleted: {
    backgroundColor: "#10b981",
  },
  taskNumberText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748b",
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1e293b",
  },
  taskTitleCompleted: {
    textDecorationLine: "line-through",
    color: "#64748b",
  },
  taskTime: {
    fontSize: 12,
    color: "#64748b",
    marginTop: 2,
  },
  notesText: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  contactText: {
    fontSize: 16,
    color: "#6b7280",
    lineHeight: 24,
    marginBottom: 16,
  },
  contactButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f8ff",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#4facfe",
    gap: 8,
  },
  contactButtonText: {
    color: "#4facfe",
    fontSize: 16,
    fontWeight: "700",
  },
  recurringInfo: {
    marginTop: 8,
  },
  recurringRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  recurringLabel: {
    fontSize: 14,
    color: "#64748b",
    fontWeight: "600",
  },
  recurringValue: {
    fontSize: 14,
    color: "#1e293b",
    fontWeight: "600",
    textAlign: "right",
    flex: 1,
    marginLeft: 16,
  },
  recurringNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  recurringNoteText: {
    fontSize: 13,
    color: "#166534",
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
});