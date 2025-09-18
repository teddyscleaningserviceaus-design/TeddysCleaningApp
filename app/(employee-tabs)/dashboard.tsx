import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming
} from "react-native-reanimated";
import Swiper from "react-native-swiper";
import { auth, db } from "../../config/firebase";
import { doc, getDoc, updateDoc, collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { useSettings } from "../../contexts/SettingsContext";

import { useFirestoreListener } from "../../hooks/useFirestoreListener";
import { useAuth } from "../../contexts/AuthContext";

const { width, height } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.8;

// Enhanced slider data with more engaging content
const sliderData = [
  {
    id: "1",
    title: "🤖 Automation Revolution",
    subtitle: "Phase 1 Complete: Robotic vacuums reducing labor by 35%! Your expertise guides the future.",
    image: require("../../assets/robotics.png"),
    gradient: ["#667eea", "#764ba2"],
  },
  {
    id: "2",
    title: "🌱 Green Initiative",
    subtitle: "Transform waste into compost—every clean makes a difference for tomorrow's world.",
    image: require("../../assets/sustainability.png"),
    gradient: ["#11998e", "#38ef7d"],
  },
  {
    id: "3",
    title: "🧪 Science-Backed Clean",
    subtitle: "Enzyme technology meets Clean Index standards—precision cleaning redefined.",
    image: require("../../assets/science.png"),
    gradient: ["#fc466b", "#3f5efb"],
  },
  {
    id: "4",
    title: "🚀 Beyond Earth",
    subtitle: "Your work today powers zero-gravity cleaning solutions for space missions!",
    image: require("../../assets/space.png"),
    gradient: ["#a8edea", "#fed6e3"],
  },
];

// Quick stats component with real Firebase data
const QuickStats = ({ employeeId }) => {
  const [stats, setStats] = useState({
    completedJobs: 0,
    hoursWorked: 0,
    rating: 0,
    activeJobs: 0,
  });
  const [loading, setLoading] = useState(true);

  useFirestoreListener(() => {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    
    // Query jobs assigned to this employee for current month
    const jobsQuery = query(
      collection(db, 'jobs'),
      where('assignedTo', '==', employeeId),
      where('createdAt', '>=', startOfMonth)
    );

    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      let completed = 0;
      let totalHours = 0;
      let totalRating = 0;
      let ratingCount = 0;
      let active = 0;

      snapshot.forEach((doc) => {
        const job = doc.data();
        
        if (job.status === 'Completed') {
          completed++;
          if (job.hoursWorked) totalHours += job.hoursWorked;
          if (job.rating) {
            totalRating += job.rating;
            ratingCount++;
          }
        } else if (job.status === 'In Progress' || job.status === 'Assigned') {
          active++;
        }
      });

      setStats({
        completedJobs: completed,
        hoursWorked: Math.round(totalHours * 10) / 10,
        rating: ratingCount > 0 ? Math.round((totalRating / ratingCount) * 10) / 10 : 0,
        activeJobs: active,
      });
      setLoading(false);
    }, (error) => {
      console.error('Stats query error:', error);
      if (error.code === 'permission-denied') {
        setStats({
          completedJobs: 0,
          hoursWorked: 0,
          rating: 0,
          activeJobs: 0,
        });
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [employeeId]);

  if (loading) {
    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>This Month</Text>
        <View style={styles.statsRow}>
          <AntDesign name="loading1" size={24} color="#4facfe" />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>This Month</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.completedJobs}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.activeJobs}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.hoursWorked}h</Text>
          <Text style={styles.statLabel}>Hours</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={styles.ratingContainer}>
            <Text style={styles.statNumber}>{stats.rating || '--'}</Text>
            {stats.rating > 0 && <AntDesign name="star" size={16} color="#FFD700" style={styles.starIcon} />}
          </View>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
      </View>
    </View>
  );
};

