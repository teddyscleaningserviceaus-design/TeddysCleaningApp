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
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { sendPasswordResetEmail } from "firebase/auth";
import { useSettings } from "../../contexts/SettingsContext";

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

// Quick stats component
const QuickStats = () => {
  const [stats] = useState({
    completedJobs: 47,
    hoursWorked: 156.5,
    rating: 4.9,
    streak: 12,
  });

  return (
    <View style={styles.statsContainer}>
      <Text style={styles.statsTitle}>This Month</Text>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.completedJobs}</Text>
          <Text style={styles.statLabel}>Jobs Done</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.hoursWorked}h</Text>
          <Text style={styles.statLabel}>Hours</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <View style={styles.ratingContainer}>
            <Text style={styles.statNumber}>{stats.rating}</Text>
            <AntDesign name="star" size={16} color="#FFD700" style={styles.starIcon} />
          </View>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{stats.streak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
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

// Enhanced action cards data
const actionCards = [
  {
    id: "clock",
    title: "Clock In/Out",
    subtitle: "Power Up!",
    icon: "clockcircleo",
    gradient: ["#667eea", "#764ba2"],
    route: null,
    isSpecial: true,
  },
  {
    id: "schedule",
    title: "Schedule",
    subtitle: "Plan Your Day",
    icon: "calendar",
    gradient: ["#11998e", "#38ef7d"],
    route: "/schedule",
  },
  {
    id: "timeoff",
    title: "Time Off",
    subtitle: "Request Leave",
    icon: "closecircleo",
    gradient: ["#fc466b", "#3f5efb"],
    route: "/unavailability",
  },
  {
    id: "cleanindex",
    title: "Clean Index",
    subtitle: "Air Quality",
    icon: "dashboard",
    gradient: ["#a8edea", "#fed6e3"],
    route: "/clean-index",
  },
  {
    id: "robots",
    title: "Robot Status",
    subtitle: "Check Bots",
    icon: "android",
    gradient: ["#667eea", "#764ba2"],
    route: "/robot-status",
  },
  {
    id: "waste",
    title: "Waste Report",
    subtitle: "Sustainability",
    icon: "reload1",
    gradient: ["#11998e", "#38ef7d"],
    route: "/waste-report",
  },
];

export default function EmployeeDashboard() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [userType, setUserType] = useState("employee");
  const router = useRouter();
  
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

  const handleCardPress = (card) => {
    if (card.isSpecial) {
      handleClockIn();
    } else if (card.route) {
      router.push(card.route);
    }
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
            await auth.signOut();
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
                  <AntDesign name="user" size={24} color="#fff" />
                </View>
                <View>
                  <Text style={styles.sidebarUserName}>Welcome Back!</Text>
                  <Text style={styles.sidebarUserRole}>Cleaning Professional</Text>
                </View>
              </View>
              <TouchableOpacity onPress={toggleSidebar} style={styles.closeButton}>
                <AntDesign name="close" size={20} color="#fff" />
              </TouchableOpacity>
            </View>

            <View style={styles.sidebarDivider} />

            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/dashboard"); toggleSidebar(); }}>
              <AntDesign name="home" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Employee Dashboard</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/jobs"); toggleSidebar(); }}>
              <Feather name="briefcase" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Job Sites & Tracking</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/messaging"); toggleSidebar(); }}>
              <AntDesign name="message1" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Team Messaging</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/news"); toggleSidebar(); }}>
              <MaterialCommunityIcons name="newspaper" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Company News</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/profile"); toggleSidebar(); }}>
              <AntDesign name="user" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>My Profile</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/settings"); toggleSidebar(); }}>
              <AntDesign name="setting" size={22} color="#fff" style={styles.sidebarIcon} />
              <Text style={styles.sidebarText}>Settings</Text>
              <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            {userType === "admin" && (
              <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/admin-dashboard"); toggleSidebar(); }}>
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
          <QuickStats />
          
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

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            {actionCards.filter(card => !card.isSpecial).map((card, index) => (
              <Animated.View 
                key={card.id} 
                style={[
                  styles.actionCard,
                  { 
                    transform: [{ 
                      scale: useSharedValue(1)
                    }] 
                  }
                ]}
              >
                <TouchableOpacity onPress={() => handleCardPress(card)}>
                  <LinearGradient colors={card.gradient} style={styles.actionCardInner}>
                    <AntDesign name={card.icon} size={28} color="#fff" />
                    <Text style={styles.actionCardTitle}>{card.title}</Text>
                    <Text style={styles.actionCardSubtitle}>{card.subtitle}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>

          {/* Recent Activity */}
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityContainer}>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <AntDesign name="checkcircle" size={20} color="#11998e" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Office Complex - Level 3</Text>
                <Text style={styles.activitySubtitle}>Completed 2 hours ago</Text>
              </View>
              <Text style={styles.activityRating}>4.9 ⭐</Text>
            </View>
            
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <AntDesign name="clockcircle" size={20} color="#fc466b" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Residential Clean - Smith House</Text>
                <Text style={styles.activitySubtitle}>In progress</Text>
              </View>
              <Text style={styles.activityTime}>2h 15m</Text>
            </View>
            
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <AntDesign name="star" size={20} color="#FFD700" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Achievement Unlocked!</Text>
                <Text style={styles.activitySubtitle}>Perfect Week - 7 days, 5-star ratings</Text>
              </View>
              <Text style={styles.activityBadge}>NEW</Text>
            </View>
          </View>
        </ScrollView>

        {/* Enhanced Bottom Navigation */}
        <LinearGradient colors={["#1e3c72", "#2a5298"]} style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push("/dashboard")}>
            <AntDesign name="home" size={24} color="#fff" />
            <Text style={styles.navText}>Home</Text>
            <View style={styles.navIndicator} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem} onPress={() => router.push("/jobs")}>
            <Feather name="briefcase" size={24} color="rgba(255,255,255,0.7)" />
            <Text style={[styles.navText, styles.navTextInactive]}>Jobs</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem} onPress={() => router.push("/messaging")}>
            <View style={styles.messageIconContainer}>
              <AntDesign name="message1" size={24} color="rgba(255,255,255,0.7)" />
              <View style={styles.messageBadge}>
                <Text style={styles.messageBadgeText}>3</Text>
              </View>
            </View>
            <Text style={[styles.navText, styles.navTextInactive]}>Messages</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.navItem} onPress={() => router.push("/news")}>
            <MaterialCommunityIcons name="newspaper" size={24} color="rgba(255,255,255,0.7)" />
            <Text style={[styles.navText, styles.navTextInactive]}>News</Text>
          </TouchableOpacity>
        </LinearGradient>
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

  // Action Grid
  actionGrid: { 
    flexDirection: "row", 
    flexWrap: "wrap", 
    justifyContent: "space-between",
    marginBottom: 32,
  },
  actionCard: {
    width: "48%",
    height: 140,
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
    marginTop: 12,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  actionCardSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 11,
    fontWeight: "500",
    marginTop: 4,
    textAlign: "center",
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

  // Enhanced Bottom Navigation
  bottomNav: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 12,
    paddingBottom: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    elevation: 8,
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  navItem: { 
    alignItems: "center",
    position: "relative",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  navText: { 
    color: "#fff", 
    fontSize: 12, 
    marginTop: 4,
    fontWeight: "600",
  },
  navTextInactive: {
    color: "rgba(255,255,255,0.7)",
  },
  navIndicator: {
    position: "absolute",
    top: -8,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#00f2fe",
  },
  messageIconContainer: {
    position: "relative",
  },
  messageBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#ef4444",
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  messageBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
});