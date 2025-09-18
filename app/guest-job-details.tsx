import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, Image, Linking } from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Stack } from 'expo-router';

export default function GuestJobDetails() {
  const router = useRouter();
  const { bookingId, bookingTitle } = useLocalSearchParams();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bookingId) {
      const unsubscribe = onSnapshot(
        doc(db, 'guest-bookings', bookingId),
        (doc) => {
          if (doc.exists()) {
            setBooking({ id: doc.id, ...doc.data() });
          }
          setLoading(false);
        },
        (error) => {
          console.error('Error fetching booking:', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    }
  }, [bookingId]);

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

  const handleCallSupport = () => {
    Linking.openURL('tel:+61412345678');
  };

  const handleMessageSupport = () => {
    router.push({
      pathname: '/guest-message',
      params: {
        guestName: booking?.contactName,
        guestEmail: booking?.contactEmail,
        guestPhone: booking?.contactPhone,
        bookingId: booking?.id
      }
    });
  };

  const openInMaps = () => {
    if (booking?.latitude && booking?.longitude) {
      const url = `https://maps.google.com/?q=${booking.latitude},${booking.longitude}`;
      Linking.openURL(url);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <AntDesign name="loading1" size={32} color="#4facfe" />
        <Text style={styles.loadingText}>Loading booking details...</Text>
      </View>
    );
  }

  if (!booking) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Booking not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
        
        <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBackButton}>
            <AntDesign name="arrowleft" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Image source={require('../assets/teddy-logo.png')} style={styles.logo} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Booking Details</Text>
              <Text style={styles.headerSubtitle}>{booking.title}</Text>
            </View>
          </View>
          
          <View style={styles.headerRight} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Card */}
          <View style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={[styles.statusBadge, { backgroundColor: getStatusColor(booking.status) }]}>
                <Text style={styles.statusText}>{booking.status?.toUpperCase() || 'PENDING'}</Text>
              </View>
              <Text style={styles.bookingId}>#{booking.id.slice(-6)}</Text>
            </View>
            <Text style={styles.serviceTitle}>{booking.title}</Text>
            <Text style={styles.estimatedPrice}>${booking.estimatedPrice}</Text>
          </View>

          {/* Schedule Info */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Schedule</Text>
            <View style={styles.infoRow}>
              <Ionicons name="calendar-outline" size={20} color="#4facfe" />
              <Text style={styles.infoText}>{booking.scheduledDate}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="time-outline" size={20} color="#4facfe" />
              <Text style={styles.infoText}>{booking.startTime}</Text>
            </View>
          </View>

          {/* Location */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Location</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={20} color="#4facfe" />
              <Text style={styles.addressText}>{booking.address}</Text>
              {booking.latitude && booking.longitude && (
                <TouchableOpacity onPress={openInMaps} style={styles.mapButton}>
                  <Ionicons name="map" size={16} color="#4facfe" />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Service Details */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Service Details</Text>
            <View style={styles.infoRow}>
              <Ionicons name="home-outline" size={20} color="#4facfe" />
              <Text style={styles.infoText}>{booking.propertyType} - {booking.rooms}R, {booking.bathrooms}B, {booking.kitchens}K</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="repeat-outline" size={20} color="#4facfe" />
              <Text style={styles.infoText}>{booking.frequency}</Text>
            </View>
            {booking.specialRequests && (
              <View style={styles.specialRequests}>
                <Text style={styles.specialRequestsTitle}>Special Requests:</Text>
                <Text style={styles.specialRequestsText}>{booking.specialRequests}</Text>
              </View>
            )}
          </View>

          {/* Contact Info */}
          <View style={styles.infoCard}>
            <Text style={styles.cardTitle}>Your Contact Details</Text>
            <View style={styles.infoRow}>
              <Ionicons name="person-outline" size={20} color="#4facfe" />
              <Text style={styles.infoText}>{booking.contactName}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="mail-outline" size={20} color="#4facfe" />
              <Text style={styles.infoText}>{booking.contactEmail}</Text>
            </View>
            <View style={styles.infoRow}>
              <Ionicons name="call-outline" size={20} color="#4facfe" />
              <Text style={styles.infoText}>{booking.contactPhone}</Text>
            </View>
          </View>

          {/* Support Actions */}
          <View style={styles.supportCard}>
            <Text style={styles.cardTitle}>Need Help?</Text>
            <View style={styles.supportActions}>
              <TouchableOpacity style={styles.supportButton} onPress={handleCallSupport}>
                <Ionicons name="call" size={20} color="#fff" />
                <Text style={styles.supportButtonText}>Call Support</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.messageButton} onPress={handleMessageSupport}>
                <Ionicons name="chatbubble" size={20} color="#4facfe" />
                <Text style={styles.messageButtonText}>Send Message</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 50 }} />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  errorText: {
    fontSize: 18,
    color: '#ef4444',
    marginBottom: 20,
  },
  backButton: {
    backgroundColor: '#4facfe',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  backButtonText: {
    color: '#fff',
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
  headerBackButton: {
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
  
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  bookingId: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '600',
  },
  serviceTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  estimatedPrice: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#10b981',
  },
  
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
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
    flex: 1,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  mapButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f0f8ff',
    marginLeft: 8,
  },
  specialRequests: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 8,
  },
  specialRequestsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
  },
  specialRequestsText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
  
  supportCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  supportActions: {
    flexDirection: 'row',
    gap: 12,
  },
  supportButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10b981',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  supportButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  messageButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#4facfe',
    gap: 8,
  },
  messageButtonText: {
    color: '#4facfe',
    fontSize: 16,
    fontWeight: '600',
  },
});