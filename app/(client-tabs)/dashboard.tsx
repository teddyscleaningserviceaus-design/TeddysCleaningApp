import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, StatusBar, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import ClientHeader from '../../components/ClientHeader';
import HeroSlider from '../../components/HeroSlider';
import EnvironmentalData from '../../components/EnvironmentalData';

import { useClient } from '../../contexts/ClientContext';
// import cleanerLocationSimulator from '../../services/cleanerLocationSimulator';

export default function ClientDashboard() {
  const { clientData, refreshClientData, loading } = useClient();
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingBookings, setUpcomingBookings] = useState(0);
  const [nextBooking, setNextBooking] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const authUnsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('Dashboard - User authenticated:', user.uid);
        const bookingsUnsubscribe = loadUpcomingBookings();
        return () => {
          if (bookingsUnsubscribe) {
            bookingsUnsubscribe();
          }
        };
      } else {
        console.log('Dashboard - No user authenticated');
        setUpcomingBookings(0);
        setNextBooking(null);
      }
    });
    
    return authUnsubscribe;
  }, []);

  const loadUpcomingBookings = () => {
    const user = auth.currentUser;
    if (!user) {
      console.log('No user authenticated for bookings');
      return;
    }

    console.log('Loading bookings for user:', user.uid);
    const q = query(
      collection(db, 'jobs'),
      where('clientId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Check if user is still authenticated
      if (!auth.currentUser) {
        console.log('Dashboard: User logged out, ignoring snapshot');
        return;
      }
      
      const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log('Dashboard - Total jobs found:', jobs.length);
      
      if (jobs.length > 0) {
        console.log('Dashboard - Sample job:', jobs[0]);
        console.log('Dashboard - All job statuses:', jobs.map(j => j.status));
      }
      
      const upcoming = jobs.filter(job => 
        job.status === 'Pending' || job.status === 'Accepted' || job.status === 'Schedule-Pending' || job.status === 'Scheduled' || job.status === 'In Progress'
      );
      
      console.log('Dashboard - Upcoming bookings:', upcoming.length);
      setUpcomingBookings(upcoming.length);
      
      // Find next booking
      const sortedUpcoming = upcoming.sort((a, b) => 
        new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
      );
      setNextBooking(sortedUpcoming[0] || null);
    }, (error) => {
      console.error('Dashboard bookings error:', error);
      // Don't show error if user is logging out
      if (!auth.currentUser) {
        console.log('Dashboard: Ignoring error during logout');
        return;
      }
    });

    return unsubscribe;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    // refreshClientData();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const getDisplayName = () => {
    if (clientData?.firstName) {
      return clientData.firstName;
    }
    if (clientData?.name && !clientData.name.includes('@')) {
      return clientData.name.split(' ')[0];
    }
    if (auth.currentUser?.displayName && !auth.currentUser.displayName.includes('@')) {
      return auth.currentUser.displayName.split(' ')[0];
    }
    return 'Client';
  };

  const getMemberSince = () => {
    if (clientData?.createdAt) {
      return new Date(clientData.createdAt.toDate()).getFullYear().toString();
    }
    return '2024';
  };

  const services = [
    { id: 'regular', title: 'Regular Clean', desc: 'Weekly maintenance', price: 'From $95', icon: 'home-outline', color: '#4facfe' },
    { id: 'deep', title: 'Deep Clean', desc: 'Thorough cleaning', price: 'From $225', icon: 'sparkles-outline', color: '#00d4ff' },
    { id: 'move', title: 'End of Lease', desc: 'Move out clean', price: 'From $280', icon: 'cube-outline', color: '#28a745' },
    { id: 'office', title: 'Office Clean', desc: 'Commercial space', price: 'From $160', icon: 'business-outline', color: '#ffc107' }
  ];

  const stats = [
    { label: 'Upcoming', value: upcomingBookings, icon: 'time-outline', color: '#4facfe' },
    { label: 'Total Bookings', value: clientData?.totalBookings || 0, icon: 'checkmark-circle-outline', color: '#28a745' },
    { label: 'Saved CO₂', value: `${clientData?.co2Saved || 0}kg`, icon: 'leaf-outline', color: '#00d4ff' },
    { label: 'Member Since', value: getMemberSince(), icon: 'star-outline', color: '#ffc107' }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      
      <ClientHeader 
        title="Dashboard" 
        subtitle="Welcome back" 
        showWelcome={true} 
        userName={getDisplayName()} 
      />
      
      {/* Booking Prompt - Prominent for all users */}
      <View style={styles.bookingPrompt}>
        <TouchableOpacity 
          style={styles.bookingButton}
          onPress={() => router.push('/client-job-request')}
        >
          <LinearGradient colors={['#10b981', '#059669']} style={styles.bookingGradient}>
            <View style={styles.bookingContent}>
              <Ionicons name="add-circle" size={18} color="#fff" />
              <Text style={styles.bookingTitle}>
                {upcomingBookings === 0 && (clientData?.totalBookings || 0) === 0 ? 'Make Your First Booking' : 'Book Another Service'}
              </Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      <HeroSlider />

      <ScrollView 
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <EnvironmentalData />
        
        {/* Next Booking Alert */}
        {nextBooking && (
          <View style={styles.nextBookingCard}>
            <View style={styles.nextBookingHeader}>
              <Ionicons name="calendar" size={20} color="#4facfe" />
              <Text style={styles.nextBookingTitle}>Next Booking</Text>
            </View>
            <Text style={styles.nextBookingService}>{nextBooking.title}</Text>
            <Text style={styles.nextBookingDate}>{nextBooking.scheduledDate} at {nextBooking.startTime}</Text>
            <TouchableOpacity 
              style={styles.nextBookingButton}
              onPress={() => router.push('/(client-tabs)/bookings')}
            >
              <Text style={styles.nextBookingButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          {stats.map((stat, index) => (
            <View key={index} style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: `${stat.color}20` }]}>
                <Ionicons name={stat.icon as any} size={24} color={stat.color} />
              </View>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Popular Services */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popular Services</Text>
            <TouchableOpacity onPress={() => router.push('/client-job-request')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.servicesScroll}>
            {services.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={styles.serviceCard}
                onPress={() => router.push('/client-job-request')}
              >
                <View style={[styles.serviceIcon, { backgroundColor: `${service.color}15` }]}>
                  <Ionicons name={service.icon as any} size={32} color={service.color} />
                </View>
                <Text style={styles.serviceTitle}>{service.title}</Text>
                <Text style={styles.serviceDesc}>{service.desc}</Text>
                <Text style={styles.servicePrice}>{service.price}</Text>
                <View style={styles.serviceButton}>
                  <Text style={styles.serviceButtonText}>
                    {upcomingBookings === 0 && (clientData?.totalBookings || 0) === 0 ? 'Book First' : 'Book'}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity 
              style={styles.quickCard}
              onPress={() => router.push('/(client-tabs)/bookings')}
            >
              <Ionicons name="calendar" size={24} color="#4facfe" />
              <Text style={styles.quickText}>My Bookings</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickCard}
              onPress={() => router.push('/(client-tabs)/waste')}
            >
              <Ionicons name="leaf" size={24} color="#28a745" />
              <Text style={styles.quickText}>Waste Bins</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickCard}
              onPress={() => router.push('/client-chat')}
            >
              <Ionicons name="chatbubbles" size={24} color="#8b5cf6" />
              <Text style={styles.quickText}>Live Chat</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.quickCard}
              onPress={() => {
                if (nextBooking) {
                  Alert.alert(
                    '🧪 Test Notifications',
                    'This will simulate a cleaner approaching your location. You\'ll receive notifications as they get closer.',
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { 
                        text: 'Start Test', 
                        onPress: () => console.log('Test notifications disabled temporarily')
                      }
                    ]
                  );
                } else {
                  Alert.alert('No Active Booking', 'You need an active booking to test notifications.');
                }
              }}
            >
              <Ionicons name="notifications" size={24} color="#8b5cf6" />
              <Text style={styles.quickText}>Test Alerts</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          <View style={styles.activityCard}>
            <View style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="calendar-outline" size={20} color="#4facfe" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Welcome to Teddy's!</Text>
                <Text style={styles.activitySubtitle}>Your account has been created successfully</Text>
                <Text style={styles.activityTime}>Just now</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Service Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Service Details</Text>
          <View style={styles.serviceInfoCard}>
            <View style={styles.serviceRow}>
              <Text style={styles.serviceLabel}>Property Type:</Text>
              <Text style={styles.serviceValue}>{clientData?.propertyType || 'Not set'}</Text>
            </View>
            <View style={styles.serviceRow}>
              <Text style={styles.serviceLabel}>Preferred Frequency:</Text>
              <Text style={styles.serviceValue}>{clientData?.cleaningFrequency || 'Not set'}</Text>
            </View>
            <View style={styles.serviceRow}>
              <Text style={styles.serviceLabel}>Service Address:</Text>
              <Text style={styles.serviceValue}>
                {clientData?.fullAddress || 
                 (clientData?.address && clientData?.suburb && clientData?.postcode ? 
                   `${clientData.address}, ${clientData.suburb} ${clientData.postcode}` : 
                   clientData?.address) || 
                 'Not set'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Educational Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Learn with TED-ucation</Text>
          <TouchableOpacity style={styles.educationCard}>
            <LinearGradient colors={['#667eea', '#764ba2']} style={styles.educationGradient}>
              <View style={styles.educationContent}>
                <Ionicons name="school-outline" size={32} color="#fff" />
                <Text style={styles.educationTitle}>The Science of Clean</Text>
                <Text style={styles.educationSubtitle}>
                  Discover the fascinating world of cleaning science and sustainable practices
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Sustainability Impact */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Environmental Impact</Text>
          <View style={styles.impactCard}>
            <View style={styles.impactHeader}>
              <Ionicons name="leaf" size={24} color="#28a745" />
              <Text style={styles.impactTitle}>Eco-Friendly Cleaning</Text>
            </View>
            <Text style={styles.impactDescription}>
              By choosing Teddy's science-based cleaning methods, you're contributing to a cleaner planet. 
              Our eco-friendly solutions reduce chemical waste and protect your family's health.
            </Text>
            <View style={styles.impactStats}>
              <View style={styles.impactStat}>
                <Text style={styles.impactNumber}>100%</Text>
                <Text style={styles.impactLabel}>Biodegradable</Text>
              </View>
              <View style={styles.impactStat}>
                <Text style={styles.impactNumber}>50%</Text>
                <Text style={styles.impactLabel}>Less Water</Text>
              </View>
              <View style={styles.impactStat}>
                <Text style={styles.impactNumber}>0</Text>
                <Text style={styles.impactLabel}>Harsh Chemicals</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { 
    flex: 1, 
    paddingHorizontal: 20
  },
  statsContainer: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between', 
    marginBottom: 20 
  },
  statCard: { 
    width: '48%', 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 3 
  },
  statIcon: { 
    width: 48, 
    height: 48, 
    borderRadius: 24, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 8 
  },
  statValue: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 4 
  },
  statLabel: { 
    fontSize: 11, 
    color: '#666', 
    textAlign: 'center' 
  },
  section: { 
    marginBottom: 24 
  },
  sectionHeader: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 16 
  },
  sectionTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#333' 
  },
  seeAllText: { 
    fontSize: 14, 
    color: '#4facfe', 
    fontWeight: '600' 
  },
  servicesScroll: { 
    marginBottom: 8 
  },
  serviceCard: { 
    width: 150, 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    marginRight: 12, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 3 
  },
  serviceIcon: { 
    width: 56, 
    height: 56, 
    borderRadius: 28, 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginBottom: 12 
  },
  serviceTitle: { 
    fontSize: 14, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 4, 
    textAlign: 'center' 
  },
  serviceDesc: { 
    fontSize: 11, 
    color: '#666', 
    marginBottom: 8, 
    textAlign: 'center' 
  },
  servicePrice: { 
    fontSize: 12, 
    fontWeight: 'bold', 
    color: '#4facfe', 
    marginBottom: 12 
  },
  serviceButton: { 
    backgroundColor: '#4facfe', 
    paddingHorizontal: 14, 
    paddingVertical: 6, 
    borderRadius: 16 
  },
  serviceButtonText: { 
    color: '#fff', 
    fontSize: 11, 
    fontWeight: 'bold' 
  },
  quickGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    justifyContent: 'space-between' 
  },
  quickCard: { 
    width: '48%', 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    padding: 16, 
    marginBottom: 12, 
    alignItems: 'center', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 }, 
    shadowOpacity: 0.05, 
    shadowRadius: 4, 
    elevation: 2 
  },
  quickText: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#333', 
    marginTop: 8, 
    textAlign: 'center' 
  },
  activityCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 3 
  },
  activityItem: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  activityIcon: { 
    width: 40, 
    height: 40, 
    borderRadius: 20, 
    backgroundColor: '#f0f8ff', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginRight: 12 
  },
  activityContent: { 
    flex: 1 
  },
  activityTitle: { 
    fontSize: 15, 
    fontWeight: '600', 
    color: '#333', 
    marginBottom: 4 
  },
  activitySubtitle: { 
    fontSize: 13, 
    color: '#666', 
    marginBottom: 4 
  },
  activityTime: { 
    fontSize: 11, 
    color: '#999' 
  },
  serviceInfoCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 16, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 3 
  },
  serviceRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 8, 
    borderBottomWidth: 1, 
    borderBottomColor: '#f0f0f0' 
  },
  serviceLabel: { 
    fontSize: 13, 
    color: '#666', 
    flex: 1 
  },
  serviceValue: { 
    fontSize: 13, 
    fontWeight: '600', 
    color: '#333', 
    flex: 1, 
    textAlign: 'right' 
  },
  educationCard: { 
    borderRadius: 16, 
    overflow: 'hidden', 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 3 
  },
  educationGradient: { 
    padding: 20 
  },
  educationContent: { 
    alignItems: 'center' 
  },
  educationTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#fff', 
    marginTop: 8, 
    marginBottom: 8 
  },
  educationSubtitle: { 
    fontSize: 13, 
    color: 'rgba(255,255,255,0.9)', 
    textAlign: 'center', 
    lineHeight: 18 
  },
  impactCard: { 
    backgroundColor: '#fff', 
    borderRadius: 16, 
    padding: 20, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 8, 
    elevation: 3 
  },
  impactHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 12 
  },
  impactTitle: { 
    fontSize: 16, 
    fontWeight: 'bold', 
    color: '#333', 
    marginLeft: 8 
  },
  impactDescription: { 
    fontSize: 13, 
    color: '#666', 
    lineHeight: 18, 
    marginBottom: 16 
  },
  impactStats: { 
    flexDirection: 'row', 
    justifyContent: 'space-around' 
  },
  impactStat: { 
    alignItems: 'center' 
  },
  impactNumber: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#28a745', 
    marginBottom: 4 
  },
  impactLabel: { 
    fontSize: 11, 
    color: '#666', 
    textAlign: 'center' 
  },
  nextBookingCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: '#4facfe'
  },
  nextBookingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  nextBookingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8
  },
  nextBookingService: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4facfe',
    marginBottom: 4
  },
  nextBookingDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12
  },
  nextBookingButton: {
    backgroundColor: '#4facfe',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start'
  },
  nextBookingButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  },
  bookingPrompt: {
    marginHorizontal: 20,
    marginTop: -5,
    marginBottom: 15,
    zIndex: 10
  },
  bookingButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6
  },
  bookingGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 6
  },
  bookingContent: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  bookingTitle: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold'
  }
});