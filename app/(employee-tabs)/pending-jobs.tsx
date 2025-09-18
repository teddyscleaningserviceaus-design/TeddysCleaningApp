import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Alert, StatusBar } from 'react-native';
import { AntDesign, MaterialIcons, Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { jobService } from '../../services/jobService';

interface PendingJob {
  id: string;
  title: string;
  client: string;
  address: string;
  scheduledDate: string;
  startTime?: string;
  tasks?: Array<{
    estimatedDuration: number;
    equipment?: string[];
  }>;
  latitude?: number;
  longitude?: number;
  priority?: string;
  notes?: string;
}

export default function PendingJobs() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [pendingJobs, setPendingJobs] = useState<PendingJob[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser?.uid) {
      setPendingJobs([]);
      setLoading(false);
      return;
    }

    // Load from both jobs and guest-bookings collections
    const jobsQuery = query(collection(db, 'jobs'));
    const guestBookingsQuery = query(collection(db, 'guest-bookings'));
    
    let allJobs = [];
    let jobsLoaded = false;
    let guestBookingsLoaded = false;
    
    const updateJobs = () => {
      if (jobsLoaded && guestBookingsLoaded) {
        // Filter for jobs with Schedule-Pending status where current user has pending assignment
        const userPendingJobs = allJobs.filter(job => {
          const isPending = job.status === 'Schedule-Pending';
          
          if (isPending && job.assignedEmployees && Array.isArray(job.assignedEmployees)) {
            return job.assignedEmployees.some(emp => 
              emp.id === auth.currentUser?.uid && emp.status === 'pending'
            );
          }
          return false;
        });
        
        console.log('Schedule-Pending jobs found:', userPendingJobs.length, 'for user:', auth.currentUser?.uid);

        // console.log('Found pending jobs:', userPendingJobs.length, userPendingJobs.map(j => j.id));
        setPendingJobs(userPendingJobs);
        setLoading(false);
      }
    };
    
    const unsubscribeJobs = onSnapshot(jobsQuery, 
      (snapshot) => {
        const jobsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allJobs = [...jobsList, ...allJobs.filter(j => j.bookingType === 'guest')];
        jobsLoaded = true;
        updateJobs();
      },
      (error) => {
        console.error('Jobs query error:', error);
        jobsLoaded = true;
        updateJobs();
      }
    );
    
    const unsubscribeGuestBookings = onSnapshot(guestBookingsQuery, 
      (snapshot) => {
        const guestBookingsList = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          bookingType: 'guest'
        }));
        allJobs = [...allJobs.filter(j => j.bookingType !== 'guest'), ...guestBookingsList];
        guestBookingsLoaded = true;
        updateJobs();
      },
      (error) => {
        console.error('Guest bookings query error:', error);
        guestBookingsLoaded = true;
        updateJobs();
      }
    );

    return () => {
      unsubscribeJobs();
      unsubscribeGuestBookings();
    };
  }, []);

  const calculateEstimatedTime = (tasks: any[]) => {
    if (!tasks || tasks.length === 0) return 120; // Default 2 hours
    return tasks.reduce((total, task) => total + (task.estimatedDuration || 30), 0);
  };

  const getUniqueEquipment = (tasks: any[]) => {
    if (!tasks || tasks.length === 0) return ['Basic cleaning supplies'];
    const allEquipment = tasks.flatMap(task => task.equipment || []);
    return [...new Set(allEquipment)];
  };

  const handleAcceptJob = async (jobId: string) => {
    try {
      console.log('Accepting job:', jobId, 'for user:', auth.currentUser?.uid);
      await jobService.acceptAssignment(jobId, auth.currentUser.uid);
      Alert.alert('Success', 'Job accepted! You will be notified when all team members confirm.');
    } catch (error) {
      console.error('Accept job error:', error);
      Alert.alert('Error', 'Failed to accept job');
    }
  };

  const handleDenyJob = async (jobId: string) => {
    Alert.alert(
      'Deny Job Assignment',
      'Are you sure you want to decline this job? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('Denying job:', jobId, 'for user:', auth.currentUser?.uid);
              await jobService.denyAssignment(jobId, auth.currentUser.uid);
              Alert.alert('Job Declined', 'You have declined this job assignment.');
            } catch (error) {
              console.error('Deny job error:', error);
              Alert.alert('Error', 'Failed to decline job');
            }
          }
        }
      ]
    );
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority?.toLowerCase()) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      case 'low': return '#10b981';
      default: return '#6b7280';
    }
  };

  const renderJobItem = ({ item: job }: { item: PendingJob }) => {
    const estimatedTime = calculateEstimatedTime(job.tasks);
    const equipment = getUniqueEquipment(job.tasks);
    const estimatedPay = Math.round(estimatedTime * 0.83); // $50/hour estimate

    return (
      <View style={styles.jobCard}>
        <View style={styles.jobHeader}>
          <View style={styles.jobTitleRow}>
            <Text style={styles.jobTitle}>{job.title}</Text>
            {job.priority && (
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(job.priority) }]}>
                <Text style={styles.priorityText}>{job.priority}</Text>
              </View>
            )}
          </View>
          <Text style={styles.jobClient}>👤 {job.client}</Text>
        </View>

        <View style={styles.jobDetails}>
          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={16} color="#6b7280" />
            <Text style={styles.detailText}>{job.address}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <MaterialIcons name="schedule" size={16} color="#6b7280" />
            <Text style={styles.detailText}>
              {job.scheduledDate} {job.startTime && `at ${job.startTime}`}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="timer" size={16} color="#8b5cf6" />
            <Text style={styles.detailText}>Est. {Math.round(estimatedTime / 60)}h {estimatedTime % 60}m</Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialIcons name="attach-money" size={16} color="#10b981" />
            <Text style={styles.detailText}>Est. ${estimatedPay}</Text>
          </View>

          {equipment.length > 0 && (
            <View style={styles.equipmentSection}>
              <Text style={styles.equipmentTitle}>Required Equipment:</Text>
              <View style={styles.equipmentList}>
                {equipment.slice(0, 3).map((item, index) => (
                  <View key={index} style={styles.equipmentItem}>
                    <Text style={styles.equipmentText}>{item}</Text>
                  </View>
                ))}
                {equipment.length > 3 && (
                  <Text style={styles.moreEquipment}>+{equipment.length - 3} more</Text>
                )}
              </View>
            </View>
          )}

          {job.notes && (
            <View style={styles.notesSection}>
              <Text style={styles.notesTitle}>Notes:</Text>
              <Text style={styles.notesText}>{job.notes}</Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.denyButton}
            onPress={() => handleDenyJob(job.id)}
          >
            <MaterialIcons name="close" size={20} color="#fff" />
            <Text style={styles.denyButtonText}>Decline</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.acceptButton}
            onPress={() => handleAcceptJob(job.id)}
          >
            <MaterialIcons name="check" size={20} color="#fff" />
            <Text style={styles.acceptButtonText}>Accept Job</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#f59e0b" />
      
      <LinearGradient colors={["#f59e0b", "#d97706"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Pending Jobs</Text>
          <Text style={styles.headerSubtitle}>
            {pendingJobs.length} job{pendingJobs.length !== 1 ? 's' : ''} awaiting confirmation
          </Text>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading pending jobs...</Text>
        </View>
      ) : pendingJobs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="assignment-turned-in" size={64} color="#d1d5db" />
          <Text style={styles.emptyTitle}>No Pending Jobs</Text>
          <Text style={styles.emptyDescription}>
            All job assignments have been confirmed. Check your active jobs for scheduled work.
          </Text>
          <TouchableOpacity 
            style={styles.goToJobsButton}
            onPress={() => router.push('/(employee-tabs)/jobs')}
          >
            <Text style={styles.goToJobsText}>View Active Jobs</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={pendingJobs}
          renderItem={renderJobItem}
          keyExtractor={(item) => `pending_${item.id}`}
          contentContainerStyle={styles.jobsList}
          showsVerticalScrollIndicator={false}
        />
      )}
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
  headerContent: {
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  goToJobsButton: {
    backgroundColor: '#4facfe',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  goToJobsText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  jobsList: {
    padding: 16,
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  jobHeader: {
    marginBottom: 16,
  },
  jobTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    flex: 1,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  jobClient: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  jobDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  equipmentSection: {
    marginTop: 12,
  },
  equipmentTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 6,
  },
  equipmentList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  equipmentItem: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  equipmentText: {
    fontSize: 11,
    color: '#4b5563',
    fontWeight: '500',
  },
  moreEquipment: {
    fontSize: 11,
    color: '#6b7280',
    fontStyle: 'italic',
    alignSelf: 'center',
  },
  notesSection: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  notesTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 4,
  },
  notesText: {
    fontSize: 13,
    color: '#4b5563',
    lineHeight: 18,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  denyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  denyButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 6,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});