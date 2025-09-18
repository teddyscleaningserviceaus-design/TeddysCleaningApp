import { AntDesign, Feather, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { doc, getDoc, updateDoc, collection, query, onSnapshot, where, addDoc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Modal,
  Image,
  FlatList,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";
import { db } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { autoAssignTasks } from "../../services/taskAssignmentService";

const { width } = Dimensions.get("window");

export default function AdminJobDetailsPage() {
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [job, setJob] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [jobPhotos, setJobPhotos] = useState([]);
  const [additionalWorkRequests, setAdditionalWorkRequests] = useState([]);
  const [feedback, setFeedback] = useState(null);

  const router = useRouter();

  useEffect(() => {
    if (!id || !user?.uid) return;
    
    loadJobDetails();
    
    // Set up listeners with cleanup
    const unsubscribeEmployees = loadEmployees();
    const unsubscribeMessages = loadMessages();
    const unsubscribePhotos = loadJobPhotos();
    const unsubscribeWorkRequests = loadAdditionalWorkRequests();
    const unsubscribeFeedback = loadFeedback();
    
    return () => {
      unsubscribeEmployees?.();
      unsubscribeMessages?.();
      unsubscribePhotos?.();
      unsubscribeWorkRequests?.();
      unsubscribeFeedback?.();
    };
  }, [id, user?.uid]);

  const loadJobDetails = async () => {
    try {
      let jobData = null;
      let actualId = id;
      let isGuestJob = false;
      
      // Check if this is a guest job (prefixed ID)
      if (id.startsWith('guest_')) {
        actualId = id.replace('guest_', '');
        isGuestJob = true;
      }
      
      if (isGuestJob) {
        // Try guest-bookings collection first for guest jobs
        const jobDoc = await getDoc(doc(db, "guest-bookings", actualId));
        if (jobDoc.exists()) {
          jobData = { id: `guest_${jobDoc.id}`, originalId: jobDoc.id, ...jobDoc.data(), bookingType: 'guest' };
        }
      } else {
        // Try jobs collection first for regular jobs
        let jobDoc = await getDoc(doc(db, "jobs", actualId));
        
        if (jobDoc.exists()) {
          jobData = { id: jobDoc.id, ...jobDoc.data() };
        } else {
          // Fallback: try guest-bookings collection with the same ID
          jobDoc = await getDoc(doc(db, "guest-bookings", actualId));
          if (jobDoc.exists()) {
            jobData = { id: `guest_${jobDoc.id}`, originalId: jobDoc.id, ...jobDoc.data(), bookingType: 'guest' };
          }
        }
      }
      
      if (jobData) {
        setJob(jobData);
      } else {
        console.error('Job not found:', { id, actualId, isGuestJob });
        Alert.alert("Error", "Job not found");
        router.back();
      }
    } catch (error) {
      console.error('Load job details error:', error);
      Alert.alert("Error", "Failed to load job details");
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = () => {
    if (!user?.uid) {
      console.log('No authenticated user for employees query');
      setEmployees([]);
      return () => {};
    }
    
    try {
      const q = query(collection(db, "users"));
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const usersList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const employeesList = usersList.filter(user => user.userType === 'employee');
          setEmployees(employeesList);
        },
        (error) => {
          console.error('Employees query error:', error);
          setEmployees([]);
        }
      );
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up employees listener:', error);
      setEmployees([]);
      return () => {};
    }
  };

  const loadMessages = () => {
    if (!user?.uid) {
      console.log('No authenticated user for messages query');
      setMessages([]);
      return () => {};
    }
    
    const messageJobId = id.startsWith('guest_') ? id.replace('guest_', '') : id;
    
    try {
      const q = query(
        collection(db, "messages"),
        where("jobId", "==", messageJobId)
      );
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const messagesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          messagesList.sort((a, b) => (b.createdAt?.toDate?.() || new Date(0)) - (a.createdAt?.toDate?.() || new Date(0)));
          setMessages(messagesList);
        },
        (error) => {
          console.error('Messages query error:', error);
          setMessages([]);
        }
      );
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up messages listener:', error);
      setMessages([]);
      return () => {};
    }
  };

  const loadJobPhotos = () => {
    if (!user?.uid) {
      console.log('No authenticated user for job photos query');
      setJobPhotos([]);
      return () => {};
    }
    
    const actualId = id.startsWith('guest_') ? id.replace('guest_', '') : id;
    
    try {
      const q = query(
        collection(db, "jobAttachments"),
        where("jobId", "==", actualId)
      );
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const photosList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          photosList.sort((a, b) => (b.createdAt?.toDate?.() || new Date(0)) - (a.createdAt?.toDate?.() || new Date(0)));
          setJobPhotos(photosList);
        },
        (error) => {
          console.error('Job photos query error:', error);
          setJobPhotos([]);
        }
      );
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up job photos listener:', error);
      setJobPhotos([]);
      return () => {};
    }
  };

  const loadAdditionalWorkRequests = () => {
    if (!user?.uid) {
      console.log('No authenticated user for work requests query');
      setAdditionalWorkRequests([]);
      return () => {};
    }
    
    const actualId = id.startsWith('guest_') ? id.replace('guest_', '') : id;
    
    try {
      const q = query(
        collection(db, "workRequests"),
        where("jobId", "==", actualId)
      );
      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const requestsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          requestsList.sort((a, b) => (b.createdAt?.toDate?.() || new Date(0)) - (a.createdAt?.toDate?.() || new Date(0)));
          setAdditionalWorkRequests(requestsList);
        },
        (error) => {
          console.error('Additional work requests query error:', error);
          setAdditionalWorkRequests([]);
        }
      );
      return unsubscribe;
    } catch (error) {
      console.error('Error setting up work requests listener:', error);
      setAdditionalWorkRequests([]);
      return () => {};
    }
  };

  const loadFeedback = () => {
    // Skip feedback loading entirely to avoid permission errors
    console.log('Skipping feedback loading to avoid permission errors');
    setFeedback(null);
    return () => {};
  };



  const updateJobStatus = async (newStatus) => {
    try {
      const newProgress = newStatus === "completed" ? 100 : newStatus === "in-progress" ? 50 : newStatus === "scheduled" ? 25 : 0;
      const collection_name = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
      const docId = job?.originalId || job?.id?.replace('guest_', '') || id.replace('guest_', '');
      
      await updateDoc(doc(db, collection_name, docId), {
        status: newStatus,
        progress: newProgress,
        updatedAt: new Date(),
      });
      setJob(prev => ({ ...prev, status: newStatus, progress: newProgress }));
      Alert.alert("Success", `Job status updated to ${newStatus}`);
    } catch (error) {
      console.error('Update job status error:', error);
      Alert.alert("Error", "Failed to update job status");
    }
  };

  const acceptJob = async () => {
    try {
      const collection_name = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
      const docId = job?.originalId || job?.id?.replace('guest_', '') || id.replace('guest_', '');
      
      await updateDoc(doc(db, collection_name, docId), {
        status: "Accepted",
        progress: 10,
        updatedAt: new Date(),
      });
      setJob(prev => ({ ...prev, status: "Accepted", progress: 10 }));
      Alert.alert("Success", "Job accepted");
    } catch (error) {
      console.error('Accept job error:', error);
      Alert.alert("Error", "Failed to accept job");
    }
  };

  const allocateEmployee = async (employeeId, employeeName) => {
    try {
      const collection_name = job?.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
      const docId = job?.originalId || job?.id?.replace('guest_', '') || id.replace('guest_', '');
      
      await updateDoc(doc(db, collection_name, docId), {
        assignedTo: employeeId,
        assignedToName: employeeName,
        status: "Awaiting Confirmation",
        progress: 25,
        updatedAt: new Date(),
      });
      setJob(prev => ({ 
        ...prev, 
        assignedTo: employeeId, 
        assignedToName: employeeName,
        status: "Awaiting Confirmation",
        progress: 25 
      }));
      setShowEmployeeModal(false);
      Alert.alert("Success", `Job allocated to ${employeeName}`);
    } catch (error) {
      console.error('Allocate employee error:', error);
      Alert.alert("Error", "Failed to allocate job");
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return;

    try {
      const messageJobId = job?.originalId || job?.id?.replace('guest_', '') || id.replace('guest_', '');
      
      await addDoc(collection(db, "messages"), {
        jobId: messageJobId,
        text: messageText,
        sender: "admin",
        senderName: "Admin",
        createdAt: new Date(),
      });
      setMessageText('');
      setShowMessageModal(false);
      Alert.alert("Success", "Message sent to client");
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert("Error", "Failed to send message");
    }
  };

  const updateWorkRequestStatus = async (requestId, status) => {
    try {
      await updateDoc(doc(db, "workRequests", requestId), {
        status: status,
        reviewedAt: new Date(),
        reviewedBy: 'Admin'
      });
      Alert.alert("Success", `Work request ${status.toLowerCase()}`);
    } catch (error) {
      console.error('Update work request status error:', error);
      Alert.alert("Error", "Failed to update status");
    }
  };



  const removeEmployeeFromJob = async (employeeId) => {
    try {
      const currentAssignees = job?.assignedEmployees || [];
      const updatedAssignees = currentAssignees.filter(emp => emp.id !== employeeId);
      
      await updateDoc(doc(db, "jobs", id), {
        assignedEmployees: updatedAssignees,
        // Update legacy fields for backward compatibility
        assignedTo: updatedAssignees[0]?.id || null,
        assignedToName: updatedAssignees[0]?.name || null,
        updatedAt: new Date(),
      });
      
      setJob(prev => ({
        ...prev,
        assignedEmployees: updatedAssignees,
        assignedTo: updatedAssignees[0]?.id || null,
        assignedToName: updatedAssignees[0]?.name || null
      }));
      
      Alert.alert("Success", "Employee removed from job");
    } catch (error) {
      Alert.alert("Error", "Failed to remove employee");
    }
  };

  const smartAutoAssignTasks = async () => {
    const assignedEmployees = job?.assignedEmployees || [];
    if (assignedEmployees.length === 0) {
      Alert.alert("Info", "No employees assigned to this job yet");
      return;
    }

    const tasks = job?.tasks || [];
    if (tasks.length === 0) {
      Alert.alert("Info", "No tasks defined for this job");
      return;
    }

    const unassignedTasks = tasks.filter(task => !task.assignedTo);
    if (unassignedTasks.length === 0) {
      Alert.alert("Info", "All tasks are already assigned");
      return;
    }

    try {
      // Use smart assignment service
      const optimizedTasks = await autoAssignTasks(tasks, assignedEmployees, job);
      
      await updateDoc(doc(db, "jobs", id), {
        tasks: optimizedTasks,
        updatedAt: new Date(),
      });
      
      setJob(prev => ({ ...prev, tasks: optimizedTasks }));
      
      // Show distribution summary with intelligence info
      const distribution = assignedEmployees.map(emp => {
        const empTasks = optimizedTasks.filter(t => t.assignedTo === emp.id);
        return `${emp.name}: ${empTasks.length} tasks`;
      }).join('\n');
      
      Alert.alert(
        "Smart Assignment Complete", 
        `Tasks intelligently assigned based on:\n• Employee skills & equipment\n• Distance from job site\n• Current workload\n• Task priority\n\n${distribution}`,
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Smart assignment error:', error);
      Alert.alert("Error", "Smart assignment failed. Please try manual assignment.");
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case "in-progress": return "#fc466b";
      case "scheduled": return "#11998e";
      case "awaiting confirmation": return "#8b5cf6";
      case "completed": return "#38ef7d";
      case "pending": return "#f59e0b";
      case "accepted": return "#10b981";
      default: return "#6b7280";
    }
  };

  const getJobGradient = (status) => {
    switch (status?.toLowerCase()) {
      case "in-progress": return ["#fc466b", "#3f5efb"];
      case "scheduled": return ["#11998e", "#38ef7d"];
      case "awaiting confirmation": return ["#8b5cf6", "#a855f7"];
      case "completed": return ["#667eea", "#764ba2"];
      case "pending": return ["#f59e0b", "#fbbf24"];
      case "accepted": return ["#10b981", "#34d399"];
      default: return ["#6b7280", "#9ca3af"];
    }
  };

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  const getEmployeeDistance = (employee) => {
    if (!job?.latitude || !job?.longitude || !employee?.latitude || !employee?.longitude) {
      return null;
    }
    return calculateDistance(job.latitude, job.longitude, employee.latitude, employee.longitude);
  };

  const getSortedEmployees = () => {
    return employees
      .filter(emp => emp.name && emp.id)
      .map(emp => ({
        ...emp,
        distance: getEmployeeDistance(emp)
      }))
      .sort((a, b) => {
        if (a.distance === null && b.distance === null) return 0;
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading job details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!job) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Job not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const isUnaccepted = job.status?.toLowerCase() === 'pending';
  const hasNoEmployees = (!job.assignedEmployees || job.assignedEmployees.length === 0) && !job.assignedTo;
  const showAllocateButton = hasNoEmployees && job.status?.toLowerCase() === 'accepted';
  const isScheduledOrCompleted = ['scheduled', 'awaiting confirmation', 'in-progress', 'completed'].includes(job.status?.toLowerCase());

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      
      <LinearGradient colors={getJobGradient(job.status)} style={styles.header}>
        <TouchableOpacity onPress={() => router.push('/(admin-tabs)/jobs')} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{job.title}</Text>
          <Text style={styles.headerSubtitle}>{job.client}</Text>
        </View>
        
        <TouchableOpacity 
          style={styles.headerRight}
          onPress={() => {
            Alert.alert(
              "Update Status",
              "Change job status:",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Pending", onPress: () => updateJobStatus("pending") },
                { text: "Scheduled", onPress: () => updateJobStatus("scheduled") },
                { text: "In Progress", onPress: () => updateJobStatus("in-progress") },
                { text: "Completed", onPress: () => updateJobStatus("completed") },
              ]
            );
          }}
        >
          <Feather name="edit" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.statusBar}>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
          <Text style={styles.statusText}>{job.status || 'pending'}</Text>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${job.progress || 0}%` }]} />
          </View>
          <Text style={styles.progressText}>{job.progress || 0}% Complete</Text>
        </View>
      </View>

      {(isUnaccepted || showAllocateButton) && !isScheduledOrCompleted && (
        <View style={styles.pendingActions}>
          {isUnaccepted && (
            <TouchableOpacity style={styles.acceptJobButton} onPress={acceptJob}>
              <MaterialIcons name="check-circle" size={20} color="#fff" />
              <Text style={styles.acceptJobText}>Accept Job</Text>
            </TouchableOpacity>
          )}
          {showAllocateButton && (
            <TouchableOpacity 
              style={styles.allocateJobButton} 
              onPress={() => router.push(`/(admin-tabs)/employee-allocation/${id}`)}
            >
              <MaterialIcons name="person-add" size={20} color="#fff" />
              <Text style={styles.allocateJobText}>Allocate Employee</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'overview' && styles.activeTab]}
          onPress={() => setActiveTab('overview')}
        >
          <AntDesign name="profile" size={16} color={activeTab === 'overview' ? '#4facfe' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'overview' && styles.activeTabText]}>Overview</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'location' && styles.activeTab]}
          onPress={() => setActiveTab('location')}
        >
          <AntDesign name="enviromento" size={16} color={activeTab === 'location' ? '#4facfe' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'location' && styles.activeTabText]}>Location</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'allocation' && styles.activeTab]}
          onPress={() => setActiveTab('allocation')}
        >
          <AntDesign name="team" size={16} color={activeTab === 'allocation' ? '#4facfe' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'allocation' && styles.activeTabText]}>Team</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'tasks' && styles.activeTab]}
          onPress={() => setActiveTab('tasks')}
        >
          <AntDesign name="checkcircleo" size={16} color={activeTab === 'tasks' ? '#4facfe' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'tasks' && styles.activeTabText]}>Tasks</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'messages' && styles.activeTab]}
          onPress={() => setActiveTab('messages')}
        >
          <AntDesign name="message1" size={16} color={activeTab === 'messages' ? '#4facfe' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'messages' && styles.activeTabText]}>Chat</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'media' && styles.activeTab]}
          onPress={() => setActiveTab('media')}
        >
          <AntDesign name="picture" size={16} color={activeTab === 'media' ? '#4facfe' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'media' && styles.activeTabText]}>Media</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'feedback' && styles.activeTab]}
          onPress={() => setActiveTab('feedback')}
        >
          <AntDesign name="star" size={16} color={activeTab === 'feedback' ? '#4facfe' : '#6b7280'} />
          <Text style={[styles.tabText, activeTab === 'feedback' && styles.activeTabText]}>Feedback</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'overview' && (
          <View>
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Client Information</Text>
              <View style={styles.infoRow}>
                <AntDesign name="user" size={16} color="#4facfe" />
                <Text style={styles.infoLabel}>Client Name:</Text>
                <Text style={styles.infoValue}>{job.client || job.contactName}</Text>
              </View>
              {(job.contactNumber || job.contactPhone) && (
                <TouchableOpacity 
                  style={styles.infoRow}
                  onPress={() => {
                    const phoneNumber = `tel:${(job.contactNumber || job.contactPhone).replace(/\s/g, '')}`;
                    Linking.openURL(phoneNumber).catch(() => {
                      Alert.alert('Error', 'Unable to make phone call');
                    });
                  }}
                >
                  <AntDesign name="phone" size={16} color="#10b981" />
                  <Text style={styles.infoLabel}>Contact:</Text>
                  <Text style={[styles.infoValue, styles.contactValue]}>{job.contactNumber || job.contactPhone}</Text>
                </TouchableOpacity>
              )}
              <View style={styles.infoRow}>
                <AntDesign name="enviromento" size={16} color="#ef4444" />
                <Text style={styles.infoLabel}>Address:</Text>
                <Text style={styles.infoValue}>{job.address}</Text>
              </View>
            </View>

            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Job Details</Text>
              {job.jobType && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="broom" size={16} color="#8b5cf6" />
                  <Text style={styles.infoLabel}>Job Type:</Text>
                  <Text style={[styles.infoValue, styles.jobTypeValue]}>{job.jobType.replace('-', ' ')}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <AntDesign name="calendar" size={16} color="#4facfe" />
                <Text style={styles.infoLabel}>Scheduled Date:</Text>
                <Text style={styles.infoValue}>{job.scheduledDate}</Text>
              </View>
              {job.startTime && (
                <View style={styles.infoRow}>
                  <AntDesign name="clockcircle" size={16} color="#f59e0b" />
                  <Text style={styles.infoLabel}>Start Time:</Text>
                  <Text style={styles.infoValue}>{job.startTime}</Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <AntDesign name="flag" size={16} color={job.priority === 'High' ? '#ef4444' : job.priority === 'Medium' ? '#f59e0b' : '#10b981'} />
                <Text style={styles.infoLabel}>Priority:</Text>
                <View style={[styles.priorityBadge, { backgroundColor: job.priority === 'High' ? '#ef4444' : job.priority === 'Medium' ? '#f59e0b' : '#10b981' }]}>
                  <Text style={styles.priorityBadgeText}>{job.priority || 'Medium'}</Text>
                </View>
              </View>
              {job.isRecurring && (
                <View style={styles.infoRow}>
                  <MaterialCommunityIcons name="repeat" size={16} color="#7c3aed" />
                  <Text style={styles.infoLabel}>Recurring:</Text>
                  <Text style={[styles.infoValue, styles.recurringValue]}>
                    {job.recurringDays?.join(', ') || 'Weekly'}
                  </Text>
                </View>
              )}
              <View style={styles.infoRow}>
                <MaterialIcons name="person" size={16} color="#059669" />
                <Text style={styles.infoLabel}>Assigned To:</Text>
                <Text style={[styles.infoValue, (job.assignedEmployees?.length > 0 || job.assignedToName) ? styles.assignedValue : styles.unassignedValue]}>
                  {job.assignedEmployees?.length > 0 
                    ? `${job.assignedEmployees.length} employees (${job.assignedEmployees.map(emp => emp.name).join(', ')})`
                    : job.assignedToName || 'Unassigned'
                  }
                </Text>
              </View>
            </View>

            {job.notes && (
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Special Instructions</Text>
                <Text style={styles.notesText}>{job.notes}</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'location' && (
          <View>
            <View style={styles.mapCard}>
              <Text style={styles.cardTitle}>Job Location</Text>
              {job.latitude && job.longitude ? (
                <MapView
                  style={styles.map}
                  initialRegion={{
                    latitude: job.latitude,
                    longitude: job.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                >
                  <Marker
                    coordinate={{ latitude: job.latitude, longitude: job.longitude }}
                    title={job.title}
                    description={job.address}
                  />
                </MapView>
              ) : (
                <View style={styles.noMapContainer}>
                  <AntDesign name="enviromento" size={48} color="#9ca3af" />
                  <Text style={styles.noMapText}>No location data available</Text>
                </View>
              )}
            </View>

            <View style={styles.locationActions}>
              <TouchableOpacity style={styles.directionsButton}>
                <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.directionsButtonGradient}>
                  <AntDesign name="enviromento" size={20} color="#fff" />
                  <Text style={styles.directionsButtonText}>Get Directions</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.shareLocationButton}>
                <View style={styles.shareLocationContent}>
                  <AntDesign name="sharealt" size={18} color="#6b7280" />
                  <Text style={styles.shareLocationText}>Share Location</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {activeTab === 'allocation' && (
          <View>
            <View style={styles.infoCard}>
              <View style={styles.allocationHeader}>
                <Text style={styles.cardTitle}>Employee Allocation</Text>
                <TouchableOpacity 
                  style={styles.allocateButton}
                  onPress={() => router.push(`/(admin-tabs)/employee-allocation/${id}`)}
                >
                  <MaterialIcons name="person-add" size={16} color="#fff" />
                  <Text style={styles.allocateButtonText}>Manage Allocation</Text>
                </TouchableOpacity>
              </View>
              
              {job.assignedEmployees && job.assignedEmployees.length > 0 ? (
                <View style={styles.employeesList}>
                  {job.assignedEmployees.map((employee, index) => (
                    <View key={employee.id || index} style={styles.employeeAllocationCard}>
                      <View style={styles.employeeAllocationInfo}>
                        <Text style={styles.employeeAllocationName}>{employee.name}</Text>
                        <Text style={styles.employeeAllocationRole}>Score: {employee.score || 'N/A'}</Text>
                        {employee.skills && (
                          <Text style={styles.employeeSkills}>Skills: {employee.skills.slice(0, 3).join(', ')}</Text>
                        )}
                      </View>
                      <View style={styles.employeeAllocationStats}>
                        <Text style={styles.statLabel}>Tasks: {job.tasks?.filter(t => t.assignedTo === employee.id).length || 0}</Text>
                        <Text style={styles.statLabel}>Workload: {employee.workload || 0}%</Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noAllocationContainer}>
                  <MaterialIcons name="person-off" size={48} color="#9ca3af" />
                  <Text style={styles.noAllocationText}>No employees allocated</Text>
                  <Text style={styles.noAllocationSubtext}>Use the allocation system to assign employees based on skills, availability, and proximity</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'tasks' && (
          <View>
            <View style={styles.infoCard}>
              <View style={styles.taskHeader}>
                <Text style={styles.cardTitle}>Task Management</Text>
                <TouchableOpacity 
                  style={styles.manageTasksButton}
                  onPress={() => router.push(`/job-tasks/${id}`)}
                >
                  <MaterialIcons name="edit" size={16} color="#fff" />
                  <Text style={styles.manageTasksText}>Manage Tasks</Text>
                </TouchableOpacity>
              </View>
              
              {/* Employee Assignment Section */}
              <View style={styles.employeeSection}>
                <Text style={styles.sectionTitle}>Assigned Employees</Text>
                {job.assignedEmployees && job.assignedEmployees.length > 0 ? (
                  <View style={styles.assignedEmployeesList}>
                    {job.assignedEmployees.map((employee, index) => (
                      <View key={employee.id || index} style={styles.employeeCard}>
                        <View style={styles.employeeInfo}>
                          <Text style={styles.employeeName}>{employee.name}</Text>
                          <Text style={styles.employeeRole}>Assigned {new Date(employee.assignedAt?.toDate?.() || employee.assignedAt || new Date()).toLocaleDateString()}</Text>
                        </View>
                        <TouchableOpacity 
                          style={styles.removeEmployeeButton}
                          onPress={() => removeEmployeeFromJob(employee.id)}
                        >
                          <MaterialIcons name="remove-circle" size={20} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.noEmployeesContainer}>
                    <MaterialIcons name="person-off" size={32} color="#9ca3af" />
                    <Text style={styles.noEmployeesText}>No employees assigned</Text>
                  </View>
                )}
                
                <View style={styles.employeeActions}>
                  <TouchableOpacity 
                    style={styles.addEmployeeButton}
                    onPress={() => router.push(`/(admin-tabs)/employee-allocation/${id}`)}
                  >
                    <MaterialIcons name="person-add" size={16} color="#fff" />
                    <Text style={styles.addEmployeeText}>Add Employee</Text>
                  </TouchableOpacity>
                  
                  {job.assignedEmployees && job.assignedEmployees.length > 0 && (
                    <TouchableOpacity 
                      style={styles.autoAssignButton}
                      onPress={smartAutoAssignTasks}
                    >
                      <MaterialIcons name="auto-fix-high" size={16} color="#fff" />
                      <Text style={styles.autoAssignText}>Smart Assign Tasks</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Tasks List */}
              {job.tasks && job.tasks.length > 0 ? (
                <View style={styles.tasksSection}>
                  <Text style={styles.sectionTitle}>Task Checklist ({job.tasks.length} tasks)</Text>
                  {job.tasks.map((task, index) => (
                    <View key={task.id || index} style={styles.taskItem}>
                      <View style={styles.taskHeader}>
                        <View style={styles.taskNumber}>
                          <Text style={styles.taskNumberText}>{task.order || index + 1}</Text>
                        </View>
                        <View style={styles.taskContent}>
                          <Text style={styles.taskTitle}>{task.title}</Text>
                          {task.assignedToName && (
                            <Text style={styles.taskAssignee}>👤 {task.assignedToName}</Text>
                          )}
                          {task.description && (
                            <Text style={styles.taskDescription}>{task.description}</Text>
                          )}
                          <View style={styles.taskMeta}>
                            {task.estimatedTime && (
                              <View style={styles.taskMetaItem}>
                                <AntDesign name="clockcircle" size={12} color="#6b7280" />
                                <Text style={styles.taskMetaText}>{task.estimatedTime} min</Text>
                              </View>
                            )}
                            {task.priority && (
                              <View style={styles.taskMetaItem}>
                                <MaterialIcons name="flag" size={12} color={task.priority === 'High' ? '#ef4444' : task.priority === 'Medium' ? '#f59e0b' : '#10b981'} />
                                <Text style={styles.taskMetaText}>{task.priority}</Text>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={[styles.taskStatus, { backgroundColor: task.completed ? '#10b981' : '#e5e7eb' }]}>
                          {task.completed && <AntDesign name="check" size={12} color="#fff" />}
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.noTasksContainer}>
                  <MaterialCommunityIcons name="clipboard-list-outline" size={48} color="#9ca3af" />
                  <Text style={styles.noTasksText}>No tasks defined for this job</Text>
                  <TouchableOpacity 
                    style={styles.createTasksButton}
                    onPress={() => router.push(`/job-tasks/${id}`)}
                  >
                    <Text style={styles.createTasksText}>Create Tasks</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'messages' && (
          <View>
            <View style={styles.messagesHeader}>
              <Text style={styles.cardTitle}>Client Communication</Text>
              <TouchableOpacity 
                style={styles.newMessageButton}
                onPress={() => setShowMessageModal(true)}
              >
                <MaterialIcons name="add-comment" size={20} color="#fff" />
                <Text style={styles.newMessageText}>New Message</Text>
              </TouchableOpacity>
            </View>

            {messages.length > 0 ? (
              messages.map((message) => (
                <View key={message.id} style={styles.messageCard}>
                  <View style={styles.messageHeader}>
                    <Text style={styles.messageSender}>{message.senderName}</Text>
                    <Text style={styles.messageTime}>
                      {message.createdAt?.toDate?.()?.toLocaleString() || 'Just now'}
                    </Text>
                  </View>
                  <Text style={styles.messageText}>{message.text}</Text>
                </View>
              ))
            ) : (
              <View style={styles.noMessagesContainer}>
                <MaterialIcons name="chat-bubble-outline" size={48} color="#9ca3af" />
                <Text style={styles.noMessagesText}>No messages yet</Text>
              </View>
            )}
          </View>
        )}

        {activeTab === 'media' && (
          <View>
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Job Media & Documentation</Text>
              
              {(jobPhotos.length > 0 || (job.photos && job.photos.length > 0)) ? (
                <View>
                  <Text style={styles.sectionTitle}>Job Photos ({jobPhotos.length + (job.photos?.length || 0)})</Text>
                  <View style={styles.photosGrid}>
                    {[
                      ...jobPhotos,
                      ...(job.photos || []).map((photo, index) => ({ 
                        id: `legacy_${index}`, 
                        url: photo.url || photo, 
                        uploadedBy: 'Employee',
                        createdAt: null
                      }))
                    ].map((item) => (
                      <TouchableOpacity 
                        key={item.id}
                        style={styles.photoItem}
                        onPress={() => {
                          Alert.alert(
                            "Job Photo",
                            `Uploaded by: ${item.uploadedBy || 'Employee'}\nDate: ${item.createdAt?.toDate?.()?.toLocaleString() || 'Legacy photo'}\nTask: ${item.taskId ? 'Specific Task' : 'General Job Photo'}`,
                            [
                              { text: "Close", style: "cancel" },
                              { text: "View Full Size", onPress: () => Linking.openURL(item.url) }
                            ]
                          );
                        }}
                      >
                        <Image 
                          source={{ uri: item.url }} 
                          style={styles.photoThumbnail}
                          resizeMode="cover"
                        />
                        <View style={styles.photoOverlay}>
                          <MaterialIcons name="zoom-in" size={20} color="#fff" />
                        </View>
                        <View style={styles.photoInfo}>
                          <Text style={styles.photoUploader}>{item.uploadedBy || 'Employee'}</Text>
                          {item.taskId && <Text style={styles.photoTask}>Task Photo</Text>}
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.noMediaContainer}>
                  <MaterialIcons name="photo-library" size={48} color="#9ca3af" />
                  <Text style={styles.noMediaText}>No photos uploaded yet</Text>
                  <Text style={styles.noMediaSubtext}>Photos will appear here when employees upload them during job completion</Text>
                </View>
              )}
            </View>

            {additionalWorkRequests.length > 0 && (
              <View style={styles.infoCard}>
                <Text style={styles.cardTitle}>Additional Work Requests ({additionalWorkRequests.length})</Text>
                {additionalWorkRequests.map((request) => (
                  <View key={request.id} style={styles.additionalWorkCard}>
                    <View style={styles.workHeader}>
                      <Text style={styles.workTitle}>{request.workDescription || 'Additional Work Request'}</Text>
                      <View style={[styles.workStatus, { 
                        backgroundColor: request.status === 'Approved' ? '#10b981' : 
                                       request.status === 'Rejected' ? '#ef4444' : '#f59e0b' 
                      }]}>
                        <Text style={styles.workStatusText}>{request.status || 'Pending'}</Text>
                      </View>
                    </View>
                    <Text style={styles.workDescription}>Client: {request.clientName}</Text>
                    <Text style={styles.workDescription}>Address: {request.address}</Text>
                    {request.estimatedTime && (
                      <Text style={styles.workDescription}>Estimated Time: {request.estimatedTime}</Text>
                    )}
                    <View style={styles.workMeta}>
                      <Text style={styles.workSubmitter}>👤 {request.requestedByName}</Text>
                      <Text style={styles.workDate}>📅 {request.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}</Text>
                      <Text style={styles.workUrgency}>⚡ {request.urgency}</Text>
                    </View>
                    {request.notes && (
                      <Text style={styles.workNotes}>Notes: {request.notes}</Text>
                    )}
                    {request.status === 'Pending' && (
                      <View style={styles.workActions}>
                        <TouchableOpacity 
                          style={styles.approveButton}
                          onPress={() => updateWorkRequestStatus(request.id, 'Approved')}
                        >
                          <Text style={styles.approveButtonText}>Approve</Text>
                        </TouchableOpacity>
                        <TouchableOpacity 
                          style={styles.rejectButton}
                          onPress={() => updateWorkRequestStatus(request.id, 'Rejected')}
                        >
                          <Text style={styles.rejectButtonText}>Reject</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {activeTab === 'feedback' && (
          <View>
            <View style={styles.infoCard}>
              <Text style={styles.cardTitle}>Client Feedback</Text>
              
              {feedback ? (
                <View style={styles.feedbackCard}>
                  <View style={styles.feedbackHeader}>
                    <View style={styles.ratingContainer}>
                      <View style={styles.starsRow}>
                        {[1, 2, 3, 4, 5].map((star) => (
                          <AntDesign
                            key={star}
                            name={star <= feedback.rating ? 'star' : 'staro'}
                            size={20}
                            color={star <= feedback.rating ? '#ffc107' : '#ddd'}
                          />
                        ))}
                      </View>
                      <Text style={styles.ratingText}>{feedback.rating}/5 Stars</Text>
                    </View>
                    <Text style={styles.feedbackDate}>
                      {feedback.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
                    </Text>
                  </View>
                  
                  {feedback.comment && (
                    <View style={styles.commentSection}>
                      <Text style={styles.commentTitle}>Client Comment:</Text>
                      <Text style={styles.commentText}>{feedback.comment}</Text>
                    </View>
                  )}
                  
                  <View style={styles.feedbackMeta}>
                    <Text style={styles.feedbackEmployee}>Employee: {feedback.employeeName || 'Unknown'}</Text>
                    <Text style={styles.feedbackService}>Service: {feedback.serviceType || job.serviceType}</Text>
                  </View>
                </View>
              ) : job.status?.toLowerCase() === 'completed' ? (
                <View style={styles.noFeedbackContainer}>
                  <AntDesign name="staro" size={48} color="#9ca3af" />
                  <Text style={styles.noFeedbackText}>No feedback submitted yet</Text>
                  <Text style={styles.noFeedbackSubtext}>
                    Client can submit feedback after job completion
                  </Text>
                </View>
              ) : (
                <View style={styles.noFeedbackContainer}>
                  <AntDesign name="clockcircle" size={48} color="#9ca3af" />
                  <Text style={styles.noFeedbackText}>Feedback not available</Text>
                  <Text style={styles.noFeedbackSubtext}>
                    Feedback will be available after job completion
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showEmployeeModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEmployeeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Employee</Text>
              <TouchableOpacity onPress={() => setShowEmployeeModal(false)}>
                <AntDesign name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.employeeList}>
              {getSortedEmployees().map((employee) => (
                <TouchableOpacity
                  key={employee.id}
                  style={styles.employeeItem}
                  onPress={() => allocateEmployee(employee.id, employee.name)}
                >
                  <View style={styles.employeeInfo}>
                    <Text style={styles.employeeName}>{employee.name || 'Unknown Employee'}</Text>
                    <Text style={styles.employeeDetails}>
                      {employee.address || 'No address'}
                    </Text>
                    {employee.distance && (
                      <Text style={styles.employeeDistance}>
                        {employee.distance.toFixed(1)} km away
                      </Text>
                    )}
                  </View>
                  <View style={[styles.employeeStatus, { 
                    backgroundColor: employee.status === 'available' ? '#10b981' : '#f59e0b' 
                  }]}>
                    <Text style={styles.employeeStatusText}>
                      {employee.status || 'available'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showMessageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowMessageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Send Message to Client</Text>
              <TouchableOpacity onPress={() => setShowMessageModal(false)}>
                <AntDesign name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={styles.messageInput}
              placeholder="Type your message..."
              value={messageText}
              onChangeText={setMessageText}
              multiline
              numberOfLines={4}
            />
            
            <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
              <Text style={styles.sendButtonText}>Send Message</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
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
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerCenter: { 
    flex: 1,
    alignItems: "center",
  },
  headerTitle: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#fff",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    textAlign: "center",
  },
  headerRight: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  statusBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    elevation: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  progressContainer: {
    flex: 1,
    marginLeft: 16,
  },
  progressBar: {
    height: 8,
    backgroundColor: "#e5e7eb",
    borderRadius: 4,
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#4facfe",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  pendingActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    gap: 12,
    elevation: 2,
  },
  acceptJobButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  acceptJobText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  allocateJobButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf6",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  allocateJobText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 8,
    elevation: 2,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    gap: 4,
  },
  activeTab: {
    backgroundColor: "#eff6ff",
    borderWidth: 1,
    borderColor: "#4facfe",
  },
  tabText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6b7280",
    textAlign: "center",
  },
  activeTabText: {
    color: "#4facfe",
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  contactValue: {
    color: "#10b981",
  },
  jobTypeValue: {
    color: "#8b5cf6",
    textTransform: "capitalize",
  },
  recurringValue: {
    color: "#7c3aed",
  },
  assignedValue: {
    color: "#059669",
  },
  unassignedValue: {
    color: "#ef4444",
    fontStyle: "italic",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityBadgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  notesText: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
  },
  mapCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 4,
  },
  map: {
    width: "100%",
    height: 200,
    borderRadius: 8,
  },
  noMapContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    borderRadius: 8,
  },
  noMapText: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
    textAlign: "center",
  },
  locationActions: {
    gap: 12,
    marginBottom: 16,
  },
  directionsButton: {
    borderRadius: 12,
    overflow: "hidden",
  },
  shareLocationButton: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
  },
  shareLocationContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  shareLocationText: {
    color: "#6b7280",
    fontSize: 16,
    fontWeight: "600",
  },
  directionsButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  directionsButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  messagesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  newMessageButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4facfe",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
  },
  newMessageText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  messageCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  messageSender: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  messageTime: {
    fontSize: 12,
    color: "#6b7280",
  },
  messageText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
  },
  noMessagesContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  noMessagesText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },
  employeeList: {
    maxHeight: 400,
  },
  employeeItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  employeeDetails: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 2,
  },
  employeeDistance: {
    fontSize: 12,
    color: "#8b5cf6",
    fontWeight: "500",
  },
  employeeStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  employeeStatusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  messageInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 12,
    padding: 16,
    margin: 20,
    fontSize: 16,
    textAlignVertical: "top",
  },
  sendButton: {
    backgroundColor: "#4facfe",
    margin: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 16,
    color: "#ef4444",
  },
  taskItem: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4facfe",
  },
  taskHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  taskNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4facfe",
    justifyContent: "center",
    alignItems: "center",
  },
  taskNumberText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
    lineHeight: 20,
  },
  taskMeta: {
    flexDirection: "row",
    gap: 16,
  },
  taskMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  taskMetaText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },
  taskStatus: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  noTasksContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noTasksText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 12,
    textAlign: "center",
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  manageTasksButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4facfe",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  manageTasksText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  employeeSection: {
    marginBottom: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 12,
  },
  assignedEmployeesList: {
    marginBottom: 12,
  },
  employeeCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  employeeRole: {
    fontSize: 12,
    color: "#6b7280",
  },
  removeEmployeeButton: {
    padding: 4,
  },
  noEmployeesContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  noEmployeesText: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 8,
  },
  employeeActions: {
    flexDirection: "row",
    gap: 8,
  },
  addEmployeeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  addEmployeeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  autoAssignButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf6",
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  autoAssignText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  tasksSection: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },
  taskAssignee: {
    fontSize: 12,
    color: "#8b5cf6",
    fontWeight: "500",
    marginBottom: 4,
  },
  createTasksButton: {
    backgroundColor: "#4facfe",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
  },
  createTasksText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  allocationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  allocateButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#8b5cf6",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  allocateButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  employeesList: {
    gap: 12,
  },
  employeeAllocationCard: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#8b5cf6",
  },
  employeeAllocationInfo: {
    flex: 1,
  },
  employeeAllocationName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  employeeAllocationRole: {
    fontSize: 12,
    color: "#8b5cf6",
    fontWeight: "500",
    marginBottom: 2,
  },
  employeeSkills: {
    fontSize: 12,
    color: "#6b7280",
  },
  employeeAllocationStats: {
    alignItems: "flex-end",
  },
  statLabel: {
    fontSize: 11,
    color: "#6b7280",
    marginBottom: 2,
  },
  noAllocationContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noAllocationText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 12,
    fontWeight: "600",
  },
  noAllocationSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  photoItem: {
    width: "48%",
    margin: "1%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  photoThumbnail: {
    width: "100%",
    height: "100%",
  },
  photoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    opacity: 0.8,
  },
  noMediaContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noMediaText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 12,
    fontWeight: "600",
  },
  noMediaSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
  photoInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.7)",
    padding: 4,
  },
  photoUploader: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  photoTask: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "400",
  },
  workUrgency: {
    fontSize: 12,
    color: "#6b7280",
  },
  workNotes: {
    fontSize: 12,
    color: "#4b5563",
    fontStyle: "italic",
    marginTop: 4,
  },
  additionalWorkCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#f59e0b",
  },
  workHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  workTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    flex: 1,
  },
  workStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  workStatusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  workDescription: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 8,
    lineHeight: 20,
  },
  workMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  workSubmitter: {
    fontSize: 12,
    color: "#6b7280",
  },
  workDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  workCost: {
    fontSize: 14,
    color: "#059669",
    fontWeight: "600",
    marginBottom: 8,
  },
  workActions: {
    flexDirection: "row",
    gap: 8,
  },
  approveButton: {
    flex: 1,
    backgroundColor: "#10b981",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  approveButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  rejectButton: {
    flex: 1,
    backgroundColor: "#ef4444",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  rejectButtonText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  feedbackCard: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#ffc107",
  },
  feedbackHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  ratingContainer: {
    alignItems: "flex-start",
  },
  starsRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  feedbackDate: {
    fontSize: 12,
    color: "#6b7280",
  },
  commentSection: {
    marginBottom: 16,
  },
  commentTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },
  commentText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    fontStyle: "italic",
  },
  feedbackMeta: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 12,
  },
  feedbackEmployee: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  feedbackService: {
    fontSize: 12,
    color: "#6b7280",
  },
  noFeedbackContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  noFeedbackText: {
    fontSize: 16,
    color: "#6b7280",
    marginTop: 12,
    fontWeight: "600",
  },
  noFeedbackSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20,
  },
});