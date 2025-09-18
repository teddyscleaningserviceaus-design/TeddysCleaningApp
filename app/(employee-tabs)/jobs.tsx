import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  ImageBackground,
  Linking,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming
} from "react-native-reanimated";

import MapView, { Marker, Callout } from "react-native-maps";
import { SwipeListView } from 'react-native-swipe-list-view';
import { auth, db } from "../../config/firebase";
import { useFirestoreListener } from "../../hooks/useFirestoreListener";
import { useAuth } from "../../contexts/AuthContext";
import LiveMap from "../(admin-tabs)/components/LiveMap";

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.8;

const getJobGradient = (status) => {
  switch (status) {
    case "In Progress": return ["#fc466b", "#3f5efb"];
    case "Scheduled": return ["#11998e", "#38ef7d"];
    case "Completed": return ["#667eea", "#764ba2"];
    default: return ["#6b7280", "#9ca3af"];
  }
};

export default function EmployeeJobs() {
  const { userProfile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('map');
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [mapRef, setMapRef] = useState(null);
  const [filterDate, setFilterDate] = useState('upcoming');

  const router = useRouter();
  
  const sidebarX = useSharedValue(-SIDEBAR_WIDTH);
  const overlayOpacity = useSharedValue(0);

  // Load jobs from Firestore in real-time
  useFirestoreListener(() => {
    if (!auth.currentUser?.uid) {
      setJobs([]);
      setLoading(false);
      return () => {}; // Return empty cleanup function
    }

    // Load from both jobs and guest-bookings collections
    const jobsQuery = query(collection(db, "jobs"));
    const guestBookingsQuery = query(collection(db, "guest-bookings"));
    
    let allJobs = [];
    let jobsLoaded = false;
    let guestBookingsLoaded = false;
    
    const updateJobs = () => {
      if (jobsLoaded && guestBookingsLoaded) {
        // Filter jobs assigned to current user (exclude pending assignments)
        const userJobs = allJobs.filter(job => {
          // Exclude jobs with Schedule-Pending status (these are handled in pending-jobs page)
          if (job.status === 'Schedule-Pending') {
            return false;
          }
          
          // Check legacy assignedTo field
          if (job.assignedTo === auth.currentUser?.uid) {
            console.log('Employee jobs: Found job via assignedTo:', job.id, job.status);
            return true;
          }
          
          // Check new assignedEmployees array (only accepted assignments)
          if (job.assignedEmployees && Array.isArray(job.assignedEmployees)) {
            const hasAcceptedAssignment = job.assignedEmployees.some(emp => {
              const isCurrentUser = emp.id === auth.currentUser?.uid;
              const isAccepted = emp.status === 'accepted' || !emp.status;
              if (isCurrentUser) {
                console.log('Employee jobs: Found assignment for current user:', job.id, 'status:', emp.status, 'accepted:', isAccepted);
              }
              return isCurrentUser && isAccepted;
            });
            if (hasAcceptedAssignment) {
              console.log('Employee jobs: Job accepted by current user:', job.id, job.status);
              return true;
            }
          }
          
          // Check tasks for employee assignment
          if (job.tasks && Array.isArray(job.tasks)) {
            return job.tasks.some(task => 
              task.assignedEmployees && 
              Array.isArray(task.assignedEmployees) && 
              task.assignedEmployees.some(emp => emp.id === auth.currentUser?.uid)
            );
          }
          
          return false;
        });
        
        console.log('Employee jobs: Total jobs loaded:', allJobs.length, 'User jobs:', userJobs.length);
        
        // Sort by createdAt in memory to avoid index requirement
        userJobs.sort((a, b) => {
          const aDate = a.createdAt?.toDate?.() || new Date(0);
          const bDate = b.createdAt?.toDate?.() || new Date(0);
          return bDate - aDate;
        });
        
        setJobs(userJobs);
        setLoading(false);
      }
    };
    
    const unsubscribeJobs = onSnapshot(jobsQuery, 
      (snapshot) => {
        // Check if user is still authenticated
        if (!auth.currentUser) {
          console.log('Employee jobs: User logged out, ignoring jobs snapshot');
          return;
        }
        
        const jobsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        allJobs = [...jobsList, ...allJobs.filter(j => j.bookingType === 'guest')];
        jobsLoaded = true;
        updateJobs();
      },
      (error) => {
        console.error("Jobs query error:", error);
        // Don't show error if user is logging out
        if (!auth.currentUser) {
          console.log('Employee jobs: Ignoring jobs error during logout');
          return;
        }
        jobsLoaded = true;
        updateJobs();
      }
    );
    
    const unsubscribeGuestBookings = onSnapshot(guestBookingsQuery, 
      (snapshot) => {
        // Check if user is still authenticated
        if (!auth.currentUser) {
          console.log('Employee jobs: User logged out, ignoring guest bookings snapshot');
          return;
        }
        
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
        console.error("Guest bookings query error:", error);
        // Don't show error if user is logging out
        if (!auth.currentUser) {
          console.log('Employee jobs: Ignoring guest bookings error during logout');
          return;
        }
        guestBookingsLoaded = true;
        updateJobs();
      }
    );

    return () => {
      unsubscribeJobs();
      unsubscribeGuestBookings();
    };
  }, []);

  const toggleSidebar = () => {
    const isOpening = !isSidebarOpen;
    sidebarX.value = withSpring(isOpening ? 0 : -SIDEBAR_WIDTH, { damping: 15 });
    overlayOpacity.value = withTiming(isOpening ? 0.5 : 0, { duration: 300 });
    setIsSidebarOpen(isOpening);
  };

  const handleUpdateJobStatus = async (jobId, newStatus) => {
    // Check if trying to start a job when another is already in progress
    if (newStatus === "In Progress") {
      const jobsInProgress = jobs.filter(j => j.status === "In Progress");
      if (jobsInProgress.length > 0) {
        Alert.alert(
          "Job Already in Progress",
          "You can only have one job in progress at a time. Please complete your current job first.",
          [{ text: "OK" }]
        );
        return;
      }
    }

    try {
      const newProgress = newStatus === "Completed" ? 100 : newStatus === "In Progress" ? 50 : 0;
      await updateDoc(doc(db, "jobs", jobId), {
        status: newStatus,
        progress: newProgress,
        updatedAt: new Date(),
      });
    } catch (error) {
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
              await deleteDoc(doc(db, "jobs", jobId));
              Alert.alert("Success", "Job deleted successfully.");
            } catch (error) {
              Alert.alert("Error", "Failed to delete job.");
            }
          },
        },
      ]
    );
  };

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sidebarX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const getStatusColor = (status) => {
    switch (status) {
      case "In Progress": return "#fc466b";
      case "Scheduled": return "#11998e";
      case "Completed": return "#38ef7d";
      default: return "#6b7280";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "#ef4444";
      case "Medium": return "#f59e0b";
      case "Low": return "#10b981";
      default: return "#6b7280";
    }
  };

  const handleJobPress = (job) => {
    // Single click opens job details page
    console.log('Employee jobs: Navigating to job details for job:', job.id);
    router.push({
      pathname: '/job-details',
      params: {
        jobId: job.id,
        jobTitle: job.title,
        client: job.client,
        address: job.address
      }
    });
  };

  const handleJobLongPress = (job) => {
    // Long press opens job progress page
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

  const handleMapJobPress = (job) => {
    setSelectedJobId(job.id);
    // Animate to job location on map
    if (mapRef && job.latitude && job.longitude) {
      mapRef.animateToRegion({
        latitude: job.latitude,
        longitude: job.longitude,
        latitudeDelta: 0.008,
        longitudeDelta: 0.008,
      }, 1000);
    }
  };

  const getFilteredJobs = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (!Array.isArray(jobs)) {
      return [];
    }
    
    return jobs.filter(job => {
      if (filterDate === 'today') {
        return isJobToday(job, today);
      } else if (filterDate === 'upcoming') {
        // Show scheduled jobs regardless of date, plus future jobs
        return job.status === 'Scheduled' || isJobUpcoming(job, today);
      } else if (filterDate === 'completed') {
        return job.status === 'Completed';
      }
      return true;
    });
  };

  const getUpcomingJobs = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (!Array.isArray(jobs)) {
      return [];
    }
    return jobs.filter(job => isJobUpcoming(job, today));
  };

  const parseJobDate = (dateString) => {
    if (!dateString) return null;
    
    // Handle Firestore timestamp
    if (dateString?.toDate) {
      return dateString.toDate();
    }
    
    // Handle string dates in DD/M/YYYY format
    if (typeof dateString === 'string') {
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        const year = parseInt(parts[2], 10);
        return new Date(year, month, day);
      }
      // Fallback to standard Date parsing
      return new Date(dateString);
    }
    
    // Handle Date objects
    if (dateString instanceof Date) {
      return dateString;
    }
    
    return null;
  };

  const isJobToday = (job, today) => {
    const jobDate = parseJobDate(job.scheduledDate);
    if (!jobDate || isNaN(jobDate.getTime())) return false;
    
    jobDate.setHours(0, 0, 0, 0);
    return jobDate.getTime() === today.getTime();
  };

  const isJobUpcoming = (job, today) => {
    if (!job.scheduledDate || job.status === 'Completed') {
      return false;
    }
    
    const jobDate = parseJobDate(job.scheduledDate);
    if (!jobDate || isNaN(jobDate.getTime())) {
      return false;
    }
    
    jobDate.setHours(0, 0, 0, 0);
    return jobDate.getTime() > today.getTime();
  };

  const handleStartNavigation = (job) => {
    if (job.status === 'Completed') {
      Alert.alert('Job Completed', 'This job has already been completed and cannot be started again.');
      return;
    }
    
    if (job.latitude && job.longitude) {
      router.push({
        pathname: '/navigation',
        params: {
          jobId: job.id,
          latitude: job.latitude,
          longitude: job.longitude,
          jobTitle: job.title,
          address: job.address,
          client: job.client,
        },
      });
    } else {
      Alert.alert('Error', 'No location available for this job');
    }
  };

  const renderJobItem = ({ item: job }) => (
    <TouchableOpacity 
      style={[
        styles.jobDrawerItem,
        selectedJobId === job.id && styles.jobDrawerItemSelected,
        (!job.latitude || !job.longitude) && styles.jobDrawerItemNoLocation
      ]}
      onPress={() => handleJobPress(job)}
    >
      <View style={styles.jobDrawerContent}>
        <View style={styles.jobDrawerLeft}>
          <Text style={styles.jobDrawerTitle}>{job.title}</Text>
          <Text style={styles.jobDrawerClient}>👤 {job.client}</Text>
          <Text style={styles.jobDrawerAddress}>📍 {job.address}</Text>
          <Text style={styles.jobDrawerTime}>🗓️ {job.scheduledDate}</Text>
          {job.startTime && (
            <Text style={styles.jobDrawerTime}>⏰ {job.startTime}</Text>
          )}
          {(!job.latitude || !job.longitude) && (
            <Text style={styles.noLocationText}>⚠️ No map location</Text>
          )}
        </View>
        <View style={styles.jobDrawerRight}>
          <View style={[styles.jobDrawerStatus, { backgroundColor: getStatusColor(job.status) }]}>
            <Text style={styles.jobDrawerStatusText}>{job.status}</Text>
          </View>
          <TouchableOpacity 
            style={[
              styles.navigationButton, 
              (!job.latitude || !job.longitude || job.status === 'Completed') && styles.navigationButtonDisabled
            ]}
            onPress={() => handleStartNavigation(job)}
            disabled={job.status === 'Completed'}
          >
            <AntDesign 
              name={job.status === 'Completed' ? "checkcircle" : "enviromento"} 
              size={16} 
              color={(!job.latitude || !job.longitude || job.status === 'Completed') ? "#9ca3af" : "#4facfe"} 
            />
            <Text style={[
              styles.navigationButtonText, 
              (!job.latitude || !job.longitude || job.status === 'Completed') && styles.navigationButtonTextDisabled
            ]}>
              {job.status === 'Completed' ? 'Completed' : 'Navigate'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <ImageBackground
        source={require("../../assets/background_pattern.png")}
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
        {isSidebarOpen && (
          <Animated.View style={[styles.overlay, overlayStyle]}>
            <TouchableOpacity style={styles.overlayTouch} onPress={toggleSidebar} />
          </Animated.View>
        )}

        <Animated.View style={[styles.sidebar, sidebarStyle]}>
          <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.sidebarGradient}>
            <View style={styles.sidebarHeader}>
              <View style={styles.sidebarProfile}>
                <View style={styles.avatarContainer}>
                  {userProfile?.profilePicture || userProfile?.profileImage ? (
                    <Image 
                      source={{ uri: userProfile.profilePicture || userProfile.profileImage }} 
                      style={styles.sidebarAvatarImage} 
                      onError={() => console.log('Profile image failed to load')}
                    />
                  ) : (
                    <AntDesign name="user" size={24} color="#fff" />
                  )}
                </View>
                <View>
                  <Text style={styles.sidebarUserName}>Welcome Back{userProfile?.firstName ? `, ${userProfile.firstName}!` : userProfile?.name ? `, ${userProfile.name.split(' ')[0]}!` : '!'}</Text>
                  <Text style={styles.sidebarUserRole}>Cleaning Professional</Text>
                </View>
              </View>
              <TouchableOpacity onPress={toggleSidebar} style={styles.closeButton}>
                <AntDesign name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.sidebarDivider} />

            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/(employee-tabs)/dashboard"); toggleSidebar(); }}>
              <AntDesign name="home" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Employee Dashboard</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/(employee-tabs)/jobs"); toggleSidebar(); }}>
              <Feather name="briefcase" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Job Sites & Tracking</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/(employee-tabs)/messaging"); toggleSidebar(); }}>
              <AntDesign name="message1" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Team Messaging</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/(employee-tabs)/news"); toggleSidebar(); }}>
              <MaterialCommunityIcons name="newspaper" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Company News</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/(employee-tabs)/profile"); toggleSidebar(); }}>
              <AntDesign name="user" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>My Profile</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/(employee-tabs)/schedule"); toggleSidebar(); }}>
              <AntDesign name="calendar" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Schedule</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/settings"); toggleSidebar(); }}>
              <AntDesign name="setting" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Settings</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <View style={styles.sidebarFooter}>
              <TouchableOpacity style={styles.logoutButton} onPress={() => {
                Alert.alert(
                  "Sign Out",
                  "Are you sure you want to sign out?",
                  [
                    { text: "Cancel", style: "cancel" },
                    { 
                      text: "Sign Out", 
                      style: "destructive",
                      onPress: () => router.replace("/")
                    }
                  ]
                );
              }}>
                <AntDesign name="logout" size={20} color="#fff" />
                <Text style={styles.logoutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <AntDesign name="menuunfold" size={26} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Image source={require("../../assets/teddy-logo.png")} style={styles.logo} />
            <View>
              <Text style={styles.headerTitle}>Job Sites</Text>
              <Text style={styles.headerSubtitle}>Track & Manage</Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={styles.pendingJobsButton}
            onPress={() => router.push('/(employee-tabs)/pending-jobs')}
          >
            <MaterialCommunityIcons name="clock-alert" size={18} color="#fff" />
            <Text style={styles.pendingJobsText}>Pending</Text>
          </TouchableOpacity>
        </LinearGradient>

        <View style={styles.controlsRow}>
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
            {['upcoming', 'today', 'completed'].map((filter) => (
              <TouchableOpacity 
                key={filter}
                style={[styles.filterToggleButton, filterDate === filter && styles.filterToggleButtonActive]}
                onPress={() => setFilterDate(filter)}
              >
                <Text style={[styles.filterToggleText, filterDate === filter && styles.filterToggleTextActive]}>
                  {filter === 'upcoming' ? 'Future' : filter === 'today' ? 'Today' : 'Past'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {viewMode === 'map' ? (
          <View style={styles.mapContainer}>
            <View style={styles.mapWrapper}>
              <LiveMap 
                jobs={getFilteredJobs()}
                onJobSelect={handleMapJobPress}
                onJobLongPress={handleJobLongPress}
                selectedJobId={selectedJobId}
                includePast={filterDate === 'completed'}
                showLocateButton={false}
                locateButtonStyle="transparent"
              />
            </View>
            
            {/* Job Drawer */}
            <View style={styles.jobDrawer}>
              <View style={styles.jobDrawerHeader}>
                <Text style={styles.jobDrawerTitle}>
                  {filterDate === 'upcoming' ? 'Upcoming Jobs' : 
                   filterDate === 'today' ? "Today's Jobs" : 'Completed Jobs'}
                </Text>
                <Text style={styles.jobDrawerCount}>{getFilteredJobs().length} jobs</Text>
                {getFilteredJobs().filter(job => !job.latitude || !job.longitude).length > 0 && (
                  <Text style={styles.noLocationWarning}>
                    {getFilteredJobs().filter(job => !job.latitude || !job.longitude).length} without location
                  </Text>
                )}
              </View>
              <FlatList
                data={getFilteredJobs()}
                renderItem={renderJobItem}
                keyExtractor={(item) => `drawer_${item.id}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.jobDrawerList}
              />
            </View>
            
            <TouchableOpacity 
              style={styles.addJobButton}
              onPress={() => router.push('/request-work')}
            >
              <AntDesign name="plus" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {loading ? (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>Loading jobs...</Text>
              </View>
            ) : jobs.length === 0 ? (
              <View style={styles.emptyContainer}>
                <AntDesign name="inbox" size={48} color="#9ca3af" />
                <Text style={styles.emptyText}>No jobs yet</Text>
                <Text style={styles.emptySubtext}>Tap "New Job" to get started</Text>
              </View>
            ) : (
              <SwipeListView
                data={getFilteredJobs().map(job => ({ key: `swipe_${job.id}`, ...job }))}
                ListHeaderComponent={() => (
                  <View>
                    <View style={styles.statsContainer}>
                      <Text style={styles.statsTitle}>Today's Overview</Text>
                      <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                          <Text style={styles.statNumber}>{Array.isArray(jobs) ? jobs.length : 0}</Text>
                          <Text style={styles.statLabel}>Total Jobs</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                          <Text style={styles.statNumber}>{Array.isArray(jobs) ? jobs.filter(j => j.status === "In Progress").length : 0}</Text>
                          <Text style={styles.statLabel}>In Progress</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                          <Text style={styles.statNumber}>{Array.isArray(jobs) ? jobs.filter(j => j.status === "Completed").length : 0}</Text>
                          <Text style={styles.statLabel}>Completed</Text>
                        </View>
                        <View style={styles.statDivider} />
                        <View style={styles.statItem}>
                          <Text style={styles.statNumber}>{getUpcomingJobs().length}</Text>
                          <Text style={styles.statLabel}>Upcoming</Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.sectionTitle}>Active Jobs</Text>
                  </View>
                )}
                ListFooterComponent={() => (
                  <View style={styles.quickActionsContainer}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.actionGrid}>
                      <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/request-work")}>
                        <LinearGradient colors={["#f59e0b", "#d97706"]} style={styles.actionCardInner}>
                          <AntDesign name="plus" size={28} color="#fff" />
                          <Text style={styles.actionCardTitle}>Request Work</Text>
                          <Text style={styles.actionCardSubtitle}>Additional Service</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/(employee-tabs)/schedule')}>
                        <LinearGradient colors={["#11998e", "#38ef7d"]} style={styles.actionCardInner}>
                          <AntDesign name="calendar" size={28} color="#fff" />
                          <Text style={styles.actionCardTitle}>Schedule</Text>
                          <Text style={styles.actionCardSubtitle}>View Calendar</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.actionCard}>
                        <LinearGradient colors={["#fc466b", "#3f5efb"]} style={styles.actionCardInner}>
                          <AntDesign name="barschart" size={28} color="#fff" />
                          <Text style={styles.actionCardTitle}>Reports</Text>
                          <Text style={styles.actionCardSubtitle}>View Stats</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                      
                      <TouchableOpacity style={styles.actionCard}>
                        <LinearGradient colors={["#a8edea", "#fed6e3"]} style={styles.actionCardInner}>
                          <AntDesign name="setting" size={28} color="#fff" />
                          <Text style={styles.actionCardTitle}>Settings</Text>
                          <Text style={styles.actionCardSubtitle}>Preferences</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
                renderItem={({ item: job }) => (
                  <TouchableOpacity 
                    style={[
                      styles.jobCard,
                      job.status === 'Completed' && styles.jobCardCompleted
                    ]}
                    onPress={() => handleJobPress(job)}
                    delayLongPress={1000}
                    onLongPress={() => handleJobLongPress(job)}
                  >
                    <LinearGradient colors={getJobGradient(job.status)} style={styles.jobCardGradient}>
                    <View style={styles.jobCardHeader}>
                      <View style={styles.jobCardLeft}>
                        <Text style={styles.jobTitle}>{job.title}</Text>
                        <Text style={styles.jobClient}>{job.client}</Text>
                        <Text style={styles.jobAddress}>{job.address}</Text>
                      </View>
                      <View style={styles.jobCardRight}>
                        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(job.status) }]}>
                          <Text style={styles.statusText}>{job.status}</Text>
                        </View>
                        <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(job.priority) }]}>
                          <Text style={styles.priorityText}>{job.priority}</Text>
                        </View>
                      </View>
                    </View>
                    
                    <View style={styles.jobCardFooter}>
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View style={[styles.progressFill, { width: `${job.progress}%` }]} />
                        </View>
                        <Text style={styles.progressText}>{job.progress}%</Text>
                      </View>
                      <View style={styles.timeContainer}>
                        <AntDesign name="calendar" size={14} color="rgba(255,255,255,0.8)" />
                        <Text style={styles.timeText}>{job.scheduledDate}</Text>
                      </View>
                    </View>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                renderHiddenItem={({ item: job }) => (
                  <View style={styles.hiddenItem}>
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteJob(job.id)}
                    >
                      <AntDesign name="delete" size={20} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                rightOpenValue={-75}
                disableRightSwipe
                contentContainerStyle={styles.content}
              />
            )}
          </View>
        )}
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  background: { flex: 1 },
  backgroundImage: { opacity: 0.05 },
  
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "black",
    zIndex: 15,
  },
  overlayTouch: {
    flex: 1,
  },

  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 20,
    elevation: 16,
  },
  sidebarGradient: { 
    flex: 1, 
    paddingTop: 60,
  },
  sidebarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sidebarProfile: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  sidebarAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  sidebarUserName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  sidebarUserRole: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sidebarItem: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginBottom: 8,
  },
  sidebarIcon: { marginRight: 16 },
  sidebarText: { 
    color: "#fff", 
    fontSize: 16, 
    fontWeight: "500",
    flex: 1,
  },
  sidebarFooter: {
    marginTop: "auto",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    borderRadius: 12,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 10,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  menuButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  headerCenter: { 
    flexDirection: "row", 
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    marginLeft: -40,
  },
  logo: { 
    width: 36, 
    height: 36, 
    marginRight: 12,
    borderRadius: 18,
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
  headerRight: {
    alignItems: "center",
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  pendingJobsButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f59e0b",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 4,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  pendingJobsText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },

  content: { 
    padding: 20, 
    paddingBottom: 100,
  },
  listContainer: {
    flex: 1,
  },

  statsContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4facfe",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#e5e7eb",
  },

  sectionTitle: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#1f2937", 
    marginBottom: 16,
    letterSpacing: 0.3,
  },

  jobCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  jobCardCompleted: {
    opacity: 0.6,
  },
  jobCardGradient: {
    padding: 20,
  },
  jobCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  jobCardLeft: {
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  jobClient: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    marginBottom: 4,
  },
  jobAddress: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
  },
  jobCardRight: {
    alignItems: "flex-end",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 6,
  },
  statusText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  jobCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressContainer: {
    flex: 1,
    marginRight: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 3,
    marginBottom: 4,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff",
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    marginLeft: 4,
  },

  quickActionsContainer: {
    marginTop: 24,
  },
  actionGrid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    justifyContent: "space-between",
  },
  actionCard: {
    width: "48%",
    height: 120,
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  actionCardInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  actionCardTitle: {
    color: "#fff",
    marginTop: 8,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  actionCardSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
    textAlign: "center",
  },

  // Loading and Empty States
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
  },
  emptyContainer: {
    padding: 40,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
  },

  // Controls
  controlsRow: {
    flexDirection: "row",
    padding: 16,
    gap: 8,
  },
  
  // View Toggle Styles
  viewToggle: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    flex: 1,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  
  filterToggle: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 4,
    flex: 1,
    elevation: 2,
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
  toggleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: "#4facfe",
  },
  toggleText: {
    marginLeft: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#4facfe",
  },
  toggleTextActive: {
    color: "#fff",
  },

  // Map Styles
  mapContainer: {
    flex: 1,
    position: "relative",
  },
  mapWrapper: {
    flex: 1,
    borderRadius: 0,
    overflow: 'hidden',
  },
  map: {
    flex: 1,
  },

  // Job Drawer Styles
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
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
    minHeight: 160,
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
  jobDrawerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
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
  navigationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4facfe',
  },
  navigationButtonText: {
    color: '#4facfe',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },

  // Callout Styles
  calloutContainer: {
    width: 200,
    padding: 10,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 2,
  },
  calloutAddress: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },
  calloutTime: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  calloutStatus: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  calloutTap: {
    fontSize: 11,
    color: "#3b82f6",
  },

  addJobButton: {
    position: "absolute",
    bottom: '52%',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#4facfe",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },

  // No location styles
  jobDrawerItemNoLocation: {
    borderColor: '#f59e0b',
    borderWidth: 1,
    backgroundColor: '#fef3c7',
  },
  noLocationText: {
    fontSize: 11,
    color: '#d97706',
    fontWeight: '600',
    marginTop: 2,
  },
  noLocationWarning: {
    fontSize: 11,
    color: '#d97706',
    fontWeight: '600',
  },
  navigationButtonDisabled: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
  },
  navigationButtonTextDisabled: {
    color: '#9ca3af',
  },

  // Swipe to delete styles
  hiddenItem: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    marginBottom: 16,
    borderRadius: 16,
    paddingLeft: 15,
  },
  deleteButton: {
    width: 75,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    height: '100%',
  },
});