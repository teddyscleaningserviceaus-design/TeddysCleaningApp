import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Linking, Alert } from 'react-native';
import { AntDesign, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc as firestoreDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

export default function JobDetails() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!params.jobId) return;

    // Try to load from jobs collection first, then guest-bookings
    const jobDoc = firestoreDoc(db, 'jobs', params.jobId as string);
    const unsubscribe = onSnapshot(jobDoc, 
      (docSnap) => {
        if (docSnap.exists()) {
          setJob({ id: docSnap.id, ...docSnap.data() });
          setLoading(false);
        } else {
          // Try guest-bookings collection
          const guestDoc = firestoreDoc(db, 'guest-bookings', params.jobId as string);
          const unsubscribeGuest = onSnapshot(guestDoc, 
            (guestDocSnap) => {
              if (guestDocSnap.exists()) {
                setJob({ id: guestDocSnap.id, ...guestDocSnap.data(), bookingType: 'guest' });
              }
              setLoading(false);
            },
            (error) => {
              console.error('Guest booking error:', error);
              setLoading(false);
            }
          );
          return unsubscribeGuest;
        }
      },
      (error) => {
        console.error('Job details error:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [params.jobId]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'in progress': return '#fc466b';
      case 'scheduled': return '#11998e';
      case 'completed': return '#38ef7d';
      case 'pending': return '#f59e0b';
      case 'accepted': return '#10b981';
      case 'schedule-pending': return '#f97316';
      case 'awaiting confirmation': return '#f97316';
      default: return '#6b7280';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const calculateEstimatedTime = (tasks) => {
    if (!tasks || tasks.length === 0) return 120;
    return tasks.reduce((total, task) => total + (task.estimatedDuration || 30), 0);
  };

  const calculateEstimatedPay = (tasks) => {
    const minutes = calculateEstimatedTime(tasks);
    return Math.round(minutes * 0.83); // $50/hour estimate
  };

  const handleCall = () => {
    if (job?.phone) {
      Linking.openURL(`tel:${job.phone}`);
    }
  };

  const handleMessage = () => {
    if (job?.phone) {
      Linking.openURL(`sms:${job.phone}`);
    }
  };

  const handleStartJob = () => {
    router.push({
      pathname: '/job-progress',
      params: {
        jobId: job.id,
        jobTitle: job.title,
        client: job.client,
        address: job.address
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
        <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <AntDesign name="arrowleft" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={styles.headerRight} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      </View>
    );
  }

  if (!job) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
        <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <AntDesign name="arrowleft" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job Details</Text>
          <View style={styles.headerRight} />
        </LinearGradient>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error-outline" size={64} color="#d1d5db" />
          <Text style={styles.errorTitle}>Job Not Found</Text>
          <Text style={styles.errorDescription}>This job may have been deleted or you don't have access to it.</Text>
        </View>
      </View>
    );
  }

  const estimatedTime = calculateEstimatedTime(job.tasks);
  const estimatedPay = calculateEstimatedPay(job.tasks);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Job Details</Text>
          <Text style={styles.headerSubtitle}>{job.title}</Text>
        </View>
        
        <TouchableOpacity onPress={handleStartJob} style={styles.startButton}>
          <MaterialIcons name="play-arrow" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Job Overview Card */}
        <View style={styles.overviewCard}>
          <View style={styles.jobTitleRow}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            <View style={styles.badgeRow}>
              {job.priority && (
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(job.priority) }]}>
                  <Text style={styles.badgeText}>{job.priority}</Text>
                </View>
              )}
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                <Text style={styles.badgeText}>{job.status}</Text>
              </View>
            </View>
          </View>
          
          <View style={styles.clientRow}>
            <MaterialIcons name="person" size={20} color="#6b7280" />
            <Text style={styles.clientName}>{job.client}</Text>
          </View>
        </View>

        {/* Contact Card */}
        <View style={styles.contactCard}>
          <Text style={styles.sectionTitle}>Contact Information</Text>
          
          <View style={styles.contactRow}>
            <MaterialIcons name="phone" size={20} color="#10b981" />
            <Text style={styles.contactText}>{job.phone || 'No phone number'}</Text>
            {job.phone && (
              <View style={styles.contactActions}>
                <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
                  <MaterialIcons name="call" size={16} color="#10b981" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.contactButton} onPress={handleMessage}>
                  <MaterialIcons name="message" size={16} color="#10b981" />
                </TouchableOpacity>
              </View>
            )}
          </View>
          
          <View style={styles.contactRow}>
            <MaterialIcons name="email" size={20} color="#6b7280" />
            <Text style={styles.contactText}>{job.email || 'No email address'}</Text>
          </View>
        </View>

        {/* Schedule & Payment Card */}
        <View style={styles.scheduleCard}>
          <Text style={styles.sectionTitle}>Schedule & Payment</Text>
          
          <View style={styles.scheduleRow}>
            <MaterialIcons name="schedule" size={20} color="#4facfe" />
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleText}>
                {job.scheduledDate} {job.startTime && `at ${job.startTime}`}
              </Text>
              <Text style={styles.scheduleSubtext}>Scheduled Date & Time</Text>
            </View>
          </View>
          
          <View style={styles.scheduleRow}>
            <MaterialIcons name="timer" size={20} color="#8b5cf6" />
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleText}>
                {Math.floor(estimatedTime / 60)}h {estimatedTime % 60}m
              </Text>
              <Text style={styles.scheduleSubtext}>Estimated Duration</Text>
            </View>
          </View>
          
          <View style={styles.scheduleRow}>
            <MaterialIcons name="attach-money" size={20} color="#10b981" />
            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleText}>${estimatedPay}</Text>
              <Text style={styles.scheduleSubtext}>Estimated Payment</Text>
            </View>
          </View>
        </View>

        {/* Location Card */}
        <View style={styles.locationCard}>
          <Text style={styles.sectionTitle}>Location</Text>
          
          <View style={styles.locationRow}>
            <MaterialIcons name="location-on" size={20} color="#ef4444" />
            <Text style={styles.locationText}>{job.address}</Text>
          </View>
          
          {job.latitude && job.longitude && (
            <TouchableOpacity 
              style={styles.mapButton}
              onPress={() => {
                const url = `https://maps.google.com/?q=${job.latitude},${job.longitude}`;
                Linking.openURL(url);
              }}
            >
              <MaterialIcons name="map" size={16} color="#4facfe" />
              <Text style={styles.mapButtonText}>Open in Maps</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Tasks Card */}
        {job.tasks && job.tasks.length > 0 && (
          <View style={styles.tasksCard}>
            <Text style={styles.sectionTitle}>Tasks ({job.tasks.length})</Text>
            
            {job.tasks.map((task, index) => (
              <View key={task.id || index} style={styles.taskItem}>
                <View style={styles.taskNumber}>
                  <Text style={styles.taskNumberText}>{index + 1}</Text>
                </View>
                <View style={styles.taskContent}>
                  <Text style={styles.taskTitle}>{task.title || 'Unnamed Task'}</Text>
                  <Text style={styles.taskDescription}>{task.description || task.title}</Text>
                  <View style={styles.taskMeta}>
                    <Text style={styles.taskTime}>
                      ⏱️ {task.estimatedDuration || 30} min
                    </Text>
                    {task.requiresPhoto && (
                      <Text style={styles.taskPhoto}>📷 Photo required</Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Equipment Card */}
        {job.tasks && job.tasks.some(task => task.equipment && task.equipment.length > 0) && (
          <View style={styles.equipmentCard}>
            <Text style={styles.sectionTitle}>Required Equipment</Text>
            
            <View style={styles.equipmentList}>
              {[...new Set(job.tasks.flatMap(task => task.equipment || []))].map((item, index) => (
                <View key={index} style={styles.equipmentItem}>
                  <MaterialIcons name="build" size={16} color="#6b7280" />
                  <Text style={styles.equipmentText}>{item}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Notes Card */}
        {job.notes && (
          <View style={styles.notesCard}>
            <Text style={styles.sectionTitle}>Special Instructions</Text>
            <Text style={styles.notesText}>{job.notes}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.progressButton} onPress={handleStartJob}>
            <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.progressButtonGradient}>
              <MaterialIcons name="play-arrow" size={24} color="#fff" />
              <Text style={styles.progressButtonText}>Start Job Progress</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
  },
  headerRight: {
    width: 40,
  },
  startButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  errorDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Cards
  overviewCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  jobTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
    marginRight: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  clientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clientName: {
    fontSize: 16,
    color: '#374151',
    fontWeight: '600',
  },
  
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  contactText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  contactButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
  },
  
  scheduleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  scheduleSubtext: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
    lineHeight: 20,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    gap: 6,
  },
  mapButtonText: {
    color: '#4facfe',
    fontSize: 12,
    fontWeight: '600',
  },
  
  tasksCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  taskItem: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 12,
  },
  taskNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#4facfe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskNumberText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 16,
    marginBottom: 6,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  taskTime: {
    fontSize: 11,
    color: '#8b5cf6',
    fontWeight: '500',
  },
  taskPhoto: {
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '500',
  },
  
  equipmentCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  equipmentList: {
    gap: 8,
  },
  equipmentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  equipmentText: {
    fontSize: 14,
    color: '#374151',
  },
  
  notesCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  
  actionButtons: {
    marginBottom: 20,
  },
  progressButton: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#4facfe',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  progressButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  progressButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});