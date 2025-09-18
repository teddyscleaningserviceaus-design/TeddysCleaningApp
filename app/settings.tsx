import { AntDesign, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
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
import { useSettings } from "../contexts/SettingsContext";

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = width * 0.8;

export default function SettingsPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const router = useRouter();
  const { settings, updateSetting, loading } = useSettings();
  
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

  const handleToggle = async (key: string, value: boolean) => {
    await updateSetting(key, value);
    if (key === 'notifications' && value) {
      Alert.alert("Notifications Enabled", "You'll receive important updates and reminders.");
    }
  };

  const handleLanguageChange = () => {
    Alert.alert(
      "Language Settings",
      "Choose your preferred language",
      [
        { text: "English", onPress: () => updateSetting('language', 'English') },
        { text: "Spanish", onPress: () => updateSetting('language', 'Spanish') },
        { text: "French", onPress: () => updateSetting('language', 'French') },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

  const handleClockOutTime = () => {
    Alert.alert(
      "Auto Clock-Out Time",
      "Set hours for automatic clock-out",
      [
        { text: "6 Hours", onPress: () => updateSetting('clockOutTime', 6) },
        { text: "8 Hours", onPress: () => updateSetting('clockOutTime', 8) },
        { text: "10 Hours", onPress: () => updateSetting('clockOutTime', 10) },
        { text: "12 Hours", onPress: () => updateSetting('clockOutTime', 12) },
        { text: "Cancel", style: "cancel" }
      ]
    );
  };

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
              <Text style={styles.headerTitle}>Settings</Text>
              <Text style={styles.headerSubtitle}>Preferences</Text>
            </View>
          </View>
          
          <TouchableOpacity style={styles.headerRight}>
            <AntDesign name="save" size={20} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.settingsContainer}>
            <Text style={styles.sectionTitle}>Notifications</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <AntDesign name="notification" size={24} color="#4facfe" />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Push Notifications</Text>
                  <Text style={styles.settingSubtitle}>Receive job updates and reminders</Text>
                </View>
              </View>
              <Switch
                value={settings.notifications}
                onValueChange={(value) => handleToggle('notifications', value)}
                trackColor={{ false: "#e5e7eb", true: "#4facfe" }}
                thumbColor={settings.notifications ? "#fff" : "#f4f3f4"}
              />
            </View>
          </View>

          <View style={styles.settingsContainer}>
            <Text style={styles.sectionTitle}>Appearance</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <AntDesign name="bulb1" size={24} color="#4facfe" />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Dark Mode</Text>
                  <Text style={styles.settingSubtitle}>Switch to dark theme</Text>
                </View>
              </View>
              <Switch
                value={settings.darkMode}
                onValueChange={(value) => handleToggle('darkMode', value)}
                trackColor={{ false: "#e5e7eb", true: "#4facfe" }}
                thumbColor={settings.darkMode ? "#fff" : "#f4f3f4"}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <AntDesign name="play" size={24} color="#4facfe" />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Slider Autoplay</Text>
                  <Text style={styles.settingSubtitle}>Auto-scroll dashboard slider</Text>
                </View>
              </View>
              <Switch
                value={settings.sliderAutoplay}
                onValueChange={(value) => handleToggle('sliderAutoplay', value)}
                trackColor={{ false: "#e5e7eb", true: "#4facfe" }}
                thumbColor={settings.sliderAutoplay ? "#fff" : "#f4f3f4"}
              />
            </View>
          </View>

          <View style={styles.settingsContainer}>
            <Text style={styles.sectionTitle}>Work Settings</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <AntDesign name="clockcircle" size={24} color="#4facfe" />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Auto Clock-Out</Text>
                  <Text style={styles.settingSubtitle}>Automatically clock out after set hours</Text>
                </View>
              </View>
              <Switch
                value={settings.autoClockOut}
                onValueChange={(value) => handleToggle('autoClockOut', value)}
                trackColor={{ false: "#e5e7eb", true: "#4facfe" }}
                thumbColor={settings.autoClockOut ? "#fff" : "#f4f3f4"}
              />
            </View>

            <TouchableOpacity style={styles.settingItem} onPress={handleClockOutTime}>
              <View style={styles.settingLeft}>
                <AntDesign name="hourglass" size={24} color="#4facfe" />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Clock-Out Time</Text>
                  <Text style={styles.settingSubtitle}>{settings.clockOutTime} hours</Text>
                </View>
              </View>
              <AntDesign name="right" size={16} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.settingsContainer}>
            <Text style={styles.sectionTitle}>General</Text>
            
            <TouchableOpacity style={styles.settingItem} onPress={handleLanguageChange}>
              <View style={styles.settingLeft}>
                <AntDesign name="global" size={24} color="#4facfe" />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Language</Text>
                  <Text style={styles.settingSubtitle}>{settings.language}</Text>
                </View>
              </View>
              <AntDesign name="right" size={16} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <AntDesign name="questioncircle" size={24} color="#4facfe" />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>Help & Support</Text>
                  <Text style={styles.settingSubtitle}>Get help and contact support</Text>
                </View>
              </View>
              <AntDesign name="right" size={16} color="#6b7280" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <AntDesign name="infocirlce" size={24} color="#4facfe" />
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>About</Text>
                  <Text style={styles.settingSubtitle}>App version and information</Text>
                </View>
              </View>
              <AntDesign name="right" size={16} color="#6b7280" />
            </TouchableOpacity>
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

  settingsContainer: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#1f2937", 
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  settingContent: {
    marginLeft: 16,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  settingSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 2,
  },
});