// Enhanced HeroSlider Component
const HeroSlider = () => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const { settings } = useSettings();

  useEffect(() => {
    let timeout;
    if (!autoplayEnabled) {
      timeout = setTimeout(() => setAutoplayEnabled(true), 10000);
    }
    return () => clearTimeout(timeout);
  }, [autoplayEnabled]);

  return (
    <View style={styles.sliderContainer}>
      <Swiper
        style={styles.wrapper}
        showsButtons={false}
        autoplay={autoplayEnabled && settings.sliderAutoplay}
        autoplayTimeout={6}
        dotColor="rgba(255, 255, 255, 0.6)"
        activeDotColor="#00f2fe"
        onIndexChanged={(index) => setCurrentIndex(index)}
        onTouchStart={() => setAutoplayEnabled(false)}
        paginationStyle={{ bottom: 15 }}
        removeClippedSubviews={false}
      >
        {sliderData.map((item) => (
          <View key={item.id} style={styles.slide}>
            <ImageBackground source={item.image} style={styles.slideBackground} resizeMode="cover">
              <View style={styles.slideTextContainer}>
                <Text style={styles.slideTitle}>{item.title}</Text>
                <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
              </View>
            </ImageBackground>
          </View>
        ))}
      </Swiper>
    </View>
  );
};

