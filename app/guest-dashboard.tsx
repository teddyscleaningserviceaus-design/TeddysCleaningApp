import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, Image } from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack } from 'expo-router';


export default function GuestDashboard() {
  const router = useRouter();
  const [guestBookings, setGuestBookings] = useState([]);
  const [guestInfo, setGuestInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGuestData();
  }, []);

  const loadGuestData = async () => {
    try {
      const storedGuestInfo = await AsyncStorage.getItem('guestInfo');
      if (storedGuestInfo) {
        const guestData = JSON.parse(storedGuestInfo);
        setGuestInfo(guestData);
        loadGuestBookings(guestData.email);
      } else {
        router.replace('/guest-setup');
      }
    } catch (error) {
      console.error('Error loading guest data:', error);
      setLoading(false);
    }
  };

  const loadGuestBookings = async (email) => {
    try {
      // First load cached bookings for immediate display
      const cachedBookings = await AsyncStorage.getItem('guestBookingsCache');
      if (cachedBookings) {
        const cached = JSON.parse(cachedBookings);
        setGuestBookings(cached);
        setLoading(false);
      }

      // Then fetch live data and merge
      const q = query(
        collection(db, 'guest-bookings'),
        where('contactEmail', '==', email)
      );

      const unsubscribe = onSnapshot(q, 
        async (querySnapshot) => {
          const bookingsList = [];
          querySnapshot.forEach((doc) => {
            bookingsList.push({ id: doc.id, ...doc.data() });
          });
          
          // Sort by createdAt descending on client side
          bookingsList.sort((a, b) => {
            const aTime = a.createdAt?.toDate?.() || new Date(a.createdAt);
            const bTime = b.createdAt?.toDate?.() || new Date(b.createdAt);
            return bTime - aTime;
          });
          
          setGuestBookings(bookingsList);
          
          // Update cache with latest data
          await AsyncStorage.setItem('guestBookingsCache', JSON.stringify(bookingsList));
          setLoading(false);
        },
        (error) => {
          console.error('Bookings query error:', error);
          // If live query fails, keep cached data
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading bookings:', error);
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'pending': return '#f59e0b';
      case 'confirmed': return '#4facfe';
      case 'in progress': return '#8b5cf6';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleBookingPress = (booking) => {
    router.push({
      pathname: '/guest-job-details',
      params: {
        bookingId: booking.id,
        bookingTitle: booking.title
      }
    });
  };

  const handleNewBooking = () => {
    router.push('/guest-job-request');
  };

  const handleContactSupport = () => {
    router.push({
      pathname: '/guest-support',
      params: {
        guestName: guestInfo?.name,
        guestEmail: guestInfo?.email,
        guestPhone: guestInfo?.phone
      }
    });
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? You can always return using your email.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          onPress: async () => {
            await AsyncStorage.removeItem('guestInfo');
            router.replace('/');
          }
        }
      ]
    );
  };

  const renderBookingCard = (booking) => (
    <TouchableOpacity 
      key={booking.id} 
      style={styles.bookingCard}
      onPress={() => handleBookingPress(booking)}
    >
      <View style={styles.bookingHeader}>
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingTitle}>{booking.title}</Text>
          <Text style={styles.bookingDate}>{booking.scheduledDate} at {booking.startTime}</Text>
          <Text style={styles.bookingAddress}>{booking.address}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
          <Text style={styles.statusText}>{booking.status?.toUpperCase() || 'PENDING'}</Text>
        </View>
      </View>
      
      <View style={styles.bookingFooter}>
        <Text style={styles.bookingPrice}>${booking.estimatedPrice}</Text>
        <View style={styles.bookingActions}>
          <Ionicons name="chevron-forward" size={20} color="#4facfe" />
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <AntDesign name="loading1" size={32} color="#4facfe" />
        <Text style={styles.loadingText}>Loading your bookings...</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Image source={require('../assets/teddy-logo.png')} style={styles.logo} />
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>Welcome back,</Text>
            <Text style={styles.guestName}>{guestInfo?.name || 'Guest'}! 👋</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.primaryAction} onPress={handleNewBooking}>
            <LinearGradient colors={['#10b981', '#059669']} style={styles.primaryActionGradient}>
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.primaryActionText}>Book New Service</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.secondaryAction} onPress={handleContactSupport}>
            <Ionicons name="help-circle-outline" size={16} color="#4facfe" />
            <Text style={styles.secondaryActionText}>Support</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>{guestBookings.length}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {guestBookings.filter(b => b.status === 'Completed').length}
            </Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statNumber}>
              {guestBookings.filter(b => b.status === 'Pending' || b.status === 'Confirmed').length}
            </Text>
            <Text style={styles.statLabel}>Upcoming</Text>
          </View>
        </View>

        {/* Bookings List */}
        <View style={styles.bookingsSection}>
          <Text style={styles.sectionTitle}>Your Bookings</Text>
          
          {guestBookings.length > 0 ? (
            guestBookings.map(renderBookingCard)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Bookings Yet</Text>
              <Text style={styles.emptyDescription}>
                Book your first cleaning service to get started!
              </Text>
              <TouchableOpacity style={styles.emptyAction} onPress={handleNewBooking}>
                <Text style={styles.emptyActionText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Guest Info */}
        <View style={styles.guestInfoSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Your Information</Text>
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={() => router.push('/guest-setup')}
            >
              <Ionicons name="pencil" size={16} color="#4facfe" />
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#6b7280" />
              <Text style={styles.infoText}>{guestInfo?.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#6b7280" />
              <Text style={styles.infoText}>{guestInfo?.email}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#6b7280" />
              <Text style={styles.infoText}>{guestInfo?.phone}</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
      

    </View>
    </>
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
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 20,
    elevation: 8,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  welcomeSection: {
    flex: 1,
    marginLeft: 8,
  },
  welcomeText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  guestName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  logoutButton: {
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  content: { flex: 1, padding: 20 },
  
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  primaryAction: {
    flex: 2,
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 4,
  },
  primaryActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  primaryActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#4facfe',
    gap: 6,
  },
  secondaryActionText: {
    color: '#4facfe',
    fontSize: 12,
    fontWeight: '600',
  },
  
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4facfe',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  
  bookingsSection: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  bookingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bookingInfo: { flex: 1 },
  bookingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 2,
  },
  bookingAddress: {
    fontSize: 12,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  bookingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingPrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#10b981',
  },
  bookingActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: '#fff',
    borderRadius: 16,
    elevation: 2,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyAction: {
    backgroundColor: '#4facfe',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyActionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  
  guestInfoSection: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#4facfe',
    gap: 4,
  },
  editButtonText: {
    color: '#4facfe',
    fontSize: 12,
    fontWeight: '600',
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    fontWeight: '500',
  },
});