import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
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
  withSpring,
  withTiming
} from "react-native-reanimated";
import { auth, db } from "../config/firebase";
import { doc, getDoc } from "firebase/firestore";

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.8;



const statsData = [
  { label: "Total Jobs", value: "247", icon: "checkcircle", color: "#11998e" },
  { label: "Hours Worked", value: "1,856", icon: "clockcircle", color: "#fc466b" },
  { label: "Avg Rating", value: "4.9", icon: "star", color: "#FFD700" },
  { label: "Years Active", value: "2.5", icon: "Trophy", color: "#667eea" },
];

export default function ProfilePage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    name: "",
    employeeId: "",
    role: "",
    department: "",
    startDate: "",
    email: "",
    phone: "",
    address: "",
    emergencyContact: "",
  });
  const router = useRouter();

  useEffect(() => {
    const loadUserData = async () => {
      if (auth.currentUser) {
        const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setProfileData({
            name: userData.name || "Employee",
            employeeId: userData.employeeId || "TC-0000-0000",
            role: userData.role || "Cleaning Specialist",
            department: userData.department || "Operations",
            startDate: userData.startDate || "N/A",
            email: userData.email || auth.currentUser.email,
            phone: userData.phone || "Not provided",
            address: userData.address || "Not provided",
            emergencyContact: userData.emergencyContact || "Not provided",
          });
        }
      }
    };
    loadUserData();
  }, []);
  
  const sidebarX = useSharedValue(-SIDEBAR_WIDTH);
  const overlayOpacity = useSharedValue(0);

  const toggleSidebar = () => {
    const isOpening = !isSidebarOpen;
    sidebarX.value = withSpring(isOpening ? 0 : -SIDEBAR_WIDTH, { damping: 15 });
    overlayOpacity.value = withTiming(isOpening ? 0.5 : 0, { duration: 300 });
    setIsSidebarOpen(isOpening);
  };

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sidebarX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <ImageBackground
        source={require("../assets/background_pattern.png")}
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
          </LinearGradient>
        </Animated.View>

        <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
          <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
            <AntDesign name="menuunfold" size={26} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Image source={require("../assets/teddy-logo.png")} style={styles.logo} />
            <View>
              <Text style={styles.headerTitle}>My Profile</Text>
              <Text style={styles.headerSubtitle}>Personal Info</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.headerRight} onPress={() => router.push("/edit-profile")}>
            <AntDesign name="edit" size={20} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileCard}>
            <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.profileHeader}>
              <View style={styles.profileAvatarContainer}>
                <View style={styles.profileAvatar}>
                  <AntDesign name="user" size={40} color="#fff" />
                </View>
              </View>
              <Text style={styles.profileName}>{profileData.name}</Text>
              <Text style={styles.profileRole}>{profileData.role}</Text>
              <Text style={styles.profileId}>ID: {profileData.employeeId}</Text>
            </LinearGradient>
          </View>

          <View style={styles.statsContainer}>
            <Text style={styles.sectionTitle}>Performance Stats</Text>
            <View style={styles.statsGrid}>
              {statsData.map((stat, index) => (
                <View key={index} style={styles.statCard}>
                  <View style={[styles.statIcon, { backgroundColor: stat.color }]}>
                    <AntDesign name={stat.icon} size={20} color="#fff" />
                  </View>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.infoContainer}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            
            <View style={styles.infoCard}>
              <View style={styles.infoItem}>
                <AntDesign name="idcard" size={20} color="#4facfe" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Department</Text>
                  <Text style={styles.infoValue}>{profileData.department}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <AntDesign name="calendar" size={20} color="#4facfe" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Start Date</Text>
                  <Text style={styles.infoValue}>{profileData.startDate}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <AntDesign name="mail" size={20} color="#4facfe" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Email</Text>
                  <Text style={styles.infoValue}>{profileData.email}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <AntDesign name="phone" size={20} color="#4facfe" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Phone</Text>
                  <Text style={styles.infoValue}>{profileData.phone}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <AntDesign name="home" size={20} color="#4facfe" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Address</Text>
                  <Text style={styles.infoValue}>{profileData.address}</Text>
                </View>
              </View>
              
              <View style={styles.infoItem}>
                <AntDesign name="contacts" size={20} color="#4facfe" />
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Emergency Contact</Text>
                  <Text style={styles.infoValue}>{profileData.emergencyContact}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.quickActionsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/edit-profile")}>
                <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.actionCardInner}>
                  <AntDesign name="edit" size={28} color="#fff" />
                  <Text style={styles.actionCardTitle}>Edit Profile</Text>
                  <Text style={styles.actionCardSubtitle}>Update Info</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionCard} onPress={() => router.push("/change-password")}>
                <LinearGradient colors={["#11998e", "#38ef7d"]} style={styles.actionCardInner}>
                  <AntDesign name="lock" size={28} color="#fff" />
                  <Text style={styles.actionCardTitle}>Password</Text>
                  <Text style={styles.actionCardSubtitle}>Change</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionCard}>
                <LinearGradient colors={["#fc466b", "#3f5efb"]} style={styles.actionCardInner}>
                  <AntDesign name="filetext1" size={28} color="#fff" />
                  <Text style={styles.actionCardTitle}>Documents</Text>
                  <Text style={styles.actionCardSubtitle}>View Files</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionCard}>
                <LinearGradient colors={["#a8edea", "#fed6e3"]} style={styles.actionCardInner}>
                  <AntDesign name="setting" size={28} color="#fff" />
                  <Text style={styles.actionCardTitle}>Preferences</Text>
                  <Text style={styles.actionCardSubtitle}>Settings</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
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

  content: { 
    padding: 20, 
    paddingBottom: 40,
  },

  profileCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 24,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  profileHeader: {
    alignItems: "center",
    padding: 30,
  },
  profileAvatarContainer: {
    marginBottom: 16,
  },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.3)",
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 4,
  },
  profileRole: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    marginBottom: 8,
  },
  profileId: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
  },

  statsContainer: {
    marginBottom: 24,
  },
  sectionTitle: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#1f2937", 
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1f2937",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
  },

  infoContainer: {
    marginBottom: 24,
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "500",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "600",
  },

  quickActionsContainer: {
    marginBottom: 24,
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
});