// Equipment Section Component
const EquipmentSection = ({ employeeId }) => {
  const [equipment, setEquipment] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFirestoreListener(() => {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    const equipmentQuery = query(
      collection(db, 'equipment'),
      where('assignedTo', '==', employeeId),
      where('status', '==', 'assigned')
    );

    const unsubscribe = onSnapshot(equipmentQuery, (snapshot) => {
      const equipmentList = [];
      snapshot.forEach((doc) => {
        equipmentList.push({ id: doc.id, ...doc.data() });
      });
      setEquipment(equipmentList);
      setLoading(false);
    }, (error) => {
      console.error('Equipment query error:', error);
      if (error.code === 'permission-denied') {
        setEquipment([]);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [employeeId]);

  const getMaintenanceStatus = (lastMaintenance) => {
    if (!lastMaintenance) return { status: 'overdue', color: '#ef4444' };
    
    const daysSince = Math.floor((new Date() - lastMaintenance.toDate()) / (1000 * 60 * 60 * 24));
    if (daysSince > 7) return { status: 'due', color: '#f59e0b' };
    if (daysSince > 3) return { status: 'soon', color: '#eab308' };
    return { status: 'good', color: '#10b981' };
  };

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>My Equipment</Text>
        <TouchableOpacity onPress={() => router.push('/equipment-list')}>
          <Text style={styles.sectionLink}>View All</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <AntDesign name="loading1" size={20} color="#4facfe" />
        </View>
      ) : equipment.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.equipmentScroll}>
          {equipment.slice(0, 3).map((item) => {
            const maintenance = getMaintenanceStatus(item.lastMaintenance);
            return (
              <TouchableOpacity 
                key={item.id} 
                style={styles.equipmentCard}
                onPress={() => router.push(`/equipment-details?id=${item.id}`)}
              >
                <View style={styles.equipmentHeader}>
                  <AntDesign name="tool" size={24} color="#4facfe" />
                  <View style={[styles.maintenanceDot, { backgroundColor: maintenance.color }]} />
                </View>
                <Text style={styles.equipmentName}>{item.name}</Text>
                <Text style={styles.equipmentType}>{item.type}</Text>
                <Text style={[styles.maintenanceStatus, { color: maintenance.color }]}>
                  {maintenance.status === 'good' ? 'Maintained' : 
                   maintenance.status === 'soon' ? 'Due Soon' : 
                   maintenance.status === 'due' ? 'Maintenance Due' : 'Overdue'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : (
        <View style={styles.emptyCard}>
          <AntDesign name="tool" size={32} color="#d1d5db" />
          <Text style={styles.emptyText}>No equipment assigned</Text>
        </View>
      )}
    </View>
  );
};

// Unavailability Section Component
const UnavailabilitySection = ({ employeeId }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFirestoreListener(() => {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    const requestsQuery = query(
      collection(db, 'unavailability'),
      where('employeeId', '==', employeeId),
      where('status', 'in', ['pending', 'approved']),
      orderBy('startDate', 'asc'),
      limit(2)
    );

    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      const requestsList = [];
      snapshot.forEach((doc) => {
        requestsList.push({ id: doc.id, ...doc.data() });
      });
      setRequests(requestsList);
      setLoading(false);
    }, (error) => {
      console.error('Unavailability query error:', error);
      if (error.code === 'permission-denied') {
        setRequests([]);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [employeeId]);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Time Off</Text>
        <TouchableOpacity onPress={() => router.push('/unavailability-request')}>
          <Text style={styles.sectionLink}>Request</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <AntDesign name="loading1" size={20} color="#4facfe" />
        </View>
      ) : requests.length > 0 ? (
        <View style={styles.unavailabilityList}>
          {requests.map((request) => (
            <View key={request.id} style={styles.unavailabilityItem}>
              <View style={styles.unavailabilityIcon}>
                <AntDesign 
                  name={request.status === 'approved' ? 'checkcircle' : 'clockcircle'} 
                  size={16} 
                  color={request.status === 'approved' ? '#10b981' : '#f59e0b'} 
                />
              </View>
              <View style={styles.unavailabilityContent}>
                <Text style={styles.unavailabilityTitle}>{request.reason}</Text>
                <Text style={styles.unavailabilityDate}>
                  {new Date(request.startDate.toDate()).toLocaleDateString()} - 
                  {new Date(request.endDate.toDate()).toLocaleDateString()}
                </Text>
              </View>
              <Text style={[styles.unavailabilityStatus, 
                { color: request.status === 'approved' ? '#10b981' : '#f59e0b' }]}>
                {request.status}
              </Text>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <AntDesign name="calendar" size={32} color="#d1d5db" />
          <Text style={styles.emptyText}>No time off requests</Text>
          <TouchableOpacity 
            style={styles.emptyAction}
            onPress={() => router.push('/unavailability-request')}
          >
            <Text style={styles.emptyActionText}>Request Time Off</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// Today's Schedule Section Component
const TodayScheduleSection = ({ employeeId }) => {
  const [todayJobs, setTodayJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useFirestoreListener(() => {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const todayJobsQuery = query(
      collection(db, 'jobs'),
      where('assignedTo', '==', employeeId),
      where('scheduledDate', '>=', startOfDay),
      where('scheduledDate', '<', endOfDay),
      orderBy('scheduledDate', 'asc')
    );

    const unsubscribe = onSnapshot(todayJobsQuery, (snapshot) => {
      const jobsList = [];
      snapshot.forEach((doc) => {
        jobsList.push({ id: doc.id, ...doc.data() });
      });
      setTodayJobs(jobsList);
      setLoading(false);
    }, (error) => {
      console.error('Today jobs query error:', error);
      if (error.code === 'permission-denied') {
        setTodayJobs([]);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [employeeId]);

  return (
    <View style={styles.sectionContainer}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Today's Schedule</Text>
        <TouchableOpacity onPress={() => router.push('/(employee-tabs)/schedule')}>
          <Text style={styles.sectionLink}>Full Schedule</Text>
        </TouchableOpacity>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <AntDesign name="loading1" size={20} color="#4facfe" />
        </View>
      ) : todayJobs.length > 0 ? (
        <View style={styles.scheduleList}>
          {todayJobs.slice(0, 2).map((job) => (
            <TouchableOpacity 
              key={job.id} 
              style={styles.scheduleItem}
              onPress={() => router.push(`/job-details/${job.id}`)}
            >
              <View style={styles.scheduleTime}>
                <Text style={styles.scheduleTimeText}>
                  {job.scheduledDate ? new Date(job.scheduledDate.toDate()).toLocaleTimeString([], 
                    { hour: '2-digit', minute: '2-digit' }) : 'TBD'}
                </Text>
              </View>
              <View style={styles.scheduleContent}>
                <Text style={styles.scheduleTitle}>{job.title || 'Cleaning Job'}</Text>
                <Text style={styles.scheduleAddress}>
                  {job.address ? job.address.substring(0, 40) + '...' : 'No address'}
                </Text>
              </View>
              <View style={[styles.scheduleStatus, 
                { backgroundColor: job.status === 'In Progress' ? '#10b981' : '#4facfe' }]}>
                <Text style={styles.scheduleStatusText}>{job.status}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <AntDesign name="calendar" size={32} color="#d1d5db" />
          <Text style={styles.emptyText}>No jobs scheduled for today</Text>
        </View>
      )}
    </View>
  );
};

export default function EmployeeDashboard() {
  const { userProfile } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Close sidebar when component unmounts or loses focus
  useEffect(() => {
    return () => {
      setIsSidebarOpen(false);
      sidebarX.value = -SIDEBAR_WIDTH;
      overlayOpacity.value = 0;
    };
  }, []);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userType, setUserType] = useState("employee");
  const [employeeId, setEmployeeId] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const router = useRouter();
  const { logout } = useAuth();
  
  // Animation values
  const sidebarX = useSharedValue(-SIDEBAR_WIDTH);
  const overlayOpacity = useSharedValue(0);
  const headerY = useSharedValue(0);
  const cardsScale = useSharedValue(1);
  const clockPulse = useSharedValue(1);

  // Check profile completion and user type
  useEffect(() => {
    const checkProfile = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserType(userData.userType || "employee");
          setEmployeeId(auth.currentUser.uid);
          
          // Check if pre-registered employee needs to setup credentials
          if (userData.isPreRegistered && !userData.credentialsSetup) {
            router.replace("/employee-setup");
            return;
          }
          
          // Check if user needs to change generic password
          if (userData.isPreRegistered && !userData.passwordChanged) {
            Alert.alert(
              "Password Change Required 🔒",
              "For security, you must change your temporary password. A reset link will be sent to your email.",
              [{
                text: "Send Reset Link",
                onPress: async () => {
                  try {
                    await sendPasswordResetEmail(auth, auth.currentUser.email);
                    await updateDoc(doc(db, "users", auth.currentUser.uid), {
                      passwordResetSent: true,
                      updatedAt: new Date(),
                    });
                    router.push("/password-reset-sent");
                  } catch (error) {
                    Alert.alert("Error", "Failed to send reset email. Please try again.");
                  }
                }
              }]
            );
            return;
          }
          
          if (!userData.profileCompleted || !userData.name || !userData.phone) {
            router.replace("/setup-profile");
          }
        }
      }
    };
    checkProfile();
  }, []);

  // Load recent jobs
  useFirestoreListener(() => {
    if (!employeeId) {
      setRecentJobs([]);
      return;
    }

    const jobsQuery = query(
      collection(db, 'jobs'),
      where('assignedTo', '==', employeeId),
      orderBy('updatedAt', 'desc'),
      limit(3)
    );

    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      const jobs = [];
      snapshot.forEach((doc) => {
        jobs.push({ id: doc.id, ...doc.data() });
      });
      setRecentJobs(jobs);
    }, (error) => {
      console.error('Recent jobs query error:', error);
      if (error.code === 'permission-denied') {
        setRecentJobs([]);
      }
    });

    return unsubscribe;
  }, [employeeId]);

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Clock pulse animation for clocked-in state
  useEffect(() => {
    if (isClockedIn) {
      clockPulse.value = withSequence(
        withTiming(1.1, { duration: 800 }),
        withTiming(1, { duration: 800 })
      );
      const interval = setInterval(() => {
        clockPulse.value = withSequence(
          withTiming(1.1, { duration: 800 }),
          withTiming(1, { duration: 800 })
        );
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [isClockedIn]);

  const toggleSidebar = () => {
    const isOpening = !isSidebarOpen;
    sidebarX.value = withSpring(isOpening ? 0 : -SIDEBAR_WIDTH, { damping: 15 });
    overlayOpacity.value = withTiming(isOpening ? 0.5 : 0, { duration: 300 });
    setIsSidebarOpen(isOpening);
  };
  
  const closeSidebar = () => {
    sidebarX.value = withSpring(-SIDEBAR_WIDTH, { damping: 15 });
    overlayOpacity.value = withTiming(0, { duration: 300 });
    setIsSidebarOpen(false);
  };

  const handleClockIn = () => {
    const newState = !isClockedIn;
    setIsClockedIn(newState);
    
    // Enhanced animation feedback
    cardsScale.value = withSequence(
      withTiming(0.95, { duration: 100 }),
      withSpring(1, { damping: 8 })
    );
    
    Alert.alert(
      newState ? "🟢 Clocked In" : "🔴 Clocked Out",
      newState ? "Welcome back! Your shift has started." : "Great work today! Shift completed.",
      [{ text: "OK", style: "default" }]
    );
  };



  const handleLogout = async () => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Sign Out", 
          style: "destructive",
          onPress: async () => {
            await logout();
            router.replace("/");
          }
        }
      ]
    );
  };

  // Animated styles
  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sidebarX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const clockCardStyle = useAnimatedStyle(() => ({
    transform: [{ scale: clockPulse.value }],
  }));

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <ImageBackground
        source={require("../../assets/background_pattern.png")}
        style={styles.background}
        imageStyle={styles.backgroundImage}
      >
        {/* Overlay for sidebar */}
        {isSidebarOpen && (
          <Animated.View style={[styles.overlay, overlayStyle]}>
            <TouchableOpacity style={styles.overlayTouch} onPress={toggleSidebar} />
          </Animated.View>
        )}

        {/* Enhanced Sidebar */}
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

            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/(employee-tabs)/dashboard"); closeSidebar(); }}>
              <AntDesign name="home" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Employee Dashboard</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/(employee-tabs)/jobs"); closeSidebar(); }}>
              <Feather name="briefcase" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Job Sites & Tracking</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/(employee-tabs)/messaging"); closeSidebar(); }}>
              <AntDesign name="message1" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Team Messaging</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/(employee-tabs)/news"); closeSidebar(); }}>
              <MaterialCommunityIcons name="newspaper" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Company News</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/(employee-tabs)/profile"); closeSidebar(); }}>
              <AntDesign name="user" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>My Profile</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/(employee-tabs)/schedule"); closeSidebar(); }}>
              <AntDesign name="calendar" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Schedule</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/settings"); closeSidebar(); }}>
              <AntDesign name="setting" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Settings</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            {userType === "admin" && (
              <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/admin-dashboard"); closeSidebar(); }}>
                <AntDesign name="team" size={22} color="#fff" style={styles.sidebarIcon} />
                <Text style={styles.sidebarText}>Admin Panel</Text>
                <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
              </TouchableOpacity>
            )}

            <View style={styles.sidebarFooter}>
              <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                <AntDesign name="logout" size={20} color="#fff" />
                <Text style={styles.logoutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Enhanced Header */}
        <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <AntDesign name="menuunfold" size={26} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Image source={require("../../assets/teddy-logo.png")} style={styles.logo} />
            <View>
              <Text style={styles.headerTitle}>Teddy's Cleaning</Text>
              <Text style={styles.headerSubtitle}>Employee Hub</Text>
            </View>
          </View>
          
          <View style={styles.headerRight}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <View style={[styles.statusDot, isClockedIn && styles.statusDotActive]} />
          </View>
        </LinearGradient>

        {/* Content */}
        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Slider */}
          <HeroSlider />
          
          {/* Quick Stats */}
          <QuickStats employeeId={employeeId} />
          
          {/* Clock Status Card */}
          <Animated.View style={[styles.clockStatusCard, clockCardStyle]}>
            <LinearGradient 
              colors={isClockedIn ? ["#11998e", "#38ef7d"] : ["#6B7280", "#9CA3AF"]}
              style={styles.clockStatusInner}
            >
              <View style={styles.clockStatusLeft}>
                <AntDesign 
                  name={isClockedIn ? "checkcircle" : "clockcircleo"} 
                  size={32} 
                  color="#fff" 
                />
                <View style={styles.clockStatusText}>
                  <Text style={styles.clockStatusTitle}>
                    {isClockedIn ? "Currently Working" : "Ready to Start"}
                  </Text>
                  <Text style={styles.clockStatusSubtitle}>
                    {isClockedIn ? "Shift started at 8:00 AM" : "Tap to begin your shift"}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={handleClockIn} style={styles.clockButton}>
                <Text style={styles.clockButtonText}>
                  {isClockedIn ? "Clock Out" : "Clock In"}
                </Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>

          {/* My Equipment */}
          <EquipmentSection employeeId={employeeId} />
          
          {/* Unavailability Status */}
          <UnavailabilitySection employeeId={employeeId} />
          
          {/* Today's Schedule */}
          <TodayScheduleSection employeeId={employeeId} />

          {/* Recent Jobs */}
          <Text style={styles.sectionTitle}>Recent Jobs</Text>
          <View style={styles.activityContainer}>
            {recentJobs.length > 0 ? (
              recentJobs.map((job) => {
                const getStatusIcon = (status) => {
                  switch (status) {
                    case 'Completed': return { name: 'checkcircle', color: '#11998e' };
                    case 'In Progress': return { name: 'clockcircle', color: '#fc466b' };
                    case 'Assigned': return { name: 'calendar', color: '#4facfe' };
                    default: return { name: 'exclamationcircle', color: '#6b7280' };
                  }
                };
                
                const statusIcon = getStatusIcon(job.status);
                
                return (
                  <TouchableOpacity 
                    key={job.id} 
                    style={styles.activityItem}
                    onPress={() => router.push(`/job-details/${job.id}`)}
                  >
                    <View style={styles.activityIcon}>
                      <AntDesign name={statusIcon.name} size={20} color={statusIcon.color} />
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{job.title || 'Cleaning Job'}</Text>
                      <Text style={styles.activitySubtitle}>
                        {job.status} • {job.address ? job.address.substring(0, 30) + '...' : 'No address'}
                      </Text>
                    </View>
                    {job.status === 'Completed' && job.rating && (
                      <Text style={styles.activityRating}>{job.rating} ⭐</Text>
                    )}
                    {job.status === 'In Progress' && (
                      <Text style={styles.activityTime}>Active</Text>
                    )}
                  </TouchableOpacity>
                );
              })
            ) : (
              <View style={styles.emptyState}>
                <AntDesign name="inbox" size={48} color="#d1d5db" />
                <Text style={styles.emptyTitle}>No Recent Jobs</Text>
                <Text style={styles.emptySubtitle}>Your assigned jobs will appear here</Text>
              </View>
            )}
          </View>
        </ScrollView>
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
  
  // Overlay
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

  // Enhanced Header
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
    marginLeft: -40, // Compensate for menu button
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
  },
  timeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.3)",
    marginTop: 2,
  },
  statusDotActive: {
    backgroundColor: "#38ef7d",
  },

  // Enhanced Sidebar
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

  // Enhanced Slider
  sliderContainer: {
    height: 220,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  wrapper: {},
  slide: {
    flex: 1,
    justifyContent: "flex-end",
  },
  slideBackground: {
    flex: 1,
    justifyContent: "flex-end",
  },

  slideTextContainer: {
    backgroundColor: "rgba(0,0,0,0.6)",
    padding: 20,
    margin: 24,
    borderRadius: 12,
  },
  slideTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  slideSubtitle: {
    fontSize: 14,
    color: "#EEEEEE",
    lineHeight: 20,
    fontWeight: "500",
  },

  // Content
  content: { 
    padding: 20, 
    paddingBottom: 100,
  },

  // Quick Stats
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
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  starIcon: {
    marginLeft: 4,
  },

  // Clock Status Card
  clockStatusCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  clockStatusInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
  },
  clockStatusLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  clockStatusText: {
    marginLeft: 16,
    flex: 1,
  },
  clockStatusTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
  clockStatusSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },
  clockButton: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  clockButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },

  // Section Title
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#1f2937", 
    marginBottom: 16,
    letterSpacing: 0.3,
  },

  // Section Styles
  sectionContainer: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLink: {
    color: '#4facfe',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
  },
  
  // Equipment Styles
  equipmentScroll: {
    flexDirection: 'row',
  },
  equipmentCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 140,
    elevation: 2,
  },
  equipmentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  maintenanceDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  equipmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  equipmentType: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  maintenanceStatus: {
    fontSize: 10,
    fontWeight: '600',
  },
  
  // Unavailability Styles
  unavailabilityList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  unavailabilityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  unavailabilityIcon: {
    marginRight: 12,
  },
  unavailabilityContent: {
    flex: 1,
  },
  unavailabilityTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  unavailabilityDate: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  unavailabilityStatus: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  
  // Schedule Styles
  scheduleList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  scheduleTime: {
    width: 60,
    marginRight: 12,
  },
  scheduleTimeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4facfe',
  },
  scheduleContent: {
    flex: 1,
  },
  scheduleTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
  },
  scheduleAddress: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  scheduleStatus: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  scheduleStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  
  // Empty State Styles
  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
    marginBottom: 12,
  },
  emptyAction: {
    backgroundColor: '#4facfe',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Recent Activity
  activityContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    marginBottom: 20,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  activitySubtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  activityRating: {
    fontSize: 12,
    fontWeight: "600",
    color: "#11998e",
  },
  activityTime: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fc466b",
  },
  activityBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#fff",
    backgroundColor: "#ef4444",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
});