import { AntDesign, Feather, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter, useLocalSearchParams } from "expo-router";
import { collection, onSnapshot, query, updateDoc, doc, deleteDoc, where, getDocs, writeBatch, limit } from "firebase/firestore";
import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Linking,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  ScrollView,
} from "react-native";
import MapView, { Marker, Callout } from "react-native-maps";
import { Swipeable } from "react-native-gesture-handler";
import LiveMap from "./components/LiveMap";

import { db } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useFirestoreListener } from "../../hooks/useFirestoreListener";
import JobDetailsPanel from "./components/JobDetailsPanel";
import { geocodeAddressOSM } from "../../services/locationService";
import { jobService } from "../../services/jobService";

const { width } = Dimensions.get("window");

export default function AdminJobs() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('map');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [mapRef, setMapRef] = useState(null);
  const [filterDate, setFilterDate] = useState(searchParams.date || 'all');
  const [filterStatus, setFilterStatus] = useState(() => {
    // Normalize status from query params to match exact DB values
    const status = searchParams.status as string;
    if (status) {
      // Exact DB status strings mapping
      const statusMap: Record<string, string> = {
        'pending': 'Pending',
        'accepted': 'Accepted',
        'schedule-pending': 'Schedule-Pending',
        'in progress': 'In Progress', 
        'completed': 'Completed',
        'scheduled': 'Scheduled'
      };
      const normalized = statusMap[status.toLowerCase()];
      return normalized || status; // Use original if no mapping found
    }
    return 'all';
  });
  const [filterJobStatus, setFilterJobStatus] = useState('all');
  const [employeeLocations, setEmployeeLocations] = useState([]);
  const [searchQuery, setSearchQuery] = useState(searchParams.search as string || '');
  const [selectedJobs, setSelectedJobs] = useState(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [showJobDetailsPanel, setShowJobDetailsPanel] = useState(false);
  const [selectedJobForDetails, setSelectedJobForDetails] = useState(null);
  
  // Date range from query params
  const [dateRange, setDateRange] = useState(() => {
    const start = searchParams.start as string;
    const end = searchParams.end as string;
    if (start || end) {
      return {
        start: start ? new Date(start) : undefined,
        end: end ? new Date(end) : undefined
      };
    }
    return null;
  });
  
  // API to open JobDetailsPanel from external components
  const openJobDetailsPanel = useCallback((jobId: string) => {
    setSelectedJobForDetails(jobId);
    setShowJobDetailsPanel(true);
  }, []);
  
  // Check if specific job should be opened from query params
  useEffect(() => {
    const jobId = searchParams.jobId as string;
    if (jobId) {
      openJobDetailsPanel(jobId);
    }
  }, [searchParams.jobId, openJobDetailsPanel]);

  useFirestoreListener(() => {
    if (!user?.uid) {
      console.log('No authenticated user, clearing data');
      setJobs([]);
      setEmployees([]);
      setLoading(false);
      return [];
    }

    console.log('Setting up Firestore listeners for jobs, user:', user?.uid);
    
    // Test Firestore connection
    getDocs(query(collection(db, 'jobs'), limit(1)))
      .then(snapshot => console.log('Firestore test - jobs collection accessible:', snapshot.size))
      .catch(error => console.error('Firestore test - jobs collection error:', error));
    
    getDocs(query(collection(db, 'guest-bookings'), limit(1)))
      .then(snapshot => console.log('Firestore test - guest-bookings collection accessible:', snapshot.size))
      .catch(error => console.error('Firestore test - guest-bookings collection error:', error));
    
    // Load jobs from both jobs and guest-bookings collections
    const jobsQuery = query(collection(db, "jobs"));
    const guestBookingsQuery = query(collection(db, "guest-bookings"));
    
    let regularJobs = [];
    let guestJobs = [];
    let jobsLoaded = false;
    let guestBookingsLoaded = false;
    
    const updateJobs = () => {
      console.log('UpdateJobs called - jobsLoaded:', jobsLoaded, 'guestBookingsLoaded:', guestBookingsLoaded);
      
      if (jobsLoaded && guestBookingsLoaded) {
        // Combine jobs with unique IDs - guest jobs get prefixed IDs
        const allJobs = [...regularJobs, ...guestJobs];
        
        console.log('Updating jobs:', {
          regularJobs: regularJobs.length,
          guestJobs: guestJobs.length,
          total: allJobs.length,
          sampleRegularJob: regularJobs[0]?.id,
          sampleGuestJob: guestJobs[0]?.id
        });
        
        // Sort by creation date
        allJobs.sort((a, b) => {
          const aDate = a.createdAt?.toDate?.() || new Date(0);
          const bDate = b.createdAt?.toDate?.() || new Date(0);
          return bDate - aDate;
        });
        
        setJobs(allJobs);
        setLoading(false);
      } else {
        console.log('Not updating jobs yet - waiting for both collections');
      }
    };
    
    const unsubscribeJobs = onSnapshot(jobsQuery, 
      (snapshot) => {
        console.log('Jobs snapshot received:', snapshot.docs.length, 'docs');
        if (snapshot.docs.length > 0) {
          console.log('Sample job doc:', snapshot.docs[0].id, snapshot.docs[0].data());
        }
        regularJobs = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(), 
          collection: 'jobs' 
        }));
        console.log('Regular jobs processed:', regularJobs.length);
        jobsLoaded = true;
        updateJobs();
      },
      (error) => {
        console.error("Jobs query error:", error);
        regularJobs = [];
        jobsLoaded = true;
        updateJobs();
      }
    );
    
    const unsubscribeGuestBookings = onSnapshot(guestBookingsQuery, 
      (snapshot) => {
        console.log('Guest bookings snapshot received:', snapshot.docs.length, 'docs');
        if (snapshot.docs.length > 0) {
          console.log('Sample guest booking doc:', snapshot.docs[0].id, snapshot.docs[0].data());
        }
        guestJobs = snapshot.docs.map(doc => ({ 
          id: `guest_${doc.id}`, 
          originalId: doc.id,
          ...doc.data(),
          bookingType: 'guest',
          collection: 'guest-bookings'
        }));
        console.log('Guest jobs processed:', guestJobs.length);
        guestBookingsLoaded = true;
        updateJobs();
      },
      (error) => {
        console.error("Guest bookings query error:", error);
        guestJobs = [];
        guestBookingsLoaded = true;
        updateJobs();
      }
    );

    // Only load employees for admin users
    let unsubscribeEmployees = () => {};
    
    // Check if current user is admin before loading employees
    getDocs(query(collection(db, 'users'), where('uid', '==', user?.uid || '')))
      .then(userSnapshot => {
        const userData = userSnapshot.docs[0]?.data();
        if (userData?.userType === 'admin') {
          const employeesQuery = query(collection(db, "users"));
          unsubscribeEmployees = onSnapshot(employeesQuery, 
            (snapshot) => {
              const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
              const employeesList = usersList.filter(user => user.userType === 'employee');
              setEmployees(employeesList);
            },
            (error) => {
              console.error("Employees query error:", error);
              setEmployees([]);
            }
          );
        } else {
          setEmployees([]);
        }
      })
      .catch(error => {
        console.error('User role check error:', error);
        setEmployees([]);
      });

    return [unsubscribeJobs, unsubscribeGuestBookings, unsubscribeEmployees];
  }, [user?.uid]);

  // Load employee locations from active jobs
  useEffect(() => {
    const activeJobsWithEmployees = Array.isArray(jobs) ? jobs.filter(job => 
      job.status === "In Progress" && 
      job.latitude && 
      job.longitude && 
      job.assignedTo
    ) : [];
    
    const locations = activeJobsWithEmployees.map(job => ({
      id: job.assignedTo,
      name: job.assignedToName || 'Employee',
      latitude: job.latitude,
      longitude: job.longitude,
      status: 'working',
      jobTitle: job.title,
      lastUpdate: new Date()
    }));
    
    setEmployeeLocations(locations);
  }, [jobs]);

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "in-progress": 
      case "in progress": return "#fc466b";
      case "scheduled": return "#11998e";
      case "completed": return "#38ef7d";
      case "pending": return "#f59e0b";
      case "accepted": return "#10b981";
      case "schedule-pending": return "#f97316";
      default: return "#6b7280";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority?.toLowerCase()) {
      case "high": return "#ef4444";
      case "medium": return "#f59e0b";
      case "low": return "#10b981";
      default: return "#6b7280";
    }
  };

  const renderRightActions = (jobId) => {
    return (
      <View style={styles.rightActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteJob(jobId)}
        >
          <MaterialIcons name="delete" size={20} color="#fff" />
          <Text style={styles.actionText}>Delete</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const handleMapJobPress = async (job) => {
    console.log('Jobs: map job press', job.id, job.address, job.latitude, job.longitude);
    // Always select the job first for immediate UI feedback
    setSelectedJobId(job.id);
    
    // If job has coordinates, we're done
    if (job.latitude && job.longitude) {
      console.log('Jobs: job has coordinates, centering map');
      return;
    }
    
    // If job has no coordinates but has _geocoded flag, don't retry
    if (job._geocoded) {
      console.log('Jobs: job already geocoded but no coordinates found');
      return;
    }
    
    // Try to geocode the address
    if (job.address) {
      console.log('Jobs: geocoding address', job.address);
      try {
        const coords = await geocodeAddressOSM(job.address);
        if (coords) {
          console.log('Jobs: geocoded successfully', coords);
          // Update job document with coordinates and geocoded flag
          const collection_name = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
          const docId = job?.originalId || job.id.replace('guest_', '') || job.id;
          
          await updateDoc(doc(db, collection_name, docId), {
            latitude: coords.latitude,
            longitude: coords.longitude,
            _geocoded: true
          });
        } else {
          // Mark as geocoded to avoid repeated attempts
          const collection_name = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
          const docId = job?.originalId || job.id.replace('guest_', '') || job.id;
          
          await updateDoc(doc(db, collection_name, docId), { _geocoded: true });
          console.warn('Jobs: could not geocode address:', job.address);
        }
      } catch (error) {
        console.error('Jobs: geocoding failed:', error);
        // Still mark as attempted to avoid repeated failures
        try {
          const collection_name = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
          const docId = job?.originalId || job.id.replace('guest_', '') || job.id;
          
          await updateDoc(doc(db, collection_name, docId), { _geocoded: true });
        } catch (updateError) {
          console.error('Jobs: failed to update geocoded flag:', updateError);
        }
      }
    }
  };

  const handleMapJobLongPress = (jobOrId) => {
    // Handle both job object and job ID
    const jobId = typeof jobOrId === 'string' ? jobOrId : jobOrId.id;
    console.log('Long press job ID:', jobId);
    router.push(`/(admin-tabs)/employee-allocation/${jobId}`);
  };

  const handleUpdateJobStatus = async (jobId, newStatus) => {
    try {
      const job = jobs.find(j => j.id === jobId);
      if (!job) {
        Alert.alert("Error", "Job not found");
        return;
      }
      
      const collection_name = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
      const docId = job?.originalId || jobId.replace('guest_', '') || jobId;
      const newProgress = newStatus === "completed" ? 100 : newStatus === "in-progress" ? 50 : newStatus === "scheduled" ? 25 : 0;
      
      await updateDoc(doc(db, collection_name, docId), {
        status: newStatus,
        progress: newProgress,
        updatedAt: new Date(),
      });
      Alert.alert("Success", `Job status updated to ${newStatus}`);
    } catch (error) {
      console.error('Update job status error:', error);
      Alert.alert("Error", "Failed to update job status.");
    }
  };

  const handleDeleteJob = async (jobId) => {
    Alert.alert(
      "Delete Job",
      "Are you sure you want to delete this job? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              // Find the job to determine which collection to delete from
              const job = jobs.find(j => j.id === jobId);
              if (!job) {
                Alert.alert("Error", "Job not found");
                return;
              }
              
              const collection_name = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
              const docId = job?.originalId || jobId.replace('guest_', '') || jobId;
              
              await deleteDoc(doc(db, collection_name, docId));
              Alert.alert("Success", "Job deleted successfully");
            } catch (error) {
              console.error('Delete job error:', error);
              Alert.alert("Error", "Failed to delete job");
            }
          }
        }
      ]
    );
  };

  const handleAcceptJob = async (jobId) => {
    try {
      const job = jobs.find(j => j.id === jobId);
      if (!job) {
        Alert.alert("Error", "Job not found");
        return;
      }
      
      const collection_name = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
      const docId = job?.originalId || jobId.replace('guest_', '') || jobId;
      
      await updateDoc(doc(db, collection_name, docId), {
        status: "Accepted",
        progress: 10,
        updatedAt: new Date(),
      });
      Alert.alert("Success", "Job accepted");
    } catch (error) {
      console.error('Accept job error:', error);
      Alert.alert("Error", "Failed to accept job");
    }
  };

  const handleAllocateEmployee = (jobId) => {
    console.log('Allocating employee for job:', jobId);
    router.push(`/(admin-tabs)/employee-allocation/${jobId}`);
  };

  const allocateJobToEmployee = async (jobId, employeeId, employeeName) => {
    try {
      const job = jobs.find(j => j.id === jobId);
      if (!job) {
        Alert.alert("Error", "Job not found");
        return;
      }
      
      const collection_name = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
      const docId = job?.originalId || jobId.replace('guest_', '') || jobId;
      
      if (collection_name === 'jobs') {
        await jobService.assignEmployees(docId, [{ id: employeeId, name: employeeName }]);
      } else {
        await updateDoc(doc(db, collection_name, docId), {
          assignedEmployees: [{ id: employeeId, name: employeeName, status: 'pending', assignedAt: new Date() }],
          assignedTo: employeeId,
          assignedToName: employeeName,
          status: "Pending",
          progress: 15,
          updatedAt: new Date(),
        });
      }
      Alert.alert("Success", `Job allocated to ${employeeName} - awaiting confirmation`);
    } catch (error) {
      console.error('Allocate job error:', error);
      Alert.alert("Error", "Failed to allocate job");
    }
  };

  const handleLongPress = (job) => {
    router.push(`/admin-job-details/${job.id}`);
  };

  const handleJobPress = (job) => {
    if (isMultiSelectMode) {
      toggleJobSelection(job.id);
    } else if (viewMode === 'map') {
      handleMapJobPress(job);
    }
  };

  const toggleJobSelection = (jobId) => {
    const newSelected = new Set(selectedJobs);
    if (newSelected.has(jobId)) {
      newSelected.delete(jobId);
    } else {
      newSelected.add(jobId);
    }
    setSelectedJobs(newSelected);
  };

  const handleBulkAction = async (action) => {
    if (selectedJobs.size === 0) return;
    
    const jobIds = Array.from(selectedJobs);
    
    Alert.alert(
      `${action} Jobs`,
      `Are you sure you want to ${action.toLowerCase()} ${jobIds.length} job(s)?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: action,
          style: action === "Delete" ? "destructive" : "default",
          onPress: async () => {
            try {
              const batch = writeBatch(db);
              
              jobIds.forEach(jobId => {
                const job = jobs.find(j => j.id === jobId);
                if (!job) return;
                
                const collection_name = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
                const docId = job?.originalId || jobId.replace('guest_', '') || jobId;
                
                if (action === "Delete") {
                  batch.delete(doc(db, collection_name, docId));
                } else {
                  const newStatus = action === "Complete" ? "completed" : 
                                  action === "Schedule" ? "scheduled" : "in-progress";
                  const newProgress = action === "Complete" ? 100 : 
                                    action === "Schedule" ? 25 : 50;
                  
                  batch.update(doc(db, collection_name, docId), {
                    status: newStatus,
                    progress: newProgress,
                    updatedAt: new Date(),
                  });
                }
              });
              
              await batch.commit();
              setSelectedJobs(new Set());
              setIsMultiSelectMode(false);
              Alert.alert("Success", `${jobIds.length} job(s) ${action.toLowerCase()}d successfully`);
            } catch (error) {
              console.error('Bulk action error:', error);
              Alert.alert("Error", `Failed to ${action.toLowerCase()} jobs`);
            }
          }
        }
      ]
    );
  };

  const updateURL = (params) => {
    const newParams = { ...searchParams, ...params };
    Object.keys(newParams).forEach(key => {
      if (newParams[key] === 'all' || newParams[key] === '' || newParams[key] === null) {
        delete newParams[key];
      }
    });
    try {
      router.replace({ pathname: '/(admin-tabs)/jobs', params: newParams });
    } catch (error) {
      console.error('Navigation error:', error);
    }
  };
  
  // Expose selected IDs for BulkToolbar
  const getSelectedJobIds = () => Array.from(selectedJobs);

  const getFilteredJobs = () => {
    let filtered = Array.isArray(jobs) ? jobs : [];
    console.log('Starting filter with', filtered.length, 'jobs. Filter status:', filterStatus);
    console.log('Jobs array:', jobs?.slice(0, 3)?.map(j => ({ id: j.id, status: j.status, bookingType: j.bookingType })));
    
    // Filter by search query
    if (searchQuery && Array.isArray(filtered)) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(job => 
        job.title?.toLowerCase().includes(query) ||
        job.client?.toLowerCase().includes(query) ||
        job.address?.toLowerCase().includes(query) ||
        job.assignedToName?.toLowerCase().includes(query)
      );
    }
    
    // Filter by status with exact DB values
    if (filterStatus === 'Pending' && Array.isArray(filtered)) {
      filtered = filtered.filter(job => {
        // Show jobs that need admin action: new submissions (Pending) or awaiting employee confirmation (Schedule-Pending)
        const needsAdminAttention = job.status === 'Pending' || job.status === 'Schedule-Pending';
        
        console.log('Pending filter:', job.id, 'status:', job.status, 'needsAttention:', needsAdminAttention);
        
        return needsAdminAttention;
      });
    } else if (filterStatus !== 'all' && Array.isArray(filtered)) {
      filtered = filtered.filter(job => {
        const jobStatus = job.status || 'Pending';
        return jobStatus === filterStatus;
      });
    }
    
    // Filter by job status (complete, incomplete, scheduled)
    if (filterJobStatus === 'complete' && Array.isArray(filtered)) {
      filtered = filtered.filter(job => job.status?.toLowerCase() === 'completed');
    } else if (filterJobStatus === 'incomplete' && Array.isArray(filtered)) {
      filtered = filtered.filter(job => 
        job.status?.toLowerCase() === 'in progress' || 
        job.status?.toLowerCase() === 'in-progress'
      );
    } else if (filterJobStatus === 'scheduled' && Array.isArray(filtered)) {
      filtered = filtered.filter(job => job.status?.toLowerCase() === 'scheduled');
    }
    
    // Filter by date
    if (filterDate !== 'all') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
      
      if (Array.isArray(filtered)) {
        filtered = filtered.filter(job => {
          try {
            let jobDate;
            
            // Handle different date formats
            if (job.scheduledDate?.toDate) {
              jobDate = job.scheduledDate.toDate();
            } else if (job.scheduledDate instanceof Date) {
              jobDate = job.scheduledDate;
            } else if (typeof job.scheduledDate === 'string') {
              const dateStr = job.scheduledDate.trim();
              if (dateStr.includes('/')) {
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                  jobDate = new Date(parts[2], parts[0] - 1, parts[1]);
                }
              } else {
                jobDate = new Date(dateStr);
              }
            } else {
              return false;
            }
            
            if (!jobDate || isNaN(jobDate.getTime())) {
              return false;
            }
            
            if (filterDate === 'today') {
              // For today filter, check scheduled date OR completion date
              const isScheduledToday = jobDate.toDateString() === today.toDateString();
              
              // Also check if job was completed today
              let completedToday = false;
              if (job.completedAt) {
                let completionDate;
                if (job.completedAt?.toDate) {
                  completionDate = job.completedAt.toDate();
                } else if (job.completedAt instanceof Date) {
                  completionDate = job.completedAt;
                } else if (typeof job.completedAt === 'string') {
                  completionDate = new Date(job.completedAt);
                }
                
                if (completionDate && !isNaN(completionDate.getTime())) {
                  completedToday = completionDate.toDateString() === today.toDateString();
                }
              }
              
              return isScheduledToday || completedToday;
            }
            
            if (filterDate === 'future') {
              return jobDate > today;
            }
            
            return true;
          } catch (error) {
            console.error('Date filtering error for job:', job.id, error);
            return false;
          }
        });
      } else {
        filtered = [];
      }
    }
    
    console.log('Final filtered jobs:', filtered.length, 'Guest jobs in filtered:', filtered.filter(j => j.bookingType === 'guest').length);
    return filtered;
  };

  const filteredJobs = getFilteredJobs();

  const renderJobItem = ({ item: job }) => {
    const isPending = job.bookingType === 'guest' || 
                     job.status === 'Pending' || 
                     !job.status || 
                     (!job.assignedTo && !job.assignedToName && job.status !== 'Completed');
    
    const jobContent = (
      <TouchableOpacity 
        style={[
          styles.jobDrawerItem,
          selectedJobId === job.id && styles.jobDrawerItemSelected,
          isPending && styles.pendingJobItem,
          selectedJobs.has(job.id) && styles.selectedJobItem
        ]}
        onLongPress={() => handleLongPress(job)}
        onPress={() => handleJobPress(job)}
      >
        {isMultiSelectMode && (
          <View style={styles.checkboxContainer}>
            <View style={[styles.checkbox, selectedJobs.has(job.id) && styles.checkboxSelected]}>
              {selectedJobs.has(job.id) && <AntDesign name="check" size={12} color="#fff" />}
            </View>
          </View>
        )}
        <View style={styles.jobDrawerContent}>
          <View style={styles.jobDrawerLeft}>
            <View style={styles.jobHeader}>
              {isPending && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingText}>NEW</Text>
                </View>
              )}
              <Text style={styles.jobDrawerTitle}>{job.title}</Text>
              {job.jobType && (
                <View style={styles.jobTypeBadge}>
                  <Text style={styles.jobTypeText}>{job.jobType.replace('-', ' ')}</Text>
                </View>
              )}
            </View>
            
            <View style={styles.clientInfo}>
              <Text style={styles.jobDrawerClient}>👤 {job.client || job.contactName}</Text>
              {(job.contactNumber || job.contactPhone) && (
                viewMode === 'list' ? (
                  <TouchableOpacity onPress={() => {
                    const phoneNumber = `tel:${(job.contactNumber || job.contactPhone).replace(/\s/g, '')}`;
                    Linking.openURL(phoneNumber).catch(() => {
                      Alert.alert('Error', 'Unable to make phone call');
                    });
                  }}>
                    <Text style={styles.contactInfo}>📞 {job.contactNumber || job.contactPhone}</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.contactInfoDisabled}>📞 {job.contactNumber || job.contactPhone}</Text>
                )
              )}
            </View>
            
            <Text style={styles.jobDrawerAddress}>📍 {job.address}</Text>
            
            <View style={styles.scheduleInfo}>
              <Text style={styles.jobDrawerTime}>🗓️ {job.scheduledDate}</Text>
              {job.startTime && (
                <Text style={styles.startTime}>⏰ {job.startTime}</Text>
              )}
            </View>
            
            {job.isRecurring && (
              <View style={styles.recurringInfo}>
                <Text style={styles.recurringText}>🔄 Recurring: {job.recurringDays?.join(', ') || 'Weekly'}</Text>
              </View>
            )}
            
            {job.priority && job.priority !== 'Medium' && (
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(job.priority) }]}>
                <Text style={styles.priorityText}>{job.priority} Priority</Text>
              </View>
            )}
            
            {job.notes && (
              <Text style={styles.jobNotes} numberOfLines={2}>💬 {job.notes}</Text>
            )}
            
            <Text style={styles.assignedTo}>
              👷 Assigned: {job.assignedEmployees?.length > 0 
                ? `${job.assignedEmployees.length} employees (${job.assignedEmployees.map(emp => emp.name).join(', ')})`
                : job.assignedToName || 'Unassigned'
              }
            </Text>
            
            <View style={styles.jobActionButtons}>
              {(job.assignedEmployees?.length > 0 || job.assignedToName) && (
                <TouchableOpacity 
                  style={styles.tasksButton}
                  onPress={() => router.push(`/job-tasks/${job.id}`)}
                >
                  <MaterialIcons name="assignment" size={14} color="#8b5cf6" />
                  <Text style={styles.tasksButtonText}>Manage Tasks</Text>
                </TouchableOpacity>
              )}
              
              {(job.assignedEmployees?.length > 0 || job.assignedToName) && (
                <TouchableOpacity 
                  style={styles.reallocateButton}
                  onPress={() => handleAllocateEmployee(job.id)}
                >
                  <MaterialIcons name="swap-horiz" size={14} color="#f59e0b" />
                  <Text style={styles.reallocateButtonText}>Reallocate</Text>
                </TouchableOpacity>
              )}
              
              {(!job.assignedEmployees?.length && !job.assignedToName) && (
                <TouchableOpacity 
                  style={styles.addTasksButton}
                  onPress={() => router.push(`/job-tasks/${job.id}`)}
                >
                  <MaterialIcons name="add-task" size={14} color="#10b981" />
                  <Text style={styles.addTasksButtonText}>Add Tasks</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {/* Conditional Accept/Allocate buttons based on job status and assignment */}
            {(() => {
              const status = job.status?.toLowerCase() || 'pending';
              const hasNoEmployees = (!job.assignedEmployees || job.assignedEmployees.length === 0) && !job.assignedTo && !job.assignedToName;
              
              // Show Accept button for new jobs
              const showAcceptButton = status === 'pending';
              
              // Show Allocate button for accepted jobs without employees
              const showAllocateButton = status === 'accepted' && hasNoEmployees;
              
              // Don't show buttons for jobs that are scheduled or beyond
              const isScheduledOrBeyond = ['scheduled', 'schedule-pending', 'in progress', 'completed'].includes(status);
              
              if ((showAcceptButton || showAllocateButton) && !isScheduledOrBeyond) {
                return (
                  <View style={styles.pendingActions}>
                    {showAcceptButton && (
                      <TouchableOpacity 
                        style={styles.acceptButton}
                        onPress={() => handleAcceptJob(job.id)}
                      >
                        <Text style={styles.acceptButtonText}>Accept</Text>
                      </TouchableOpacity>
                    )}
                    {showAllocateButton && (
                      <TouchableOpacity 
                        style={styles.allocateButton}
                        onPress={() => handleAllocateEmployee(job.id)}
                      >
                        <Text style={styles.allocateButtonText}>Allocate</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }
              return null;
            })()}
          </View>
          <View style={styles.jobDrawerRight}>
            <View style={[styles.jobDrawerStatus, { backgroundColor: getStatusColor(job.status) }]}>
              <Text style={styles.jobDrawerStatusText}>{job.status || 'pending'}</Text>
            </View>
            <Text style={styles.progressText}>{job.progress || 0}%</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
    
    // Only allow swipe-to-delete in List View
    if (viewMode === 'list') {
      return (
        <Swipeable renderRightActions={() => renderRightActions(job.id)}>
          {jobContent}
        </Swipeable>
      );
    }
    
    return jobContent;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Job Management</Text>
          <Text style={styles.headerSubtitle}>
            {isMultiSelectMode ? `${selectedJobs.size} selected` : `${Array.isArray(filteredJobs) ? filteredJobs.length : 0} total jobs`}
          </Text>
        </View>
        <View style={styles.headerActions}>
          {isMultiSelectMode ? (
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => {
                setIsMultiSelectMode(false);
                setSelectedJobs(new Set());
              }}
            >
              <AntDesign name="close" size={16} color="#fff" />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity 
                style={styles.multiSelectButton}
                onPress={() => setIsMultiSelectMode(true)}
              >
                <MaterialIcons name="checklist" size={16} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.filterButton, filterStatus === 'Pending' && styles.filterButtonActive]}
                onPress={() => {
                  const newStatus = filterStatus === 'Pending' ? 'all' : 'Pending';
                  setFilterStatus(newStatus);
                  updateURL({ status: newStatus });
                }}
              >
                <MaterialIcons name="pending-actions" size={16} color={filterStatus === 'Pending' ? '#4facfe' : '#fff'} />
                <Text style={[styles.filterButtonText, filterStatus === 'Pending' && styles.filterButtonTextActive]}>
                  Pending
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => router.push('/add-job')}
              >
                <AntDesign name="plus" size={20} color="#fff" />
              </TouchableOpacity>
            </>
          )}
        </View>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <AntDesign name="search1" size={16} color="#6b7280" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search jobs, clients, addresses..."
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            updateURL({ search: text });
          }}
        />
      </View>

      <View style={styles.controls}>
        <View style={styles.viewToggle}>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'map' && styles.toggleButtonActive]}
            onPress={() => setViewMode('map')}
          >
            <Feather name="map" size={14} color={viewMode === 'map' ? '#fff' : '#4facfe'} />
            <Text style={[styles.toggleText, viewMode === 'map' && styles.toggleTextActive]}>Map</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.toggleButton, viewMode === 'list' && styles.toggleButtonActive]}
            onPress={() => setViewMode('list')}
          >
            <Feather name="list" size={14} color={viewMode === 'list' ? '#fff' : '#4facfe'} />
            <Text style={[styles.toggleText, viewMode === 'list' && styles.toggleTextActive]}>List</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterToggle}>
          {['all', 'today', 'future'].map((filter) => (
            <TouchableOpacity 
              key={filter}
              style={[styles.filterToggleButton, filterDate === filter && styles.filterToggleButtonActive]}
              onPress={() => {
                setFilterDate(filter);
                updateURL({ date: filter });
              }}
            >
              <Text style={[styles.filterToggleText, filterDate === filter && styles.filterToggleTextActive]}>
                {filter === 'all' ? 'All' : filter === 'today' ? 'Today' : 'Future'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {viewMode === 'map' && (
        <View style={styles.statusFilters}>
          {['all', 'complete', 'incomplete', 'scheduled'].map((status) => (
            <TouchableOpacity 
              key={status}
              style={[styles.statusFilterButton, filterJobStatus === status && styles.statusFilterButtonActive]}
              onPress={() => setFilterJobStatus(status)}
            >
              <Text style={[styles.statusFilterText, filterJobStatus === status && styles.statusFilterTextActive]}>
                {status === 'all' ? 'All Jobs' : status === 'complete' ? 'Complete' : status === 'incomplete' ? 'In Progress' : 'Scheduled'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {viewMode === 'list' && (
        <View style={styles.statusFilters}>
          {['all', 'complete', 'incomplete', 'scheduled'].map((status) => (
            <TouchableOpacity 
              key={status}
              style={[styles.statusFilterButton, filterJobStatus === status && styles.statusFilterButtonActive]}
              onPress={() => setFilterJobStatus(status)}
            >
              <Text style={[styles.statusFilterText, filterJobStatus === status && styles.statusFilterTextActive]}>
                {status === 'all' ? 'All Jobs' : status === 'complete' ? 'Complete' : status === 'incomplete' ? 'In Progress' : 'Scheduled'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {viewMode === 'map' ? (
        <View style={styles.mapContainer}>
          <View style={styles.mapWrapper}>
            <LiveMap 
              jobs={Array.isArray(filteredJobs) ? filteredJobs : []} 
              onJobSelect={handleMapJobPress}
              onJobLongPress={handleMapJobLongPress}
              selectedJobId={selectedJobId}
              includePast={true}
              showLocateButton={true}
              locateButtonStyle="transparent"
            />
          </View>
          
          <View style={styles.jobDrawer}>
            <View style={styles.jobDrawerHeader}>
              <Text style={styles.jobDrawerTitle}>Jobs Overview</Text>
              <Text style={styles.jobDrawerCount}>{Array.isArray(filteredJobs) ? filteredJobs.length : 0} jobs</Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.jobDrawerList}
            >
              {Array.isArray(filteredJobs) ? filteredJobs.map((job) => (
                <View key={`job_${job.id}`}>
                  {renderJobItem({ item: job })}
                </View>
              )) : null}
            </ScrollView>
          </View>
        </View>
      ) : (
        <FlatList
          data={Array.isArray(filteredJobs) ? filteredJobs : []}
          renderItem={renderJobItem}
          keyExtractor={(item) => `job_${item.id}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <AntDesign name="inbox" size={48} color="#9ca3af" />
              <Text style={styles.emptyText}>No jobs found</Text>
            </View>
          )}
        />
      )}
      
      {/* Job Details Panel */}
      <JobDetailsPanel
        visible={showJobDetailsPanel}
        jobId={selectedJobForDetails}
        onClose={() => {
          setShowJobDetailsPanel(false);
          setSelectedJobForDetails(null);
        }}
      />
      
      {/* Bulk Actions Bar */}
      {isMultiSelectMode && selectedJobs.size > 0 && (
        <View style={styles.bulkActionsBar}>
          <TouchableOpacity 
            style={[styles.bulkActionButton, styles.completeButton]}
            onPress={() => handleBulkAction('Complete')}
          >
            <MaterialIcons name="check-circle" size={16} color="#fff" />
            <Text style={styles.bulkActionText}>Complete</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.bulkActionButton, styles.scheduleButton]}
            onPress={() => handleBulkAction('Schedule')}
          >
            <MaterialIcons name="schedule" size={16} color="#fff" />
            <Text style={styles.bulkActionText}>Schedule</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.bulkActionButton, styles.deleteButton]}
            onPress={() => handleBulkAction('Delete')}
          >
            <MaterialIcons name="delete" size={16} color="#fff" />
            <Text style={styles.bulkActionText}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    elevation: 8,
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: "#fff",
  },
  filterButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  filterButtonTextActive: {
    color: "#4facfe",
  },
  addButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  controls: {
    flexDirection: "row",
    padding: 8,
    gap: 8,
  },
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    flex: 1,
  },
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  toggleButtonActive: {
    backgroundColor: "#4facfe",
  },
  toggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4facfe",
  },
  toggleTextActive: {
    color: "#fff",
  },
  filterToggle: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    flex: 1,
  },
  filterToggleButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterToggleButtonActive: {
    backgroundColor: "#10b981",
  },
  filterToggleText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10b981",
  },
  filterToggleTextActive: {
    color: "#fff",
  },
  mapContainer: {
    flex: 1,
  },
  mapWrapper: {
    height: '50%',
  },
  map: {
    flex: 1,
  },
  jobDrawer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 8,
    paddingTop: 16,
  },
  jobDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  jobDrawerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
  },
  jobDrawerCount: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  jobDrawerList: {
    paddingHorizontal: 16,
  },
  jobDrawerItem: {
    width: 320,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 180,
  },
  jobDrawerItemSelected: {
    borderColor: '#4facfe',
    backgroundColor: '#eff6ff',
  },
  jobDrawerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  jobDrawerLeft: {
    flex: 1,
  },
  jobDrawerClient: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 2,
  },
  jobDrawerAddress: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  jobDrawerTime: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 2,
  },
  assignedTo: {
    fontSize: 11,
    color: '#8b5cf6',
    fontWeight: '600',
  },
  jobDrawerRight: {
    alignItems: 'flex-end',
  },
  jobDrawerStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  jobDrawerStatusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  progressText: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  calloutContainer: {
    width: 220,
    padding: 10,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  calloutClient: {
    fontSize: 12,
    color: "#4b5563",
    marginBottom: 2,
  },
  calloutAddress: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  calloutAssigned: {
    fontSize: 11,
    color: "#8b5cf6",
    marginBottom: 2,
    fontWeight: "600",
  },
  calloutStatus: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: "#6b7280",
    marginTop: 16,
    fontWeight: "600",
  },
  employeeMarker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#10b981",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  employeeMarkerText: {
    fontSize: 16,
  },
  rightActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 16,
  },
  actionButton: {
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    height: "100%",
    borderRadius: 12,
    marginLeft: 8,
  },
  deleteButton: {
    backgroundColor: "#ef4444",
  },
  actionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  pendingJobItem: {
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  jobHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    flexWrap: "wrap",
    gap: 6,
  },
  jobTypeBadge: {
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  jobTypeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  clientInfo: {
    marginBottom: 4,
  },
  contactInfo: {
    fontSize: 12,
    color: "#059669",
    marginTop: 2,
    fontWeight: "500",
  },
  contactInfoDisabled: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
    fontWeight: "500",
  },
  scheduleInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 4,
  },
  startTime: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  recurringInfo: {
    marginBottom: 4,
  },
  recurringText: {
    fontSize: 11,
    color: "#7c3aed",
    fontWeight: "600",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginBottom: 4,
    alignSelf: "flex-start",
  },
  priorityText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  jobNotes: {
    fontSize: 11,
    color: "#4b5563",
    fontStyle: "italic",
    marginBottom: 4,
    lineHeight: 16,
  },
  pendingBadge: {
    backgroundColor: "#f59e0b",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 8,
  },
  pendingText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  pendingActions: {
    flexDirection: "row",
    marginTop: 8,
    gap: 8,
  },
  acceptButton: {
    backgroundColor: "#10b981",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  acceptButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  allocateButton: {
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  allocateButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  jobActionButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 8,
    gap: 6,
  },
  tasksButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  tasksButtonText: {
    fontSize: 11,
    color: "#8b5cf6",
    fontWeight: "600",
  },
  reallocateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fef3c7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  reallocateButtonText: {
    fontSize: 11,
    color: "#f59e0b",
    fontWeight: "600",
  },
  addTasksButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#d1fae5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  addTasksButtonText: {
    fontSize: 11,
    color: "#10b981",
    fontWeight: "600",
  },
  statusFilters: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingBottom: 8,
    gap: 6,
  },
  statusFilterButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  statusFilterButtonActive: {
    backgroundColor: "#8b5cf6",
    borderColor: "#8b5cf6",
  },
  statusFilterText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6b7280",
  },
  statusFilterTextActive: {
    color: "#fff",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: "#1f2937",
  },
  multiSelectButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  cancelButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  checkboxContainer: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxSelected: {
    backgroundColor: "#4facfe",
    borderColor: "#4facfe",
  },
  selectedJobItem: {
    borderColor: "#4facfe",
    backgroundColor: "#eff6ff",
  },
  bulkActionsBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    elevation: 8,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  bulkActionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    gap: 6,
  },
  completeButton: {
    backgroundColor: "#10b981",
  },
  scheduleButton: {
    backgroundColor: "#8b5cf6",
  },
  bulkActionText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },

});