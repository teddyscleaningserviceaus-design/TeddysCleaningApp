import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Image,
  SafeAreaView,
  Dimensions
} from 'react-native';
import { Ionicons, AntDesign, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { auth, db } from '../../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.8;

export default function EmployeeProfile() {
  const { userProfile, user, logout } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    alternatePhone: '',
    address: '',
    dateOfBirth: '',
    weeklySchedule: {},
    unavailableDays: [],
    emergencyContact: {
      name: '',
      relation: '',
      phone: ''
    },
    additionalNotes: '',
    profileImage: null
  });
  const [isEditing, setIsEditing] = useState(false);
  
  const sidebarX = useSharedValue(-SIDEBAR_WIDTH);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    loadProfileData();
  }, [userProfile]);

  const loadProfileData = async () => {
    if (!auth.currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setProfileData({
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          email: data.email || auth.currentUser.email || '',
          phone: data.phone || '',
          alternatePhone: data.alternatePhone || '',
          address: data.address || '',
          dateOfBirth: data.dateOfBirth || '',
          weeklySchedule: data.weeklySchedule || {},
          unavailableDays: data.unavailableDays || [],
          emergencyContact: data.emergencyContact || {
            name: '',
            relation: '',
            phone: ''
          },
          additionalNotes: data.additionalNotes || '',
          profileImage: data.profileImage || null
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

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

  const openCamera = async () => {
    try {
      console.log('Opening camera...');
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      console.log('Camera permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permissions.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      console.log('Camera result:', result);
      if (!result.canceled && result.assets && result.assets[0]) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to open camera');
    }
  };

  const openGallery = async () => {
    try {
      console.log('Opening gallery...');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('Gallery permission status:', status);
      
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant gallery permissions.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });

      console.log('Gallery result:', result);
      if (!result.canceled && result.assets && result.assets[0]) {
        uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Gallery error:', error);
      Alert.alert('Error', 'Failed to open gallery');
    }
  };

  const pickImage = () => {
    Alert.alert(
      'Select Image',
      'Choose how you want to select your profile picture',
      [
        { text: 'Camera', onPress: openCamera },
        { text: 'Gallery', onPress: openGallery },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const uploadImage = async (uri) => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    try {
      console.log('Uploading image to Firebase Storage...');
      
      // Import Firebase storage service
      const { firebaseStorageService } = await import('../../services/firebaseStorageService');
      
      // Upload to Firebase Storage
      const result = await firebaseStorageService.uploadProfileImage(auth.currentUser.uid, uri);
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }
      
      console.log('Firebase upload successful:', result.url);
      
      // Update local state
      setProfileData(prev => ({ ...prev, profileImage: result.url }));
      
      // Update Firebase Firestore
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        profileImage: result.url,
        updatedAt: new Date()
      });
      
      Alert.alert('Success', 'Profile picture updated!');
    } catch (error) {
      console.error('Error saving image:', error);
      Alert.alert('Error', 'Failed to save profile picture: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        ...profileData,
        name: `${profileData.firstName} ${profileData.lastName}`,
        updatedAt: new Date()
      });
      
      setIsEditing(false);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {isSidebarOpen && (
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <TouchableOpacity style={styles.overlayTouch} onPress={toggleSidebar} />
        </Animated.View>
      )}

      <Animated.View style={[styles.sidebar, sidebarStyle]}>
        <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.sidebarGradient}>
          <View style={styles.sidebarHeader}>
            <View style={styles.sidebarProfile}>
              <View style={styles.avatarContainer}>
                {profileData.profileImage ? (
                  <Image source={{ uri: profileData.profileImage }} style={styles.sidebarAvatar} />
                ) : (
                  <AntDesign name="user" size={24} color="#fff" />
                )}
              </View>
              <View>
                <Text style={styles.sidebarUserName}>{`${profileData.firstName} ${profileData.lastName}`.trim() || 'Employee'}</Text>
                <Text style={styles.sidebarUserRole}>Team Member</Text>
              </View>
            </View>
            <TouchableOpacity onPress={toggleSidebar} style={styles.closeButton}>
              <AntDesign name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.sidebarDivider} />

          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push('/(employee-tabs)/dashboard'); toggleSidebar(); }}>
            <AntDesign name="home" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Dashboard</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push('/(employee-tabs)/jobs'); toggleSidebar(); }}>
            <Feather name="briefcase" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Jobs</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push('/(employee-tabs)/messaging'); toggleSidebar(); }}>
            <AntDesign name="message1" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Messages</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push('/(employee-tabs)/news'); toggleSidebar(); }}>
            <MaterialCommunityIcons name="newspaper" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>News</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push('/(employee-tabs)/profile'); toggleSidebar(); }}>
            <AntDesign name="user" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>My Profile</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push('/(employee-tabs)/schedule'); toggleSidebar(); }}>
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
                    onPress: async () => {
                      try {
                        await logout();
                        router.replace("/");
                      } catch (error) {
                        console.error('Logout error:', error);
                        router.replace("/");
                      }
                    }
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

      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
          <AntDesign name="menuunfold" size={26} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Image source={require('../../assets/teddy-logo.png')} style={styles.logo} />
          <View>
            <Text style={styles.headerTitle}>My Profile</Text>
            <Text style={styles.headerSubtitle}>Personal Info</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Ionicons name={isEditing ? "close" : "pencil"} size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
            {profileData.profileImage ? (
              <Image source={{ uri: profileData.profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.placeholderImage}>
                <Ionicons name="camera" size={40} color="#9ca3af" />
              </View>
            )}
            <View style={styles.cameraButton}>
              <Ionicons name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.imageHint}>Tap to change profile picture</Text>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={profileData.firstName}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, firstName: text }))}
              placeholder="Enter your first name"
              editable={isEditing}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={profileData.lastName}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, lastName: text }))}
              placeholder="Enter your last name"
              editable={isEditing}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Date of Birth</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={profileData.dateOfBirth}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, dateOfBirth: text }))}
              placeholder="DD/MM/YYYY"
              editable={isEditing}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              value={profileData.email}
              placeholder="Enter your email"
              keyboardType="email-address"
              editable={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={profileData.phone}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, phone: text }))}
              placeholder="Enter your phone number"
              keyboardType="phone-pad"
              editable={isEditing}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Alternate Phone</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={profileData.alternatePhone}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, alternatePhone: text }))}
              placeholder="Optional alternate number"
              keyboardType="phone-pad"
              editable={isEditing}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput
              style={[styles.input, styles.textArea, !isEditing && styles.inputDisabled]}
              value={profileData.address}
              onChangeText={(text) => setProfileData(prev => ({ ...prev, address: text }))}
              placeholder="Enter your address"
              multiline
              numberOfLines={3}
              editable={isEditing}
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Name</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={profileData.emergencyContact.name}
              onChangeText={(text) => setProfileData(prev => ({ 
                ...prev, 
                emergencyContact: { ...prev.emergencyContact, name: text }
              }))}
              placeholder="Emergency contact name"
              editable={isEditing}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Relationship</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={profileData.emergencyContact.relation}
              onChangeText={(text) => setProfileData(prev => ({ 
                ...prev, 
                emergencyContact: { ...prev.emergencyContact, relation: text }
              }))}
              placeholder="e.g., Parent, Spouse, Sibling"
              editable={isEditing}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Contact Phone</Text>
            <TextInput
              style={[styles.input, !isEditing && styles.inputDisabled]}
              value={profileData.emergencyContact.phone}
              onChangeText={(text) => setProfileData(prev => ({ 
                ...prev, 
                emergencyContact: { ...prev.emergencyContact, phone: text }
              }))}
              placeholder="Emergency contact phone"
              keyboardType="phone-pad"
              editable={isEditing}
            />
          </View>
        </View>

        {isEditing && (
          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={saveProfile}
            disabled={loading}
          >
            <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.saveButtonGradient}>
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    zIndex: 15,
  },
  overlayTouch: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sidebarProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  sidebarAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  sidebarUserName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sidebarUserRole: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  sidebarIcon: {
    marginRight: 16,
  },
  sidebarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  menuButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
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
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: 12,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: '#fff',
  },
  placeholderImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#fff',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#4facfe',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  imageHint: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#f9fafb',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  editButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  inputDisabled: {
    backgroundColor: '#f3f4f6',
    color: '#6b7280',
  },
});