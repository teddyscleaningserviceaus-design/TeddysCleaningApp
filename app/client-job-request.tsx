import { AntDesign, Ionicons } from "@expo/vector-icons";
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import React, { useState, useEffect, useRef } from "react";
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
  Keyboard,
} from "react-native";

import { auth, db } from "../config/firebase";


const { width } = Dimensions.get("window");

export default function ClientJobRequest() {
  const router = useRouter();
  const scrollViewRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  const [jobRequest, setJobRequest] = useState({
    serviceType: '',
    propertyType: '',
    address: '',
    suburb: '',
    postcode: '',
    scheduledDate: new Date(),
    startTime: new Date(),
    frequency: 'one-time',
    isRecurring: false,
    recurringDays: [],
    rooms: 1,
    bathrooms: 0,
    kitchens: 0,
    specialRequests: '',
    urgency: 'standard',
    contactNumber: '',
    contactName: '',
    estimatedPrice: 0
  });
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [addressValidated, setAddressValidated] = useState(false);
  const [addressValidating, setAddressValidating] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      keyboardDidHideListener?.remove();
      keyboardDidShowListener?.remove();
    };
  }, []);

  const services = [
    { id: 'regular', title: 'Regular Clean', desc: 'Weekly maintenance', price: 120, icon: '🏠', color: '#4facfe' },
    { id: 'deep', title: 'Deep Clean', desc: 'Thorough cleaning', price: 280, icon: '✨', color: '#00d4ff' },
    { id: 'move', title: 'End of Lease', desc: 'Move out clean', price: 350, icon: '📦', color: '#28a745' },
    { id: 'office', title: 'Office Clean', desc: 'Commercial space', price: 200, icon: '🏢', color: '#ffc107' },
    { id: 'window', title: 'Window Clean', desc: 'Interior & exterior', price: 150, icon: '🪟', color: '#17a2b8' },
    { id: 'carpet', title: 'Carpet Clean', desc: 'Steam cleaning', price: 180, icon: '🧽', color: '#6f42c1' }
  ];

  const propertyTypes = [
    { id: 'apartment', title: 'Apartment', multiplier: 0.8, icon: '🏢' },
    { id: 'house', title: 'House', multiplier: 1.0, icon: '🏠' },
    { id: 'townhouse', title: 'Townhouse', multiplier: 1.1, icon: '🏘️' },
    { id: 'office', title: 'Office', multiplier: 1.2, icon: '🏢' },
    { id: 'retail', title: 'Retail', multiplier: 1.5, icon: '🏪' },
    { id: 'warehouse', title: 'Warehouse', multiplier: 1.8, icon: '🏭' }
  ];

  const calculatePrice = () => {
    const service = services.find(s => s.id === jobRequest.serviceType);
    const property = propertyTypes.find(p => p.id === jobRequest.propertyType);
    
    if (!service || !property) return 0;
    
    // Start with a more affordable base price (20% discount)
    let basePrice = service.price * 0.8 * property.multiplier;
    
    // Room multiplier - more affordable scaling
    if (jobRequest.rooms > 2) {
      basePrice += (jobRequest.rooms - 2) * 15; // $15 per extra room instead of percentage
    }
    
    // Bathroom multiplier - smaller impact
    if (jobRequest.bathrooms > 0) {
      basePrice += jobRequest.bathrooms * 10; // $10 per bathroom
    }
    
    // Kitchen multiplier - moderate impact
    if (jobRequest.kitchens > 0) {
      basePrice += jobRequest.kitchens * 20; // $20 per kitchen
    }
    
    // Urgency multiplier - reduced from 30% to 20%
    if (jobRequest.urgency === 'urgent') {
      basePrice *= 1.2;
    }
    
    // Apply recurring discount
    if (jobRequest.isRecurring) {
      basePrice *= 0.85; // 15% discount for recurring services
    }
    
    return Math.round(basePrice);
  };

  const calculateWeeklyPrice = () => {
    if (!jobRequest.isRecurring) return 0;
    const basePrice = calculatePrice();
    // Weekly price with additional discount
    return Math.round(basePrice * 0.9); // Extra 10% off weekly rate
  };

  const validateAddress = async () => {
    if (!jobRequest.address.trim()) {
      Alert.alert('Missing Information', 'Please enter your address.');
      return false;
    }
    
    setAddressValidating(true);
    try {
      const encodedAddress = encodeURIComponent(jobRequest.address.trim());
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=AIzaSyD-ZSDsExijWGcVsALHSE9m7K5009vQvH4`
      );
      const data = await response.json();
      
      if (data.status === 'OK' && data.results.length > 0) {
        const result = data.results[0];
        const location = result.geometry.location;
        
        // Parse address components
        const components = result.address_components;
        const postcode = components.find(c => c.types.includes('postal_code'))?.long_name;
        const suburb = components.find(c => c.types.includes('locality'))?.long_name;
        
        // Check if it's in Victoria
        const state = components.find(c => c.types.includes('administrative_area_level_1'))?.short_name;
        if (state !== 'VIC') {
          Alert.alert('Service Area', 'We currently only service Victoria, Australia.');
          setAddressValidating(false);
          return false;
        }
        
        setJobRequest(prev => ({
          ...prev,
          address: result.formatted_address,
          suburb: suburb || prev.suburb,
          postcode: postcode || prev.postcode,
          latitude: location.lat,
          longitude: location.lng,
        }));
        setAddressValidated(true);
        setAddressValidating(false);
        return true;
      } else {
        Alert.alert('Address Not Found', 'Please enter a valid address.');
        setAddressValidating(false);
        return false;
      }
    } catch (error) {
      console.error('Address validation error:', error);
      Alert.alert('Validation Error', 'Unable to verify address. Please check your internet connection.');
      setAddressValidating(false);
      return false;
    }
  };

  const handleNext = async () => {
    if (currentStep === 1 && !jobRequest.serviceType) {
      Alert.alert('Service Required', 'Please select a service type.');
      return;
    }
    
    if (currentStep === 2) {
      if (!jobRequest.propertyType) {
        Alert.alert('Property Type Required', 'Please select your property type.');
        return;
      }
      if (!addressValidated) {
        const valid = await validateAddress();
        if (!valid) {
          return;
        }
      }
    }
    
    if (currentStep === 4) {
      if (!jobRequest.contactName.trim() || !jobRequest.contactNumber.trim()) {
        Alert.alert('Missing Contact Info', 'Please enter your name and phone number.');
        return;
      }
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      // Auto-scroll to top when moving to next step
      setTimeout(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      }, 100);
    } else {
      handleSubmitRequest();
    }
  };

  const handleSubmitRequest = async () => {
    setLoading(true);
    try {
      const estimatedPrice = jobRequest.isRecurring ? calculateWeeklyPrice() : calculatePrice();
      const user = auth.currentUser;
      
      if (!user) {
        Alert.alert("Error", "You must be logged in to submit a request.");
        setLoading(false);
        return;
      }
      
      console.log('Submitting job request for user:', user.uid);
      
      const jobData = {
        title: `${services.find(s => s.id === jobRequest.serviceType)?.title} - ${jobRequest.propertyType}`,
        client: jobRequest.contactName || user.displayName || user.email?.split('@')[0] || 'Client',
        clientId: user.uid,
        contactNumber: jobRequest.contactNumber,
        contactName: jobRequest.contactName,
        address: jobRequest.address,
        serviceType: jobRequest.serviceType,
        propertyType: jobRequest.propertyType,
        rooms: jobRequest.rooms,
        bathrooms: jobRequest.bathrooms,
        kitchens: jobRequest.kitchens,
        suburb: jobRequest.suburb,
        postcode: jobRequest.postcode,
        frequency: jobRequest.frequency,
        isRecurring: jobRequest.isRecurring,
        recurringDays: jobRequest.recurringDays,
        priority: jobRequest.urgency === 'urgent' ? 'High' : 'Medium',
        status: "Pending",
        progress: 0,
        scheduledDate: jobRequest.scheduledDate.toLocaleDateString(),
        startTime: jobRequest.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        specialRequests: jobRequest.specialRequests,
        estimatedPrice: estimatedPrice,
        latitude: jobRequest.latitude,
        longitude: jobRequest.longitude,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      console.log('Job data to be saved:', jobData);
      
      const docRef = await addDoc(collection(db, "jobs"), jobData);
      console.log('Job saved with ID:', docRef.id);
      
      Alert.alert(
        "Request Submitted! 🎉", 
        `Your cleaning request has been submitted. Estimated cost: $${estimatedPrice}. We'll contact you within 2 hours to confirm.`,
        [{ text: "Great!", onPress: () => router.push('/(client-tabs)/bookings') }]
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
      <Text style={styles.stepSubtitle}>Choose from our comprehensive cleaning services</Text>
      
      <View style={styles.servicesGrid}>
        {services.map((service) => (
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
        ))}
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
            <Text style={styles.propertyEmoji}>{type.icon}</Text>
            <Text style={styles.propertyTitle}>{type.title}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={styles.roomsContainer}>
        <View style={styles.roomCounter}>
          <Text style={styles.roomLabel}>🛏️ Rooms</Text>
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
          <Text style={styles.roomLabel}>🚿 Bathrooms</Text>
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
          <Text style={styles.roomLabel}>🍳 Kitchens</Text>
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
        <Text style={styles.inputLabel}>Property Address *</Text>
        <TextInput
          style={styles.addressInput}
          value={jobRequest.address}
          onChangeText={(text) => {
            setJobRequest({...jobRequest, address: text});
            setAddressValidated(false);
          }}
          placeholder="123 Collins Street, Melbourne VIC 3000"
          placeholderTextColor="#9ca3af"
          multiline
        />
        
        <TouchableOpacity 
          style={[
            styles.verifyButton, 
            addressValidating && styles.verifyButtonDisabled,
            addressValidated && styles.verifyButtonVerified
          ]}
          onPress={validateAddress}
          disabled={addressValidating}
        >
          <Text style={[
            styles.verifyButtonText,
            addressValidated && styles.verifyButtonTextVerified
          ]}>
            {addressValidating ? 'Verifying...' : addressValidated ? 'Address Verified ✓' : 'Verify Address'}
          </Text>
        </TouchableOpacity>
        
        {addressValidated && (
          <View style={styles.validatedBadge}>
            <AntDesign name="checkcircle" size={16} color="#10b981" />
            <Text style={styles.validatedText}>Address verified! ✅</Text>
          </View>
        )}
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
      
      <TouchableOpacity 
        style={styles.recurringOption}
        onPress={() => setJobRequest({...jobRequest, isRecurring: !jobRequest.isRecurring})}
      >
        <View style={styles.recurringHeader}>
          <AntDesign name="sync" size={20} color="#4facfe" />
          <Text style={styles.recurringTitle}>Is this a recurring service?</Text>
          <View style={[styles.checkbox, jobRequest.isRecurring && styles.checkboxSelected]}>
            {jobRequest.isRecurring && <AntDesign name="check" size={12} color="#fff" />}
          </View>
        </View>
        {jobRequest.isRecurring && (
          <View style={styles.recurringDays}>
            <Text style={styles.recurringSubtitle}>Select days:</Text>
            <View style={styles.daysGrid}>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    jobRequest.recurringDays.includes(day) && styles.dayButtonSelected
                  ]}
                  onPress={() => {
                    const days = jobRequest.recurringDays.includes(day)
                      ? jobRequest.recurringDays.filter(d => d !== day)
                      : [...jobRequest.recurringDays, day];
                    setJobRequest({...jobRequest, recurringDays: days});
                  }}
                >
                  <Text style={[
                    styles.dayText,
                    jobRequest.recurringDays.includes(day) && styles.dayTextSelected
                  ]}>{day}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
      </TouchableOpacity>
      
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
      <Text style={styles.stepSubtitle}>Contact details and final requests</Text>
      
      <View style={styles.priceEstimate}>
        <Text style={styles.priceLabel}>
          {jobRequest.isRecurring ? 'Weekly Estimated Cost' : 'Estimated Cost'}
        </Text>
        <Text style={styles.priceValue}>
          ${jobRequest.isRecurring ? calculateWeeklyPrice() : calculatePrice()}
        </Text>
        {jobRequest.isRecurring && (
          <Text style={styles.recurringNote}>
            Weekly rate with recurring discount applied
          </Text>
        )}
        <Text style={styles.priceNote}>*Final price confirmed after inspection</Text>
      </View>
      
      <View style={styles.contactContainer}>
        <Text style={styles.inputLabel}>Contact Name *</Text>
        <TextInput
          style={styles.contactInput}
          value={jobRequest.contactName}
          onChangeText={(text) => setJobRequest({...jobRequest, contactName: text})}
          placeholder="Your full name"
          placeholderTextColor="#9ca3af"
        />
        
        <Text style={styles.inputLabel}>Contact Number *</Text>
        <TextInput
          style={styles.contactInput}
          value={jobRequest.contactNumber}
          onChangeText={(text) => {
            // Format phone number as user types
            const cleaned = text.replace(/\D/g, '');
            let formatted = cleaned;
            if (cleaned.length >= 4) {
              formatted = cleaned.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3');
            }
            setJobRequest({...jobRequest, contactNumber: formatted});
          }}
          placeholder="0412 345 678"
          placeholderTextColor="#9ca3af"
          keyboardType="phone-pad"
          maxLength={12}
        />
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
          <Text style={styles.summaryLabel}>Service:</Text>
          <Text style={styles.summaryValue}>{services.find(s => s.id === jobRequest.serviceType)?.title}</Text>
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
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Book Your Clean</Text>
          <Text style={styles.headerSubtitle}>Step {currentStep} of {totalSteps}</Text>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${(currentStep / totalSteps) * 100}%` }]} />
        </View>
      </View>

      <ScrollView ref={scrollViewRef} style={styles.content} showsVerticalScrollIndicator={false}>
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </ScrollView>

      {!keyboardVisible && (
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
          disabled={loading || (currentStep === 1 && !jobRequest.serviceType)}
        >
          <LinearGradient colors={["#10b981", "#059669"]} style={styles.nextButtonGradient}>
            <Text style={styles.nextButtonText}>
              {loading ? "Submitting..." : currentStep === totalSteps ? "Submit Request" : "Continue"}
            </Text>
            {!loading && <AntDesign name="arrowright" size={20} color="#fff" />}
          </LinearGradient>
        </TouchableOpacity>
        </View>
      )}

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
  
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  serviceOption: {
    width: '48%',
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    elevation: 2,
  },
  serviceOptionSelected: { borderColor: "#4facfe", backgroundColor: "#f0f8ff" },
  serviceEmoji: { fontSize: 20, marginBottom: 8 },
  serviceOptionTitle: { fontSize: 14, fontWeight: "700", color: "#1e293b", marginBottom: 2, textAlign: 'center' },
  serviceOptionDesc: { fontSize: 11, color: "#64748b", marginBottom: 6, textAlign: 'center' },
  serviceOptionPrice: { fontSize: 12, fontWeight: "700", color: "#4facfe" },
  
  propertyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 24 },
  propertyOption: {
    width: '48%',
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  propertyOptionSelected: { borderColor: "#4facfe", backgroundColor: "#f0f8ff" },
  propertyEmoji: { fontSize: 20, marginBottom: 4 },
  propertyTitle: { fontSize: 12, fontWeight: "600", color: "#1e293b", textAlign: 'center' },
  
  roomsContainer: { flexDirection: "row", gap: 8, marginBottom: 24 },
  roomCounter: { flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 12, alignItems: "center" },
  roomLabel: { fontSize: 12, fontWeight: "600", color: "#64748b", marginBottom: 8, textAlign: 'center' },
  counterRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  counterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f0f8ff",
    alignItems: "center",
    justifyContent: "center",
  },
  counterValue: { fontSize: 18, fontWeight: "700", color: "#1e293b", minWidth: 25, textAlign: "center" },
  
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
    minHeight: 60,
    textAlignVertical: 'top'
  },
  verifyButton: {
    backgroundColor: '#4facfe',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12
  },
  verifyButtonDisabled: { opacity: 0.6 },
  verifyButtonVerified: { backgroundColor: '#10b981' },
  verifyButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  verifyButtonTextVerified: { color: '#fff' },
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
  
  recurringOption: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  recurringHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  recurringTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginLeft: 12
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#4facfe',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkboxSelected: {
    backgroundColor: '#4facfe'
  },
  recurringDays: {
    marginTop: 16
  },
  recurringSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#fff'
  },
  dayButtonSelected: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe'
  },
  dayText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600'
  },
  dayTextSelected: {
    color: '#fff'
  },
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
  recurringNote: { fontSize: 14, color: "#10b981", textAlign: "center", fontWeight: "600", marginBottom: 4 },
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
  
  contactContainer: { marginBottom: 24 },
  contactInput: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    marginBottom: 16,
  },
});