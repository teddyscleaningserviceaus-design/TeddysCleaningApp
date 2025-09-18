import { AntDesign } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { db } from "../config/firebase";

const { width } = Dimensions.get("window");

export default function GuestBooking() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  const [booking, setBooking] = useState({
    // Contact Details
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    
    // Service Details
    serviceType: '',
    propertyType: '',
    rooms: 1,
    bathrooms: 1,
    
    // Location
    address: '',
    latitude: null,
    longitude: null,
    
    // Scheduling
    scheduledDate: new Date(),
    startTime: new Date(),
    urgency: 'standard',
    
    // Additional
    specialRequests: '',
    estimatedPrice: 0
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [addressValidated, setAddressValidated] = useState(false);

  const services = [
    { id: 'regular', title: 'Regular Clean', desc: 'Weekly maintenance', price: 120, icon: '🏠', color: '#4facfe' },
    { id: 'deep', title: 'Deep Clean', desc: 'Thorough cleaning', price: 280, icon: '✨', color: '#00d4ff' },
    { id: 'move', title: 'End of Lease', desc: 'Move out clean', price: 350, icon: '📦', color: '#28a745' },
    { id: 'office', title: 'Office Clean', desc: 'Commercial space', price: 200, icon: '🏢', color: '#ffc107' }
  ];

  const propertyTypes = [
    { id: 'apartment', title: 'Apartment', multiplier: 0.8 },
    { id: 'house', title: 'House', multiplier: 1.0 },
    { id: 'office', title: 'Office', multiplier: 1.2 },
    { id: 'retail', title: 'Retail', multiplier: 1.5 }
  ];

  const calculatePrice = () => {
    const service = services.find(s => s.id === booking.serviceType);
    const property = propertyTypes.find(p => p.id === booking.propertyType);
    
    if (!service || !property) return 0;
    
    let basePrice = service.price * property.multiplier;
    
    if (booking.rooms > 3) {
      basePrice *= (1 + (booking.rooms - 3) * 0.2);
    }
    
    if (booking.bathrooms > 2) {
      basePrice *= (1 + (booking.bathrooms - 2) * 0.15);
    }
    
    if (booking.urgency === 'urgent') {
      basePrice *= 1.3;
    }
    
    return Math.round(basePrice);
  };

  const validateAddress = async () => {
    if (!booking.address.trim()) return false;
    
    try {
      const encodedAddress = encodeURIComponent(booking.address.trim());
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=AIzaSyD-ZSDsExijWGcVsALHSE9m7K5009vQvH4`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        setBooking(prev => ({
          ...prev,
          address: result.formatted_address,
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
        }));
        setAddressValidated(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Address validation error:', error);
      return false;
    }
  };

  const validateStep = () => {
    switch (currentStep) {
      case 1:
        if (!booking.contactName.trim() || !booking.contactEmail.trim() || !booking.contactPhone.trim()) {
          Alert.alert('Missing Information', 'Please fill in all contact details.');
          return false;
        }
        if (!booking.contactEmail.includes('@')) {
          Alert.alert('Invalid Email', 'Please enter a valid email address.');
          return false;
        }
        return true;
      case 2:
        if (!booking.serviceType || !booking.propertyType) {
          Alert.alert('Missing Selection', 'Please select service and property type.');
          return false;
        }
        return true;
      case 3:
        if (!addressValidated) {
          Alert.alert('Address Required', 'Please enter and validate your address.');
          return false;
        }
        return true;
      case 4:
        return true;
      default:
        return true;
    }
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    
    if (currentStep === 3 && !addressValidated) {
      const valid = await validateAddress();
      if (!valid) {
        Alert.alert('Invalid Address', 'Please enter a valid address.');
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmitBooking();
    }
  };

  const handleSubmitBooking = async () => {
    setLoading(true);
    try {
      const estimatedPrice = calculatePrice();
      
      await addDoc(collection(db, "guest-bookings"), {
        // Contact
        contactName: booking.contactName,
        contactEmail: booking.contactEmail,
        contactPhone: booking.contactPhone,
        
        // Service
        title: `${services.find(s => s.id === booking.serviceType)?.title} - ${booking.propertyType}`,
        serviceType: booking.serviceType,
        propertyType: booking.propertyType,
        rooms: booking.rooms,
        bathrooms: booking.bathrooms,
        
        // Location
        address: booking.address,
        latitude: booking.latitude,
        longitude: booking.longitude,
        
        // Scheduling
        scheduledDate: booking.scheduledDate.toLocaleDateString(),
        startTime: booking.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        urgency: booking.urgency,
        priority: booking.urgency === 'urgent' ? 'High' : 'Medium',
        
        // Status
        status: "Pending",
        progress: 0,
        
        // Additional
        specialRequests: booking.specialRequests,
        estimatedPrice: estimatedPrice,
        
        // Metadata
        bookingType: 'guest',
        client: booking.contactName,
        contactNumber: booking.contactPhone,
        contactEmail: booking.contactEmail,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      Alert.alert(
        "Booking Submitted! 🎉", 
        `Thank you ${booking.contactName}! Your booking request has been submitted. We'll contact you at ${booking.contactPhone} within 2 hours to confirm. Estimated cost: $${estimatedPrice}`,
        [{ text: "Great!", onPress: () => router.push('/guest-confirmation') }]
      );
    } catch (error) {
      console.error("Submit booking error:", error);
      Alert.alert("Error", "Failed to submit booking. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Your Contact Details</Text>
      <Text style={styles.stepSubtitle}>We'll use these details to confirm your booking</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Full Name *</Text>
        <TextInput
          style={styles.input}
          value={booking.contactName}
          onChangeText={(text) => setBooking({...booking, contactName: text})}
          placeholder="Enter your full name"
          placeholderTextColor="#9ca3af"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Email Address *</Text>
        <TextInput
          style={styles.input}
          value={booking.contactEmail}
          onChangeText={(text) => setBooking({...booking, contactEmail: text})}
          placeholder="your.email@example.com"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Phone Number *</Text>
        <TextInput
          style={styles.input}
          value={booking.contactPhone}
          onChangeText={(text) => setBooking({...booking, contactPhone: text})}
          placeholder="0412 345 678"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
        />
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What service do you need?</Text>
      <Text style={styles.stepSubtitle}>Choose the type of cleaning that fits your needs</Text>
      
      <View style={styles.servicesGrid}>
        {services.map((service) => (
          <TouchableOpacity
            key={service.id}
            style={[
              styles.serviceOption,
              booking.serviceType === service.id && styles.serviceOptionSelected
            ]}
            onPress={() => setBooking({...booking, serviceType: service.id})}
          >
            <Text style={styles.serviceEmoji}>{service.icon}</Text>
            <Text style={styles.serviceOptionTitle}>{service.title}</Text>
            <Text style={styles.serviceOptionDesc}>{service.desc}</Text>
            <Text style={styles.serviceOptionPrice}>From ${service.price}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <Text style={styles.sectionTitle}>Property Type</Text>
      <View style={styles.propertyGrid}>
        {propertyTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.propertyOption,
              booking.propertyType === type.id && styles.propertyOptionSelected
            ]}
            onPress={() => setBooking({...booking, propertyType: type.id})}
          >
            <Text style={styles.propertyTitle}>{type.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.roomsContainer}>
        <View style={styles.roomCounter}>
          <Text style={styles.roomLabel}>Rooms</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setBooking({...booking, rooms: Math.max(1, booking.rooms - 1)})}
            >
              <AntDesign name="minus" size={16} color="#4facfe" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{booking.rooms}</Text>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setBooking({...booking, rooms: booking.rooms + 1})}
            >
              <AntDesign name="plus" size={16} color="#4facfe" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.roomCounter}>
          <Text style={styles.roomLabel}>Bathrooms</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setBooking({...booking, bathrooms: Math.max(1, booking.bathrooms - 1)})}
            >
              <AntDesign name="minus" size={16} color="#4facfe" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{booking.bathrooms}</Text>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setBooking({...booking, bathrooms: booking.bathrooms + 1})}
            >
              <AntDesign name="plus" size={16} color="#4facfe" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Where should we clean?</Text>
      <Text style={styles.stepSubtitle}>Enter your property address</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Property Address *</Text>
        <TextInput
          style={styles.input}
          value={booking.address}
          onChangeText={(text) => {
            setBooking({...booking, address: text});
            setAddressValidated(false);
          }}
          placeholder="Enter your full address"
          placeholderTextColor="#9ca3af"
          multiline
        />
        {addressValidated && (
          <View style={styles.validatedBadge}>
            <AntDesign name="checkcircle" size={16} color="#10b981" />
            <Text style={styles.validatedText}>Address verified!</Text>
          </View>
        )}
        <TouchableOpacity 
          style={styles.validateButton}
          onPress={validateAddress}
        >
          <Text style={styles.validateButtonText}>Validate Address</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>When would you like us to come?</Text>
      <Text style={styles.stepSubtitle}>Choose your preferred date and time</Text>
      
      <View style={styles.dateTimeContainer}>
        <TouchableOpacity 
          style={styles.dateTimeButton}
          onPress={() => setShowDatePicker(true)}
        >
          <AntDesign name="calendar" size={24} color="#4facfe" />
          <View style={styles.dateTimeText}>
            <Text style={styles.dateTimeLabel}>Date</Text>
            <Text style={styles.dateTimeValue}>
              {booking.scheduledDate.toLocaleDateString('en-AU', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </Text>
          </View>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.dateTimeButton}
          onPress={() => setShowTimePicker(true)}
        >
          <AntDesign name="clockcircleo" size={24} color="#4facfe" />
          <View style={styles.dateTimeText}>
            <Text style={styles.dateTimeLabel}>Time</Text>
            <Text style={styles.dateTimeValue}>
              {booking.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.urgencyContainer}>
        <Text style={styles.inputLabel}>How urgent is this?</Text>
        <View style={styles.urgencyOptions}>
          {[
            { id: 'standard', title: 'Standard', desc: 'Normal scheduling', extra: '' },
            { id: 'urgent', title: 'Urgent', desc: 'Within 24 hours', extra: '+30% fee' }
          ].map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.urgencyOption,
                booking.urgency === option.id && styles.urgencyOptionSelected
              ]}
              onPress={() => setBooking({...booking, urgency: option.id})}
            >
              <Text style={styles.urgencyTitle}>{option.title}</Text>
              <Text style={styles.urgencyDesc}>{option.desc}</Text>
              {option.extra && <Text style={styles.urgencyExtra}>{option.extra}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.inputContainer}>
        <Text style={styles.inputLabel}>Special Requests (Optional)</Text>
        <TextInput
          style={styles.textArea}
          value={booking.specialRequests}
          onChangeText={(text) => setBooking({...booking, specialRequests: text})}
          placeholder="Any specific areas to focus on, access instructions, or special requirements..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
      
      <View style={styles.priceEstimate}>
        <Text style={styles.priceLabel}>Estimated Cost</Text>
        <Text style={styles.priceValue}>${calculatePrice()}</Text>
        <Text style={styles.priceNote}>*Final price confirmed after inspection</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Guest Booking</Text>
          <Text style={styles.headerSubtitle}>Step {currentStep} of {totalSteps}</Text>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>

      <View style={styles.buttonContainer}>
        {currentStep > 1 && (
          <TouchableOpacity 
            style={styles.backStepButton}
            onPress={() => setCurrentStep(currentStep - 1)}
          >
            <Text style={styles.backStepText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity 
          style={[styles.nextButton, currentStep === 1 && styles.nextButtonFull]}
          onPress={handleNext}
          disabled={loading}
        >
          <LinearGradient colors={["#10b981", "#059669"]} style={styles.nextButtonGradient}>
            <Text style={styles.nextButtonText}>
              {loading ? "Submitting..." : currentStep === totalSteps ? "Submit Booking" : "Continue"}
            </Text>
            {!loading && <AntDesign name="arrowright" size={20} color="#fff" />}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={booking.scheduledDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setBooking({...booking, scheduledDate: selectedDate});
            }
          }}
          minimumDate={new Date()}
        />
      )}
      
      {showTimePicker && (
        <DateTimePicker
          value={booking.startTime}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) {
              setBooking({...booking, startTime: selectedTime});
            }
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f1f5f9" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
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
  
  progressContainer: { backgroundColor: "#fff", paddingHorizontal: 20, paddingVertical: 12 },
  progressBar: { height: 6, backgroundColor: "#e2e8f0", borderRadius: 3 },
  progressFill: { height: "100%", backgroundColor: "#4facfe", borderRadius: 3 },
  
  content: { flex: 1, padding: 20 },
  stepContainer: { flex: 1 },
  stepTitle: { fontSize: 24, fontWeight: "800", color: "#1e293b", marginBottom: 8, textAlign: "center" },
  stepSubtitle: { fontSize: 16, color: "#64748b", marginBottom: 32, textAlign: "center" },
  
  inputContainer: { marginBottom: 20 },
  inputLabel: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  textArea: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    minHeight: 100,
  },
  
  servicesGrid: { gap: 16, marginBottom: 24 },
  serviceOption: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    elevation: 2,
  },
  serviceOptionSelected: { borderColor: "#4facfe", backgroundColor: "#f0f8ff" },
  serviceEmoji: { fontSize: 32, marginBottom: 12 },
  serviceOptionTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b", marginBottom: 4 },
  serviceOptionDesc: { fontSize: 14, color: "#64748b", marginBottom: 8 },
  serviceOptionPrice: { fontSize: 16, fontWeight: "700", color: "#4facfe" },
  
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b", marginBottom: 16 },
  propertyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 24 },
  propertyOption: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  propertyOptionSelected: { borderColor: "#4facfe", backgroundColor: "#f0f8ff" },
  propertyTitle: { fontSize: 16, fontWeight: "600", color: "#1e293b" },
  
  roomsContainer: { flexDirection: "row", gap: 20 },
  roomCounter: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 16, alignItems: "center" },
  roomLabel: { fontSize: 14, fontWeight: "600", color: "#64748b", marginBottom: 12 },
  counterRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  counterValue: { fontSize: 20, fontWeight: "700", color: "#1e293b", minWidth: 30, textAlign: "center" },
  
  validatedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  validatedText: { color: "#10b981", fontSize: 14, fontWeight: "600", marginLeft: 8 },
  validateButton: {
    backgroundColor: "#4facfe",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  validateButtonText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  
  dateTimeContainer: { gap: 16, marginBottom: 24 },
  dateTimeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  dateTimeText: { marginLeft: 16 },
  dateTimeLabel: { fontSize: 14, color: "#64748b", fontWeight: "600" },
  dateTimeValue: { fontSize: 16, color: "#1e293b", fontWeight: "700", marginTop: 4 },
  
  urgencyContainer: { marginBottom: 24 },
  urgencyOptions: { gap: 12 },
  urgencyOption: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  urgencyOptionSelected: { borderColor: "#4facfe", backgroundColor: "#f0f8ff" },
  urgencyTitle: { fontSize: 16, fontWeight: "700", color: "#1e293b", marginBottom: 4 },
  urgencyDesc: { fontSize: 14, color: "#64748b" },
  urgencyExtra: { fontSize: 12, color: "#ef4444", fontWeight: "600", marginTop: 4 },
  
  priceEstimate: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    elevation: 3,
  },
  priceLabel: { fontSize: 16, color: "#64748b", fontWeight: "600" },
  priceValue: { fontSize: 36, fontWeight: "800", color: "#10b981", marginVertical: 8 },
  priceNote: { fontSize: 12, color: "#9ca3af", textAlign: "center" },
  
  buttonContainer: {
    flexDirection: "row",
    padding: 20,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    gap: 12,
  },
  backStepButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  backStepText: { fontSize: 16, fontWeight: "700", color: "#64748b" },
  nextButton: { flex: 2, borderRadius: 12, overflow: "hidden" },
  nextButtonFull: { flex: 1 },
  nextButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  nextButtonText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});