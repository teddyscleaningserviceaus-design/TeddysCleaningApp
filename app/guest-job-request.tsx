import { AntDesign } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { Stack } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import React, { useState, useEffect } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from '@react-native-async-storage/async-storage';

import { db } from "../config/firebase";

const { width } = Dimensions.get("window");

export default function GuestJobRequest() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  const [guestInfo, setGuestInfo] = useState(null);
  
  const [jobRequest, setJobRequest] = useState({
    serviceType: '',
    customService: '',
    propertyType: '',
    address: '',
    scheduledDate: new Date(),
    startTime: new Date(),
    frequency: 'one-time',
    rooms: 1,
    bathrooms: 1,
    kitchens: 0,
    specialRequests: '',
    urgency: 'standard',
    estimatedPrice: 0
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [addressValidated, setAddressValidated] = useState(false);
  const [validatingAddress, setValidatingAddress] = useState(false);
  const scrollViewRef = React.useRef(null);

  useEffect(() => {
    loadGuestInfo();
  }, []);

  const loadGuestInfo = async () => {
    try {
      const storedGuestInfo = await AsyncStorage.getItem('guestInfo');
      if (storedGuestInfo) {
        setGuestInfo(JSON.parse(storedGuestInfo));
      } else {
        router.replace('/guest-setup');
      }
    } catch (error) {
      console.error('Error loading guest info:', error);
    }
  };

  const services = [
    { id: 'regular', title: 'Regular Clean', desc: 'Weekly maintenance', price: 120, icon: '🏠' },
    { id: 'deep', title: 'Deep Clean', desc: 'Thorough cleaning', price: 280, icon: '✨' },
    { id: 'move', title: 'End of Lease', desc: 'Move out clean', price: 350, icon: '📦' },
    { id: 'office', title: 'Office Clean', desc: 'Commercial space', price: 200, icon: '🏢' },
    { id: 'carpet', title: 'Carpet Clean', desc: 'Steam cleaning', price: 180, icon: '🧽' },
    { id: 'window', title: 'Window Clean', desc: 'Interior & exterior', price: 150, icon: '🪟' },
    { id: 'construction', title: 'Post Construction', desc: 'After renovation', price: 400, icon: '🔨' },
    { id: 'spring', title: 'Spring Clean', desc: 'Seasonal deep clean', price: 320, icon: '🌸' },
    { id: 'other', title: 'Other', desc: 'Custom service', price: 150, icon: '💭' }
  ];

  const propertyTypes = [
    { id: 'apartment', title: 'Apartment', multiplier: 0.8 },
    { id: 'house', title: 'House', multiplier: 1.0 },
    { id: 'townhouse', title: 'Townhouse', multiplier: 1.1 },
    { id: 'office', title: 'Office', multiplier: 1.2 },
    { id: 'warehouse', title: 'Warehouse', multiplier: 1.4 },
    { id: 'retail', title: 'Retail', multiplier: 1.5 }
  ];

  const calculatePrice = () => {
    const service = services.find(s => s.id === jobRequest.serviceType);
    const property = propertyTypes.find(p => p.id === jobRequest.propertyType);
    
    if (!service || !property) return 0;
    
    let basePrice = service.price * property.multiplier;
    
    if (jobRequest.rooms > 3) {
      basePrice *= (1 + (jobRequest.rooms - 3) * 0.2);
    }
    
    if (jobRequest.bathrooms > 2) {
      basePrice *= (1 + (jobRequest.bathrooms - 2) * 0.15);
    }
    
    if (jobRequest.kitchens > 0) {
      basePrice *= (1 + jobRequest.kitchens * 0.25);
    }
    
    if (jobRequest.urgency === 'urgent') {
      basePrice *= 1.3;
    }
    
    return Math.round(basePrice);
  };

  const validateAddress = async () => {
    if (!jobRequest.address.trim()) {
      Alert.alert('Address Required', 'Please enter an address first.');
      return false;
    }
    
    setValidatingAddress(true);
    try {
      const encodedAddress = encodeURIComponent(jobRequest.address.trim());
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=AIzaSyD-ZSDsExijWGcVsALHSE9m7K5009vQvH4`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        setJobRequest(prev => ({
          ...prev,
          address: result.formatted_address,
          latitude: result.geometry.location.lat,
          longitude: result.geometry.location.lng,
        }));
        setAddressValidated(true);
        Alert.alert('Address Validated', 'Address has been verified and formatted.');
        return true;
      } else {
        Alert.alert('Invalid Address', 'Could not validate this address. Please check and try again.');
        return false;
      }
    } catch (error) {
      console.error('Address validation error:', error);
      Alert.alert('Validation Error', 'Failed to validate address. Please try again.');
      return false;
    } finally {
      setValidatingAddress(false);
    }
  };

  const handleNext = async () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      handleSubmitRequest();
    }
  };

  const handleSubmitRequest = async () => {
    setLoading(true);
    try {
      const estimatedPrice = calculatePrice();
      
      await addDoc(collection(db, "guest-bookings"), {
        title: `${jobRequest.serviceType === 'other' ? jobRequest.customService : services.find(s => s.id === jobRequest.serviceType)?.title} - ${jobRequest.propertyType}`,
        contactName: guestInfo.name,
        contactEmail: guestInfo.email,
        contactPhone: guestInfo.phone,
        address: jobRequest.address,
        serviceType: jobRequest.serviceType,
        propertyType: jobRequest.propertyType,
        rooms: jobRequest.rooms,
        bathrooms: jobRequest.bathrooms,
        kitchens: jobRequest.kitchens,
        frequency: jobRequest.frequency,
        priority: jobRequest.urgency === 'urgent' ? 'High' : 'Medium',
        status: "Pending",
        progress: 0,
        scheduledDate: jobRequest.scheduledDate.toLocaleDateString(),
        startTime: jobRequest.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        specialRequests: jobRequest.specialRequests,
        estimatedPrice: estimatedPrice,
        latitude: jobRequest.latitude,
        longitude: jobRequest.longitude,
        bookingType: 'guest',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      Alert.alert(
        "Request Submitted! 🎉", 
        `Your cleaning request has been submitted. Estimated cost: $${estimatedPrice}. We'll contact you within 2 hours to confirm.`,
        [{ text: "Great!", onPress: () => router.push('/guest-dashboard') }]
      );
    } catch (error) {
      console.error("Submit request error:", error);
      Alert.alert("Error", "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>What service do you need?</Text>
      <Text style={styles.stepSubtitle}>Choose the type of cleaning that fits your needs</Text>
      
      <View style={styles.servicesGrid}>
        {services.map((service, index) => {
          // Show "Other" option and custom input side by side
          if (service.id === 'other') {
            return (
              <View key={service.id} style={styles.otherServiceRow}>
                <TouchableOpacity
                  style={[
                    styles.serviceOption,
                    styles.otherServiceOption,
                    jobRequest.serviceType === service.id && styles.serviceOptionSelected
                  ]}
                  onPress={() => setJobRequest({...jobRequest, serviceType: service.id})}
                >
                  <Text style={styles.serviceEmoji}>{service.icon}</Text>
                  <Text style={styles.serviceOptionTitle}>{service.title}</Text>
                  <Text style={styles.serviceOptionDesc}>{service.desc}</Text>
                  <Text style={styles.serviceOptionPrice}>From ${service.price}</Text>
                </TouchableOpacity>
                
                {jobRequest.serviceType === 'other' && (
                  <View style={styles.inlineCustomInput}>
                    <TextInput
                      style={styles.customServiceInput}
                      value={jobRequest.customService}
                      onChangeText={(text) => setJobRequest({...jobRequest, customService: text})}
                      placeholder="Describe your service..."
                      placeholderTextColor="#9ca3af"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                    />
                  </View>
                )}
              </View>
            );
          }
          
          return (
            <TouchableOpacity
              key={service.id}
              style={[
                styles.serviceOption,
                jobRequest.serviceType === service.id && styles.serviceOptionSelected
              ]}
              onPress={() => setJobRequest({...jobRequest, serviceType: service.id})}
            >
              <Text style={styles.serviceEmoji}>{service.icon}</Text>
              <Text style={styles.serviceOptionTitle}>{service.title}</Text>
              <Text style={styles.serviceOptionDesc}>{service.desc}</Text>
              <Text style={styles.serviceOptionPrice}>From ${service.price}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Tell us about your space</Text>
      <Text style={styles.stepSubtitle}>Help us provide an accurate quote</Text>
      
      <View style={styles.propertyGrid}>
        {propertyTypes.map((type) => (
          <TouchableOpacity
            key={type.id}
            style={[
              styles.propertyOption,
              jobRequest.propertyType === type.id && styles.propertyOptionSelected
            ]}
            onPress={() => setJobRequest({...jobRequest, propertyType: type.id})}
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
              onPress={() => setJobRequest({...jobRequest, rooms: Math.max(1, jobRequest.rooms - 1)})}
            >
              <AntDesign name="minus" size={16} color="#4facfe" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{jobRequest.rooms}</Text>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setJobRequest({...jobRequest, rooms: jobRequest.rooms + 1})}
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
              onPress={() => setJobRequest({...jobRequest, bathrooms: Math.max(0, jobRequest.bathrooms - 1)})}
            >
              <AntDesign name="minus" size={16} color="#4facfe" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{jobRequest.bathrooms}</Text>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setJobRequest({...jobRequest, bathrooms: jobRequest.bathrooms + 1})}
            >
              <AntDesign name="plus" size={16} color="#4facfe" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.roomCounter}>
          <Text style={styles.roomLabel}>Kitchens</Text>
          <View style={styles.counterRow}>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setJobRequest({...jobRequest, kitchens: Math.max(0, jobRequest.kitchens - 1)})}
            >
              <AntDesign name="minus" size={16} color="#4facfe" />
            </TouchableOpacity>
            <Text style={styles.counterValue}>{jobRequest.kitchens}</Text>
            <TouchableOpacity 
              style={styles.counterButton}
              onPress={() => setJobRequest({...jobRequest, kitchens: jobRequest.kitchens + 1})}
            >
              <AntDesign name="plus" size={16} color="#4facfe" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      <View style={styles.addressContainer}>
        <Text style={styles.inputLabel}>Property Address</Text>
        <TextInput
          style={styles.addressInput}
          value={jobRequest.address}
          onChangeText={(text) => {
            setJobRequest({...jobRequest, address: text});
            setAddressValidated(false);
          }}
          onFocus={() => {
            setTimeout(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 300);
          }}
          placeholder="Enter your full address"
          placeholderTextColor="#9ca3af"
          multiline
        />
        
        <TouchableOpacity 
          style={[
            styles.validateButton,
            (!jobRequest.address.trim() || validatingAddress) && styles.validateButtonDisabled
          ]}
          onPress={validateAddress}
          disabled={!jobRequest.address.trim() || validatingAddress}
        >
          <AntDesign 
            name={validatingAddress ? "loading1" : addressValidated ? "checkcircle" : "enviromento"} 
            size={16} 
            color={addressValidated ? "#10b981" : "#4facfe"} 
          />
          <Text style={[
            styles.validateButtonText,
            addressValidated && styles.validateButtonTextSuccess
          ]}>
            {validatingAddress ? "Validating..." : addressValidated ? "Address Verified" : "Validate Address"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderStep3 = () => (
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
              {jobRequest.scheduledDate.toLocaleDateString('en-AU', { 
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
              {jobRequest.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
      
      <View style={styles.urgencyContainer}>
        <Text style={styles.inputLabel}>How urgent is this?</Text>
        <View style={styles.urgencyOptions}>
          {[
            { id: 'standard', title: 'Standard', desc: 'Within 3-5 days', extra: '' },
            { id: 'urgent', title: 'Urgent', desc: 'Within 24 hours', extra: '+30% fee' }
          ].map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.urgencyOption,
                jobRequest.urgency === option.id && styles.urgencyOptionSelected
              ]}
              onPress={() => setJobRequest({...jobRequest, urgency: option.id})}
            >
              <Text style={styles.urgencyTitle}>{option.title}</Text>
              <Text style={styles.urgencyDesc}>{option.desc}</Text>
              {option.extra && <Text style={styles.urgencyExtra}>{option.extra}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Almost done! 🎉</Text>
      <Text style={styles.stepSubtitle}>Review and submit your request</Text>
      
      <View style={styles.priceEstimate}>
        <Text style={styles.priceLabel}>Estimated Cost</Text>
        <Text style={styles.priceValue}>${calculatePrice()}</Text>
        <Text style={styles.priceNote}>*Final price confirmed after inspection</Text>
      </View>
      
      <View style={styles.specialRequestsContainer}>
        <Text style={styles.inputLabel}>Special Requests (Optional)</Text>
        <TextInput
          style={styles.specialRequestsInput}
          value={jobRequest.specialRequests}
          onChangeText={(text) => setJobRequest({...jobRequest, specialRequests: text})}
          placeholder="Any specific areas to focus on, access instructions, or special requirements..."
          placeholderTextColor="#9ca3af"
          multiline
          numberOfLines={4}
          textAlignVertical="top"
        />
      </View>
      
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Booking Summary</Text>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Contact:</Text>
          <Text style={styles.summaryValue}>{guestInfo?.name}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Service:</Text>
          <Text style={styles.summaryValue}>{jobRequest.serviceType === 'other' ? jobRequest.customService : services.find(s => s.id === jobRequest.serviceType)?.title}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Property:</Text>
          <Text style={styles.summaryValue}>{jobRequest.propertyType} ({jobRequest.rooms}R, {jobRequest.bathrooms}B, {jobRequest.kitchens}K)</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Date:</Text>
          <Text style={styles.summaryValue}>{jobRequest.scheduledDate.toLocaleDateString()}</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Time:</Text>
          <Text style={styles.summaryValue}>{jobRequest.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <>
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
            <Text style={styles.headerTitle}>Book Your Clean</Text>
            <Text style={styles.headerSubtitle}>Step {currentStep} of {totalSteps}</Text>
          </View>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
        </View>
      </View>

      <ScrollView 
        ref={scrollViewRef}
        style={styles.content} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
          style={[
            styles.nextButton, 
            currentStep === 1 && styles.nextButtonFull,
            (loading || 
              (currentStep === 1 && !jobRequest.serviceType) || 
              (currentStep === 1 && jobRequest.serviceType === 'other' && !jobRequest.customService.trim()) ||
              (currentStep === 2 && (!jobRequest.propertyType || !addressValidated))
            ) && styles.nextButtonDisabled
          ]}
          onPress={handleNext}
          disabled={loading || 
            (currentStep === 1 && !jobRequest.serviceType) || 
            (currentStep === 1 && jobRequest.serviceType === 'other' && !jobRequest.customService.trim()) ||
            (currentStep === 2 && (!jobRequest.propertyType || !addressValidated))
          }
        >
          <LinearGradient 
            colors={
              (loading || 
                (currentStep === 1 && !jobRequest.serviceType) || 
                (currentStep === 1 && jobRequest.serviceType === 'other' && !jobRequest.customService.trim()) ||
                (currentStep === 2 && (!jobRequest.propertyType || !addressValidated))
              ) ? ["#e2e8f0", "#cbd5e1"] : ["#10b981", "#059669"]
            } 
            style={styles.nextButtonGradient
          }>
            <Text style={styles.nextButtonText}>
              {loading ? "Submitting..." : currentStep === totalSteps ? "Submit Request" : "Continue"}
            </Text>
            {!loading && <AntDesign name="arrowright" size={20} color="#fff" />}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={jobRequest.scheduledDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setJobRequest({...jobRequest, scheduledDate: selectedDate});
            }
          }}
          minimumDate={new Date()}
        />
      )}
      
      {showTimePicker && (
        <DateTimePicker
          value={jobRequest.startTime}
          mode="time"
          display="default"
          onChange={(event, selectedTime) => {
            setShowTimePicker(false);
            if (selectedTime) {
              setJobRequest({...jobRequest, startTime: selectedTime});
            }
          }}
        />
      )}
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
    paddingVertical: 16,
    elevation: 8,
  },
  backButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  headerCenter: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "center", 
    flex: 1 
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  headerTextContainer: {
    alignItems: "center",
  },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "rgba(255,255,255,0.9)", fontWeight: "600" },
  headerRight: { width: 40 },
  
  progressContainer: { backgroundColor: "#fff", paddingHorizontal: 20, paddingVertical: 12 },
  progressBar: { height: 6, backgroundColor: "#e2e8f0", borderRadius: 3 },
  progressFill: { height: "100%", backgroundColor: "#4facfe", borderRadius: 3 },
  
  content: { flex: 1, padding: 20, paddingBottom: 200 },
  stepContainer: { flex: 1 },
  stepTitle: { fontSize: 24, fontWeight: "800", color: "#1e293b", marginBottom: 8, textAlign: "center" },
  stepSubtitle: { fontSize: 16, color: "#64748b", marginBottom: 32, textAlign: "center" },
  
  servicesGrid: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 12, 
    justifyContent: 'space-between' 
  },
  serviceOption: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "transparent",
    elevation: 2,
    width: '48%',
    minHeight: 120,
  },
  serviceOptionSelected: { borderColor: "#4facfe", backgroundColor: "#f0f8ff" },
  serviceEmoji: { fontSize: 24, marginBottom: 8 },
  serviceOptionTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b", marginBottom: 4, textAlign: 'center' },
  serviceOptionDesc: { fontSize: 12, color: "#64748b", marginBottom: 6, textAlign: 'center' },
  serviceOptionPrice: { fontSize: 14, fontWeight: "700", color: "#4facfe" },
  
  otherServiceRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    marginBottom: 12,
  },
  otherServiceOption: {
    width: '48%',
  },
  inlineCustomInput: {
    flex: 1,
  },
  customServiceInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 14,
    color: "#1e293b",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    minHeight: 120,
  },
  
  propertyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  propertyOption: {
    flex: 1,
    minWidth: "30%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  propertyOptionSelected: { borderColor: "#4facfe", backgroundColor: "#f0f8ff" },
  propertyTitle: { fontSize: 16, fontWeight: "600", color: "#1e293b" },
  
  roomsContainer: { flexDirection: "row", gap: 12, marginBottom: 24 },
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
  
  addressContainer: { marginBottom: 24 },
  inputLabel: { fontSize: 16, fontWeight: "600", color: "#374151", marginBottom: 8 },
  addressInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    minHeight: 80,
  },
  validateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4facfe",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  validateButtonDisabled: {
    backgroundColor: "#e2e8f0",
  },
  validateButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  validateButtonTextSuccess: {
    color: "#10b981",
  },
  
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
    marginBottom: 24,
    elevation: 3,
  },
  priceLabel: { fontSize: 16, color: "#64748b", fontWeight: "600" },
  priceValue: { fontSize: 36, fontWeight: "800", color: "#10b981", marginVertical: 8 },
  priceNote: { fontSize: 12, color: "#9ca3af", textAlign: "center" },
  
  specialRequestsContainer: { marginBottom: 24 },
  specialRequestsInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    minHeight: 100,
  },
  
  summaryContainer: { backgroundColor: "#fff", borderRadius: 16, padding: 20 },
  summaryTitle: { fontSize: 18, fontWeight: "700", color: "#1e293b", marginBottom: 16 },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  summaryLabel: { fontSize: 14, color: "#64748b" },
  summaryValue: { fontSize: 14, fontWeight: "600", color: "#1e293b" },
  
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
  nextButtonDisabled: {
    opacity: 0.6,
  },
});