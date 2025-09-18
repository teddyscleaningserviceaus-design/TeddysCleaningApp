import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import React, { useState } from 'react';
import { Alert, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { auth } from '../config/firebase';
import notificationService from '../services/notificationService';
import { useClient } from '../contexts/ClientContext';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.8;

interface ClientHeaderProps {
  title: string;
  subtitle?: string;
  showWelcome?: boolean;
  userName?: string;
  theme?: 'default' | 'waste' | 'education' | 'bookings' | 'profile';
}

export default function ClientHeader({ title, subtitle, showWelcome = false, userName = 'Client', theme = 'default' }: ClientHeaderProps) {
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();
  const { cleanup, clientData } = useClient();
  
  // Reset menu state when theme changes (different tabs)
  React.useEffect(() => {
    setShowMenu(false);
    sidebarX.value = -SIDEBAR_WIDTH;
    overlayOpacity.value = 0;
  }, [theme]);
  
  // Animation values
  const sidebarX = useSharedValue(-SIDEBAR_WIDTH);
  const overlayOpacity = useSharedValue(0);

  // Get proper display name from client data with length optimization
  const getDisplayName = () => {
    // Prioritize firstName from client data
    if (clientData?.firstName) {
      return clientData.firstName;
    }
    
    // Fallback to full name if available
    if (clientData?.name && !clientData.name.includes('@')) {
      const firstName = clientData.name.split(' ')[0];
      return firstName;
    }
    
    // Last resort - use userName prop if it's not 'Client' and not an email
    if (userName && userName !== 'Client' && !userName.includes('@')) {
      const firstName = userName.split(' ')[0];
      return firstName;
    }
    
    return 'Client';
  };

  const toggleSidebar = () => {
    const isOpening = !showMenu;
    sidebarX.value = withSpring(isOpening ? 0 : -SIDEBAR_WIDTH, { damping: 15 });
    overlayOpacity.value = withSpring(isOpening ? 0.5 : 0);
    setShowMenu(isOpening);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cleanup all listeners before logout
              notificationService.cleanup();
              cleanup?.();
              
              await signOut(auth);
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Animated styles
  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sidebarX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const getThemeColors = () => {
    switch (theme) {
      case 'waste': return ['#28a745', '#20c997'];
      case 'education': return ['#667eea', '#764ba2'];
      case 'bookings': return ['#4facfe', '#00f2fe'];
      case 'profile': return ['#6f42c1', '#e83e8c'];
      default: return ['#4facfe', '#00f2fe'];
    }
  };

  return (
    <>
      <LinearGradient colors={getThemeColors()} style={[styles.header, showWelcome && styles.homeHeader]}>
        <View style={styles.headerTop}>
          <TouchableOpacity style={styles.menuButton} onPress={toggleSidebar}>
            <Ionicons name="menu" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Image source={require('../assets/teddy-logo.png')} style={styles.logo} />
            <View>
              {showWelcome ? (
                <>
                  <Text style={styles.headerTitle}>{getGreeting()}! 👋</Text>
                  <Text style={styles.headerSubtitle}>{getDisplayName()}</Text>
                </>
              ) : (
                <>
                  <Text style={styles.headerTitle}>{title}</Text>
                  {subtitle && <Text style={styles.headerSubtitle}>{subtitle}</Text>}
                </>
              )}
            </View>
          </View>
          
          <View style={styles.headerSpacer} />
        </View>
        

      </LinearGradient>

      {/* Overlay for sidebar */}
      {showMenu && (
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <TouchableOpacity style={styles.overlayTouch} onPress={toggleSidebar} />
        </Animated.View>
      )}

      {/* Enhanced Sidebar */}
      <Animated.View style={[styles.sidebar, sidebarStyle]}>
        <LinearGradient colors={getThemeColors()} style={styles.sidebarGradient}>
          <View style={styles.sidebarHeader}>
            <View style={styles.sidebarProfile}>
              <View style={styles.avatarContainer}>
                <Text style={styles.avatarText}>
                  {getDisplayName().split(' ').map(n => n[0]).join('').toUpperCase()}
                </Text>
              </View>
              <View>
                <Text style={styles.sidebarUserName}>{getDisplayName()}</Text>
                <Text style={styles.sidebarUserRole}>Client</Text>
              </View>
            </View>
            <TouchableOpacity onPress={toggleSidebar} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.sidebarDivider} />

          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push('/(client-tabs)/dashboard'); toggleSidebar(); }}>
            <Ionicons name="home" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Dashboard</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push('/(client-tabs)/bookings'); toggleSidebar(); }}>
            <Ionicons name="calendar" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>My Bookings</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push('/(client-tabs)/waste'); toggleSidebar(); }}>
            <Ionicons name="leaf" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Waste Management</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push('/(client-tabs)/teducation'); toggleSidebar(); }}>
            <Ionicons name="school" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>TED-ucation</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push('/(client-tabs)/profile'); toggleSidebar(); }}>
            <Ionicons name="person" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>My Profile</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push('/client-settings'); toggleSidebar(); }}>
            <Ionicons name="settings" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Settings</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push('/client-chat'); toggleSidebar(); }}>
            <Ionicons name="chatbubbles" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Live Chat</Text>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View style={styles.sidebarFooter}>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out" size={20} color="#fff" />
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>
    </>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 20, elevation: 8 },
  headerTop: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between'
  },
  menuButton: { 
    padding: 10, 
    borderRadius: 12, 
    backgroundColor: 'rgba(255,255,255,0.15)' 
  },
  headerCenter: { 
    flexDirection: 'row', 
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1
  },
  logo: { 
    width: 36, 
    height: 36, 
    marginRight: 12,
    borderRadius: 18
  },
  headerTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#fff',
    letterSpacing: 0.5
  },
  headerGreeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 0.5
  },
  headerSubtitle: { 
    fontSize: 12, 
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500'
  },
  headerSpacer: { 
    width: 44 
  },

  
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1000
  },
  overlayTouch: {
    flex: 1
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 1001
  },
  sidebarGradient: {
    flex: 1,
    paddingTop: 50
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20
  },
  sidebarProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12
  },
  avatarText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff'
  },
  sidebarUserName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 2
  },
  sidebarUserRole: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)'
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 20,
    marginBottom: 20
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 10,
    borderRadius: 12
  },
  sidebarIcon: {
    marginRight: 16,
    width: 22
  },
  sidebarText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '500',
    flex: 1
  },
  sidebarFooter: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    paddingHorizontal: 20
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    borderRadius: 25
  },
  logoutText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8
  },
  homeHeader: {
    paddingTop: 30
  }
});