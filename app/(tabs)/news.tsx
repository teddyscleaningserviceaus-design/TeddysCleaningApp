import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.8;

const newsData = [
  {
    id: "1",
    title: "🚀 New Robotic Fleet Deployment",
    summary: "Teddy's Cleaning introduces 50 new autonomous cleaning robots across all locations, reducing manual labor by 40%.",
    category: "Technology",
    time: "2 hours ago",
    priority: "High",
    gradient: ["#667eea", "#764ba2"],
    icon: "robot",
  },
  {
    id: "2",
    title: "🌱 Green Certification Achievement",
    summary: "We've officially received our ISO 14001 environmental certification for sustainable cleaning practices.",
    category: "Sustainability",
    time: "1 day ago",
    priority: "Medium",
    gradient: ["#11998e", "#38ef7d"],
    icon: "earth",
  },
  {
    id: "3",
    title: "🏆 Employee of the Month Awards",
    summary: "Congratulations to Sarah Johnson, Mike Chen, and Alex Rodriguez for outstanding performance this month!",
    category: "Recognition",
    time: "3 days ago",
    priority: "Medium",
    gradient: ["#fc466b", "#3f5efb"],
    icon: "trophy",
  },
  {
    id: "4",
    title: "📋 New Safety Protocols Update",
    summary: "Updated safety guidelines for chemical handling and equipment usage. Mandatory training starts Monday.",
    category: "Safety",
    time: "1 week ago",
    priority: "High",
    gradient: ["#a8edea", "#fed6e3"],
    icon: "safety",
  },
];

export default function NewsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  
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

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "#ef4444";
      case "Medium": return "#f59e0b";
      case "Low": return "#10b981";
      default: return "#6b7280";
    }
  };

  const getIconName = (iconType) => {
    switch (iconType) {
      case "robot": return "android";
      case "earth": return "earth";
      case "trophy": return "Trophy";
      case "safety": return "Safety";
      default: return "notification";
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      
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
            <Image source={require("../../assets/teddy-logo.png")} style={styles.logo} />
            <View>
              <Text style={styles.headerTitle}>Company News</Text>
              <Text style={styles.headerSubtitle}>Stay Updated</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.headerRight}>
            <AntDesign name="search1" size={20} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.statsContainer}>
            <Text style={styles.statsTitle}>News Overview</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>4</Text>
                <Text style={styles.statLabel}>New Articles</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>2</Text>
                <Text style={styles.statLabel}>High Priority</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>12</Text>
                <Text style={styles.statLabel}>This Week</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>Read</Text>
                <Text style={styles.statLabel}>All Caught Up</Text>
              </View>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Latest Updates</Text>
          
          {newsData.map((article) => (
            <TouchableOpacity key={article.id} style={styles.newsCard}>
              <LinearGradient colors={article.gradient} style={styles.newsCardGradient}>
                <View style={styles.newsCardHeader}>
                  <View style={styles.newsCardLeft}>
                    <View style={styles.categoryContainer}>
                      <Text style={styles.categoryText}>{article.category}</Text>
                      <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(article.priority) }]} />
                    </View>
                    <Text style={styles.newsTitle}>{article.title}</Text>
                    <Text style={styles.newsSummary} numberOfLines={3}>
                      {article.summary}
                    </Text>
                  </View>
                  <View style={styles.newsCardRight}>
                    <AntDesign name={getIconName(article.icon)} size={32} color="rgba(255,255,255,0.8)" />
                  </View>
                </View>
                
                <View style={styles.newsCardFooter}>
                  <View style={styles.timeContainer}>
                    <AntDesign name="clockcircleo" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.timeText}>{article.time}</Text>
                  </View>
                  <TouchableOpacity style={styles.readMoreButton}>
                    <Text style={styles.readMoreText}>Read More</Text>
                    <AntDesign name="right" size={12} color="#fff" />
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          ))}

          <View style={styles.quickActionsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.actionGrid}>
              <TouchableOpacity style={styles.actionCard}>
                <LinearGradient colors={["#667eea", "#764ba2"]} style={styles.actionCardInner}>
                  <AntDesign name="notification" size={28} color="#fff" />
                  <Text style={styles.actionCardTitle}>Notifications</Text>
                  <Text style={styles.actionCardSubtitle}>Manage Alerts</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionCard}>
                <LinearGradient colors={["#11998e", "#38ef7d"]} style={styles.actionCardInner}>
                  <AntDesign name="calendar" size={28} color="#fff" />
                  <Text style={styles.actionCardTitle}>Events</Text>
                  <Text style={styles.actionCardSubtitle}>View Calendar</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionCard}>
                <LinearGradient colors={["#fc466b", "#3f5efb"]} style={styles.actionCardInner}>
                  <AntDesign name="filetext1" size={28} color="#fff" />
                  <Text style={styles.actionCardTitle}>Archives</Text>
                  <Text style={styles.actionCardSubtitle}>Past News</Text>
                </LinearGradient>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.actionCard}>
                <LinearGradient colors={["#a8edea", "#fed6e3"]} style={styles.actionCardInner}>
                  <AntDesign name="setting" size={28} color="#fff" />
                  <Text style={styles.actionCardTitle}>Preferences</Text>
                  <Text style={styles.actionCardSubtitle}>Customize</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <LinearGradient colors={["#1e3c72", "#2a5298"]} style={styles.bottomNav}>
          <TouchableOpacity style={styles.navItem} onPress={() => router.push("/dashboard")}>
            <AntDesign name="home" size={24} color="rgba(255,255,255,0.7)" />
            <Text style={[styles.navText, styles.navTextInactive]}>Home</Text>
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
            <MaterialCommunityIcons name="newspaper" size={24} color="#fff" />
            <Text style={styles.navText}>News</Text>
            <View style={styles.navIndicator} />
          </TouchableOpacity>
        </LinearGradient>
      </ImageBackground>
    </SafeAreaView>
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
    paddingBottom: 100,
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

  newsCard: {
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  newsCardGradient: {
    padding: 20,
  },
  newsCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  newsCardLeft: {
    flex: 1,
  },
  categoryContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
    marginRight: 8,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
  },
  newsSummary: {
    fontSize: 14,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 20,
  },
  newsCardRight: {
    marginLeft: 16,
  },
  newsCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  timeText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    fontWeight: "500",
    marginLeft: 4,
  },
  readMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  readMoreText: {
    fontSize: 12,
    color: "#fff",
    fontWeight: "600",
    marginRight: 4,
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