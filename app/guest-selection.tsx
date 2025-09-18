import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, Image } from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';

export default function GuestSelection() {
  const router = useRouter();
  const [savedGuests, setSavedGuests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSavedGuests();
  }, []);

  const loadSavedGuests = async () => {
    try {
      const guests = await AsyncStorage.getItem('savedGuests');
      if (guests) {
        setSavedGuests(JSON.parse(guests));
      }
    } catch (error) {
      console.error('Error loading saved guests:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectGuest = async (guest) => {
    try {
      await AsyncStorage.setItem('guestInfo', JSON.stringify(guest));
      router.replace('/guest-dashboard');
    } catch (error) {
      console.error('Error selecting guest:', error);
      Alert.alert('Error', 'Failed to select guest. Please try again.');
    }
  };

  const deleteGuest = async (guestToDelete) => {
    Alert.alert(
      'Delete Guest',
      `Are you sure you want to remove ${guestToDelete.name} from saved guests?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedGuests = savedGuests.filter(g => g.email !== guestToDelete.email);
              setSavedGuests(updatedGuests);
              await AsyncStorage.setItem('savedGuests', JSON.stringify(updatedGuests));
            } catch (error) {
              console.error('Error deleting guest:', error);
              Alert.alert('Error', 'Failed to delete guest.');
            }
          }
        }
      ]
    );
  };

  const renderDeleteButton = (guest) => (
    <TouchableOpacity 
      style={styles.deleteButton}
      onPress={() => deleteGuest(guest)}
    >
      <Ionicons name="trash" size={20} color="#fff" />
    </TouchableOpacity>
  );

  const renderGuestCard = (guest) => (
    <Swipeable
      key={guest.email}
      renderRightActions={() => renderDeleteButton(guest)}
      rightThreshold={40}
    >
      <TouchableOpacity 
        style={styles.guestCard}
        onPress={() => selectGuest(guest)}
      >
        <View style={styles.guestAvatar}>
          <Text style={styles.guestInitials}>
            {guest.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </Text>
        </View>
        
        <View style={styles.guestInfo}>
          <Text style={styles.guestName}>{guest.name}</Text>
          <Text style={styles.guestEmail}>{guest.email}</Text>
          <Text style={styles.guestPhone}>{guest.phone}</Text>
        </View>
        
        <View style={styles.guestActions}>
          <Ionicons name="chevron-forward" size={24} color="#4facfe" />
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  const handleAddNewGuest = () => {
    router.push('/guest-setup');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <AntDesign name="loading1" size={32} color="#4facfe" />
        <Text style={styles.loadingText}>Loading guests...</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
        
        <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <AntDesign name="arrowleft" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Image source={require('../assets/teddy-logo.png')} style={styles.logo} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Select Guest</Text>
              <Text style={styles.headerSubtitle}>Choose or add a guest profile</Text>
            </View>
          </View>
          
          <View style={styles.headerRight} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Welcome Section */}
          <View style={styles.welcomeCard}>
            <Text style={styles.welcomeTitle}>Welcome to Guest Access! 👋</Text>
            <Text style={styles.welcomeText}>
              Select a saved guest profile or add a new one to get started with booking cleaning services.
            </Text>
          </View>

          {/* Saved Guests */}
          {savedGuests.length > 0 && (
            <View style={styles.savedGuestsSection}>
              <Text style={styles.sectionTitle}>Saved Guests</Text>
              <Text style={styles.sectionSubtitle}>Tap to continue, swipe left to delete</Text>
              
              <View style={styles.guestsList}>
                {savedGuests.map(renderGuestCard)}
              </View>
            </View>
          )}

          {/* Add New Guest */}
          <View style={styles.addGuestSection}>
            <Text style={styles.sectionTitle}>
              {savedGuests.length > 0 ? 'Add Another Guest' : 'Get Started'}
            </Text>
            
            <TouchableOpacity style={styles.addGuestCard} onPress={handleAddNewGuest}>
              <View style={styles.addGuestIcon}>
                <Ionicons name="person-add" size={32} color="#4facfe" />
              </View>
              <View style={styles.addGuestContent}>
                <Text style={styles.addGuestTitle}>Add New Guest</Text>
                <Text style={styles.addGuestDesc}>
                  Create a new guest profile to book cleaning services
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#4facfe" />
            </TouchableOpacity>
          </View>

          {/* Support Access */}
          <View style={styles.supportSection}>
            <Text style={styles.sectionTitle}>Need Help?</Text>
            
            <TouchableOpacity 
              style={styles.supportCard} 
              onPress={() => router.push('/guest-support')}
            >
              <View style={styles.supportIcon}>
                <Ionicons name="help-circle" size={32} color="#4facfe" />
              </View>
              <View style={styles.supportContent}>
                <Text style={styles.supportTitle}>Support Center</Text>
                <Text style={styles.supportDesc}>
                  Get help, view conversations, or contact our team
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={24} color="#4facfe" />
            </TouchableOpacity>
          </View>

          {/* Features */}
          <View style={styles.featuresCard}>
            <Text style={styles.featuresTitle}>Guest Features</Text>
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Ionicons name="calendar" size={20} color="#10b981" />
                <Text style={styles.featureText}>Book cleaning services instantly</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="eye" size={20} color="#10b981" />
                <Text style={styles.featureText}>Track booking status and progress</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="chatbubble" size={20} color="#10b981" />
                <Text style={styles.featureText}>Message support team directly</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="time" size={20} color="#10b981" />
                <Text style={styles.featureText}>View complete booking history</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 50 }} />
        </ScrollView>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 8,
  },
  backButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  headerRight: { width: 40 },
  
  content: { flex: 1, padding: 20 },
  
  welcomeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
    elevation: 2,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  
  savedGuestsSection: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  guestsList: { gap: 12 },
  
  guestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  guestAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4facfe',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  guestInitials: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  guestInfo: { flex: 1 },
  guestName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  guestEmail: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  guestPhone: {
    fontSize: 12,
    color: '#9ca3af',
  },
  guestActions: {
    marginLeft: 12,
  },
  
  deleteButton: {
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    borderRadius: 16,
    marginLeft: 8,
  },
  
  addGuestSection: { marginBottom: 24 },
  addGuestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  addGuestIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  addGuestContent: { flex: 1 },
  addGuestTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  addGuestDesc: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  
  supportSection: { marginBottom: 24 },
  supportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  supportIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  supportContent: { flex: 1 },
  supportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  supportDesc: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  
  featuresCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#166534',
    marginBottom: 16,
  },
  featuresList: { gap: 12 },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  featureText: {
    fontSize: 14,
    color: '#166534',
    fontWeight: '500',
    flex: 1,
  },
});