import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Stack } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db } from '../config/firebase';
import { query, where, getDocs, collection } from 'firebase/firestore';

export default function GuestSetup() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [existingBookings, setExistingBookings] = useState([]);
  const [isReturningGuest, setIsReturningGuest] = useState(false);
  const [guestInfo, setGuestInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });

  const validatePhone = (phone) => {
    const phoneRegex = /^(\+61|0)[2-9]\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const checkExistingBookings = async (email) => {
    try {
      const q = query(
        collection(db, 'guest-bookings'),
        where('contactEmail', '==', email.toLowerCase().trim())
      );
      const querySnapshot = await getDocs(q);
      const bookings = [];
      querySnapshot.forEach((doc) => {
        bookings.push({ id: doc.id, ...doc.data() });
      });
      return bookings;
    } catch (error) {
      console.error('Error checking existing bookings:', error);
      return [];
    }
  };

  const handleContinue = async () => {
    if (!guestInfo.name.trim()) {
      Alert.alert('Missing Information', 'Please enter your name.');
      return;
    }

    if (!validateEmail(guestInfo.email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // Check for existing bookings when email is entered
    setLoading(true);
    const existingBookings = await checkExistingBookings(guestInfo.email);
    setExistingBookings(existingBookings);
    
    if (existingBookings.length > 0) {
      setIsReturningGuest(true);
      Alert.alert(
        'Welcome Back! 👋',
        `We found ${existingBookings.length} existing booking${existingBookings.length > 1 ? 's' : ''} for this email. Please verify your phone number to continue.`,
        [{ text: 'OK' }]
      );
    }

    if (!validatePhone(guestInfo.phone)) {
      setLoading(false);
      Alert.alert('Invalid Phone', 'Please enter a valid Australian phone number (e.g., 0412 345 678).');
      return;
    }

    try {
      // Save guest info and cache existing bookings
      await AsyncStorage.setItem('guestInfo', JSON.stringify(guestInfo));
      if (existingBookings.length > 0) {
        await AsyncStorage.setItem('guestBookingsCache', JSON.stringify(existingBookings));
      }
      
      // Add to saved guests list
      const savedGuests = await AsyncStorage.getItem('savedGuests');
      let guestsList = savedGuests ? JSON.parse(savedGuests) : [];
      
      // Check if guest already exists (by email)
      const existingGuestIndex = guestsList.findIndex(g => g.email === guestInfo.email);
      if (existingGuestIndex >= 0) {
        // Update existing guest info
        guestsList[existingGuestIndex] = guestInfo;
      } else {
        // Add new guest
        guestsList.push(guestInfo);
      }
      
      await AsyncStorage.setItem('savedGuests', JSON.stringify(guestsList));
      router.replace('/guest-dashboard');
    } catch (error) {
      console.error('Error saving guest info:', error);
      Alert.alert('Error', 'Failed to save information. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={true} />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Guest Access</Text>
          <Text style={styles.headerSubtitle}>Quick setup to get started</Text>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeTitle}>Welcome to Teddy's Cleaning! 🎉</Text>
          <Text style={styles.welcomeText}>
            We just need a few details to help you book and manage your cleaning services.
          </Text>
        </View>

        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Your Information</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              style={styles.input}
              value={guestInfo.name}
              onChangeText={(text) => setGuestInfo({...guestInfo, name: text})}
              placeholder="Enter your full name"
              placeholderTextColor="#9ca3af"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email Address *</Text>
            <TextInput
              style={styles.input}
              value={guestInfo.email}
              onChangeText={(text) => setGuestInfo({...guestInfo, email: text.toLowerCase()})}
              placeholder="your.email@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Text style={styles.inputNote}>
              {isReturningGuest 
                ? `Found ${existingBookings.length} existing booking${existingBookings.length > 1 ? 's' : ''} for this email`
                : 'We\'ll use this to send booking confirmations and find your existing bookings'
              }
            </Text>
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              value={guestInfo.phone}
              onChangeText={(text) => setGuestInfo({...guestInfo, phone: text})}
              placeholder="0412 345 678"
              placeholderTextColor="#9ca3af"
              keyboardType="phone-pad"
            />
            <Text style={styles.inputNote}>
              Australian format (e.g., 0412 345 678 or +61 412 345 678)
            </Text>
          </View>
        </View>

        <View style={styles.benefitsCard}>
          <Text style={styles.benefitsTitle}>What you get as a guest:</Text>
          <View style={styles.benefitsList}>
            <View style={styles.benefitItem}>
              <AntDesign name="checkcircle" size={16} color="#10b981" />
              <Text style={styles.benefitText}>Book cleaning services instantly</Text>
            </View>
            <View style={styles.benefitItem}>
              <AntDesign name="checkcircle" size={16} color="#10b981" />
              <Text style={styles.benefitText}>Track your booking status</Text>
            </View>
            <View style={styles.benefitItem}>
              <AntDesign name="checkcircle" size={16} color="#10b981" />
              <Text style={styles.benefitText}>Message support directly</Text>
            </View>
            <View style={styles.benefitItem}>
              <AntDesign name="checkcircle" size={16} color="#10b981" />
              <Text style={styles.benefitText}>View booking history</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.continueButton}
          onPress={handleContinue}
          disabled={loading}
        >
          <LinearGradient colors={["#10b981", "#059669"]} style={styles.continueButtonGradient}>
            <Text style={styles.continueButtonText}>
              {loading ? "Setting up..." : "Continue to Dashboard"}
            </Text>
            {!loading && <AntDesign name="arrowright" size={20} color="#fff" />}
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.privacyNote}>
          <Text style={styles.privacyText}>
            Your information is secure and will only be used for booking purposes. 
            You can create a full account later for additional features.
          </Text>
        </View>

        <View style={{ height: 50 }} />
      </ScrollView>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
    elevation: 8,
  },
  backButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  headerCenter: { alignItems: "center", flex: 1 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
  headerRight: { width: 40 },
  
  content: { flex: 1, padding: 20 },
  
  welcomeCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    alignItems: "center",
    elevation: 3,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
    textAlign: "center",
  },
  welcomeText: {
    fontSize: 16,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 24,
  },
  
  formCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 20,
  },
  
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  inputNote: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 6,
    lineHeight: 16,
  },
  
  benefitsCard: {
    backgroundColor: "#f0fdf4",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 16,
  },
  benefitsList: { gap: 12 },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  benefitText: {
    fontSize: 14,
    color: "#166534",
    fontWeight: "500",
  },
  
  continueButton: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    marginBottom: 20,
  },
  continueButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  continueButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  
  privacyNote: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  privacyText: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 18,
  },
});