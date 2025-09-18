import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import ClientHeader from '../../components/ClientHeader';


export default function ClientBookings() {
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (!user) {
        console.log('No authenticated user, clearing bookings');
        setBookings([]);
        setLoading(false);
        return;
      }

      console.log('Setting up bookings listener for user:', user.uid);
      const q = query(
        collection(db, 'jobs'),
        where('clientId', '==', user.uid)
      );

      const firestoreUnsubscribe = onSnapshot(q, 
        (querySnapshot) => {
          // Check if user is still authenticated
          if (!auth.currentUser) {
            console.log('Bookings: User logged out, ignoring snapshot');
            return;
          }
          
          const bookingsList = [];
          querySnapshot.forEach((doc) => {
            bookingsList.push({ id: doc.id, ...doc.data() });
          });
          
          console.log('Bookings loaded:', bookingsList.length, 'jobs');
          if (bookingsList.length > 0) {
            console.log('Sample booking:', bookingsList[0]);
          }
          
          // Sort by creation date (most recent first)
          bookingsList.sort((a, b) => {
            const aDate = a.createdAt?.toDate?.() || new Date(a.scheduledDate);
            const bDate = b.createdAt?.toDate?.() || new Date(b.scheduledDate);
            return bDate - aDate;
          });
          
          setBookings(bookingsList);
          setLoading(false);
        },
        (error) => {
          console.error('Bookings query error:', error);
          // Don't show error if user is logging out
          if (!auth.currentUser) {
            console.log('Bookings: Ignoring error during logout');
            return;
          }
          setLoading(false);
        }
      );

      return firestoreUnsubscribe;
    });

    return unsubscribe;
  }, []);

  const upcomingBookings = bookings.filter(booking => 
    booking.status === 'Pending' || booking.status === 'Accepted' || booking.status === 'Schedule-Pending' || booking.status === 'Scheduled' || booking.status === 'In Progress'
  );
  
  const pastBookings = bookings.filter(booking => 
    booking.status === 'Completed' || booking.status === 'Cancelled'
  );
  
  console.log('Bookings page - Upcoming:', upcomingBookings.length, 'Past:', pastBookings.length);

  const onRefresh = async () => {
    setRefreshing(true);
    // Data refreshes automatically via onSnapshot
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return '#6c757d';
      case 'accepted': return '#17a2b8';
      case 'schedule-pending': return '#fd7e14';
      case 'scheduled': return '#28a745';
      case 'in progress': return '#ffc107';
      case 'completed': return '#4facfe';
      case 'cancelled': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getServiceIcon = (serviceType: string) => {
    switch (serviceType?.toLowerCase()) {
      case 'regular': return { icon: 'home', emoji: '🏠' };
      case 'deep': return { icon: 'auto-fix-high', emoji: '✨' };
      case 'move': return { icon: 'moving', emoji: '📦' };
      case 'office': return { icon: 'business', emoji: '🏢' };
      case 'window': return { icon: 'window-closed', emoji: '🪟' };
      case 'carpet': return { icon: 'texture', emoji: '🧽' };
      default: return { icon: 'cleaning-services', emoji: '🧹' };
    }
  };

  const renderBookingCard = (booking: any) => (
    <TouchableOpacity 
      key={booking.id} 
      style={styles.bookingCard}
      onPress={() => {
        router.push({
          pathname: '/client-job-details',
          params: {
            jobId: booking.id,
            jobTitle: booking.title,
            client: booking.client
          }
        });
      }}
    >
      <View style={styles.bookingHeader}>
        <View style={styles.serviceIconContainer}>
          <View style={styles.serviceIcon}>
            <Text style={styles.serviceEmoji}>{getServiceIcon(booking.serviceType).emoji}</Text>
          </View>
        </View>
        <View style={styles.bookingInfo}>
          <Text style={styles.bookingService}>{booking.title || 'Cleaning Service'}</Text>
          <Text style={styles.bookingDateTime}>{booking.scheduledDate} at {booking.startTime}</Text>
          <Text style={styles.bookingAddress} numberOfLines={1}>{booking.address}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
          <Text style={styles.statusText}>{booking.status.toUpperCase()}</Text>
        </View>
      </View>
      
      <View style={styles.bookingDetails}>
        <View style={styles.detailRow}>
          <Ionicons name="person-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{booking.assignedEmployee || 'To be assigned'}</Text>
        </View>
        <View style={styles.detailRow}>
          <Ionicons name="flag-outline" size={16} color="#666" />
          <Text style={styles.detailText}>{booking.priority} Priority</Text>
        </View>
        {booking.isRecurring && (
          <View style={styles.detailRow}>
            <Ionicons name="sync-outline" size={16} color="#666" />
            <Text style={styles.detailText}>Recurring: {booking.recurringDays?.join(', ') || 'Weekly'}</Text>
          </View>
        )}
        {booking.progress !== undefined && (
          <View style={styles.detailRow}>
            <Ionicons name="checkmark-circle-outline" size={16} color="#666" />
            <Text style={styles.detailText}>{booking.progress}% Complete</Text>
          </View>
        )}
      </View>
      
      <View style={styles.bookingActions}>
        {booking.status === 'Scheduled' && (
          <>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                router.push('/client-chat');
              }}
            >
              <Text style={styles.actionButtonText}>Chat Support</Text>
            </TouchableOpacity>
          </>
        )}
        {booking.status === 'Completed' && (
          <>
            {!booking.feedbackSubmitted ? (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#ffc107' }]}
                onPress={(e) => {
                  e.stopPropagation();
                  router.push(`/client-feedback/${booking.id}`);
                }}
              >
                <Text style={styles.actionButtonText}>Rate Service</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.actionButton, { backgroundColor: '#28a745' }]}>
                <Text style={styles.actionButtonText}>✓ Rated</Text>
              </View>
            )}
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                router.push('/client-job-request');
              }}
            >
              <Text style={styles.actionButtonText}>Book Again</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      <ClientHeader title="My Bookings" subtitle="Manage appointments" theme="bookings" />

      <View style={styles.headerContainer}>
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'upcoming' && styles.activeTab]}
            onPress={() => setActiveTab('upcoming')}
          >
            <Text style={[styles.tabText, activeTab === 'upcoming' && styles.activeTabText]}>
              Upcoming ({upcomingBookings.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'past' && styles.activeTab]}
            onPress={() => setActiveTab('past')}
          >
            <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
              Past ({pastBookings.length})
            </Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity 
          style={styles.fixedBookButton}
          onPress={() => router.push('/client-job-request')}
        >
          <LinearGradient colors={['#10b981', '#059669']} style={styles.fixedBookGradient}>
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={styles.fixedBookText}>Add Booking</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'upcoming' ? (
          upcomingBookings.length > 0 ? (
            upcomingBookings.map(renderBookingCard)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="calendar-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Upcoming Bookings</Text>
              <Text style={styles.emptyDescription}>
                You don't have any upcoming cleaning appointments.
              </Text>
              <TouchableOpacity 
                style={styles.bookNowButton}
                onPress={() => router.push('/client-job-request')}
              >
                <Text style={styles.bookNowButtonText}>Make First Booking</Text>
              </TouchableOpacity>
            </View>
          )
        ) : (
          pastBookings.length > 0 ? (
            pastBookings.map(renderBookingCard)
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="checkmark-circle-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Past Bookings</Text>
              <Text style={styles.emptyDescription}>
                Your completed bookings will appear here.
              </Text>
            </View>
          )
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  headerContainer: { backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#f8fafc', borderRadius: 12, padding: 4, marginBottom: 12 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  activeTab: { backgroundColor: '#4facfe' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  activeTabText: { color: '#fff' },
  fixedBookButton: { borderRadius: 10, overflow: 'hidden' },
  fixedBookGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 16, gap: 6 },
  fixedBookText: { color: '#fff', fontSize: 13, fontWeight: 'bold' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  bookingCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  bookingHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  serviceIconContainer: { marginRight: 12 },
  serviceIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#f0f8ff', alignItems: 'center', justifyContent: 'center' },
  serviceEmoji: { fontSize: 16 },
  bookingInfo: { flex: 1 },
  bookingService: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 3 },
  bookingDateTime: { fontSize: 13, color: '#666', marginBottom: 2 },
  bookingAddress: { fontSize: 11, color: '#999' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 10, marginLeft: 8 },
  statusText: { fontSize: 9, fontWeight: 'bold', color: '#fff' },
  bookingDetails: { marginBottom: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  detailText: { fontSize: 12, color: '#666', marginLeft: 6 },
  bookingActions: { flexDirection: 'row', justifyContent: 'flex-end' },
  actionButton: { backgroundColor: '#4facfe', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginLeft: 6 },
  actionButtonText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  cancelButton: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#dc3545' },
  cancelButtonText: { color: '#dc3545' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 16, marginBottom: 8 },
  emptyDescription: { fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  bookNowButton: { backgroundColor: '#4facfe', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  bookNowButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});