import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
  Dimensions,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AntDesign, Ionicons, MaterialIcons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import { auth, db } from '../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { updateEmail, updatePassword } from 'firebase/auth';

const { width } = Dimensions.get('window');

const steps = [
  { id: 1, title: 'Credentials', icon: 'lock' },
  { id: 2, title: 'Personal Info', icon: 'person' },
  { id: 3, title: 'Address', icon: 'location' },
  { id: 4, title: 'Contact', icon: 'call' },
  { id: 5, title: 'Availability', icon: 'time' },
  { id: 6, title: 'Emergency', icon: 'medical' },
];

const SHIFT_HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00`, label: `${hour}:00` };
});

const DAYS_OF_WEEK = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export default function EmployeeSetupPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const [addressVerified, setAddressVerified] = useState(false);
  const [verifyingAddress, setVerifyingAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  
  const router = useRouter();
  const progressWidth = useSharedValue(16.67); // 100/6 steps
  const inputRefs = useRef([]);

  const [formData, setFormData] = useState({
    // Step 1: Credentials
    newEmail: '',
    newPassword: '',
    confirmPassword: '',
    
    // Step 2: Personal Info
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    
    // Step 3: Address
    streetAddress: '',
    suburb: '',
    postcode: '',
    
    // Step 4: Contact
    phone: '',
    alternatePhone: '',
    
    // Step 5: Availability
    preferredShifts: [],
    availableDays: [],
    unavailableDates: [],
    
    // Step 6: Emergency Contact
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
  });

  const getStepFields = (step) => {
    switch (step) {
      case 1: return ['newEmail', 'newPassword', 'confirmPassword'];
      case 2: return ['firstName', 'lastName', 'dateOfBirth'];
      case 3: return ['streetAddress', 'suburb', 'postcode'];
      case 4: return ['phone', 'alternatePhone'];
      case 5: return ['preferredShifts', 'availableDays'];
      case 6: return ['emergencyName', 'emergencyRelation', 'emergencyPhone'];
      default: return [];
    }
  };

  const validateAddress = async () => {
    if (!formData.streetAddress || !formData.suburb || !formData.postcode) {
      Alert.alert('Missing Information', 'Please fill in all address fields.');
      return;
    }

    const postcodeNum = parseInt(formData.postcode);
    if (postcodeNum < 3000 || postcodeNum > 3999) {
      Alert.alert('Invalid Postcode', 'Please enter a valid Victorian postcode (3000-3999).');
      return;
    }

    setVerifyingAddress(true);
    try {
      const fullAddress = `${formData.streetAddress}, ${formData.suburb}, VIC ${formData.postcode}, Australia`;
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        setAddressVerified(true);
        Alert.alert('✅ Address Verified', 'Your address has been successfully verified.');
      } else {
        Alert.alert('Address Not Found', 'Could not verify this address. Please check and try again.');
      }
    } catch (error) {
      Alert.alert('Verification Error', 'Could not verify address. Please check your internet connection.');
    } finally {
      setVerifyingAddress(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field.includes('Address') || field === 'suburb' || field === 'postcode') {
      setAddressVerified(false);
    }
  };

  const nextField = () => {
    const stepFields = getStepFields(currentStep);
    if (currentFieldIndex < stepFields.length - 1) {
      const nextIndex = currentFieldIndex + 1;
      setCurrentFieldIndex(nextIndex);
      // Focus next input if it exists
      if (inputRefs.current[nextIndex]) {
        inputRefs.current[nextIndex].focus();
      }
    } else {
      nextStep();
    }
  };

  const nextStep = () => {
    // Validate current step
    if (currentStep === 1) {
      if (!formData.newEmail || !formData.newPassword || !formData.confirmPassword) {
        Alert.alert('Missing Information', 'Please fill in all credential fields.');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match.');
        return;
      }
      if (formData.newPassword.length < 6) {
        Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.firstName || !formData.lastName) {
        Alert.alert('Missing Information', 'Please fill in your name.');
        return;
      }
    } else if (currentStep === 3) {
      if (!addressVerified) {
        Alert.alert('Address Not Verified', 'Please verify your address before continuing.');
        return;
      }
    } else if (currentStep === 4) {
      if (!formData.phone) {
        Alert.alert('Missing Information', 'Please provide your phone number.');
        return;
      }
    } else if (currentStep === 5) {
      if (formData.preferredShifts.length === 0 || formData.availableDays.length === 0) {
        Alert.alert('Missing Information', 'Please select your availability preferences.');
        return;
      }
    }

    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
      setCurrentFieldIndex(0);
      progressWidth.value = withSpring((currentStep + 1) * 16.67);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setCurrentFieldIndex(0);
      progressWidth.value = withSpring((currentStep - 1) * 16.67);
    }
  };

  const goToStep = (stepNumber) => {
    if (stepNumber <= currentStep || stepNumber === currentStep - 1) {
      setCurrentStep(stepNumber);
      setCurrentFieldIndex(0);
      progressWidth.value = withSpring(stepNumber * 16.67);
    }
  };

  const handleSubmit = async () => {
    if (!formData.emergencyName || !formData.emergencyPhone) {
      Alert.alert('Missing Information', 'Please provide emergency contact details.');
      return;
    }

    setLoading(true);
    try {
      // Update Firebase Auth
      if (auth.currentUser) {
        await updateEmail(auth.currentUser, formData.newEmail);
        await updatePassword(auth.currentUser, formData.newPassword);

        // Update Firestore
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          email: formData.newEmail,
          firstName: formData.firstName,
          lastName: formData.lastName,
          name: `${formData.firstName} ${formData.lastName}`,
          dateOfBirth: formData.dateOfBirth,
          address: `${formData.streetAddress}, ${formData.suburb}, VIC ${formData.postcode}`,
          phone: formData.phone,
          alternatePhone: formData.alternatePhone,
          preferredShifts: formData.preferredShifts,
          availableDays: formData.availableDays,
          unavailableDates: formData.unavailableDates,
          emergencyContact: {
            name: formData.emergencyName,
            relation: formData.emergencyRelation,
            phone: formData.emergencyPhone,
          },
          setupCompleted: true,
          updatedAt: new Date(),
        });

        Alert.alert(
          '🎉 Setup Complete!',
          'Welcome to Teddy\'s Cleaning team! Your profile has been set up successfully.',
          [{ text: 'Continue', onPress: () => router.replace('/(employee-tabs)/dashboard') }]
        );
      }
    } catch (error) {
      console.error('Setup error:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleArrayItem = (array, item) => {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const addUnavailableDate = (date) => {
    if (date && !formData.unavailableDates.includes(date)) {
      updateFormData('unavailableDates', [...formData.unavailableDates, date]);
    }
  };

  const removeUnavailableDate = (date) => {
    updateFormData('unavailableDates', formData.unavailableDates.filter(d => d !== date));
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((step, index) => (
        <TouchableOpacity
          key={step.id}
          style={[
            styles.stepIcon,
            currentStep === step.id && styles.stepIconActive,
            currentStep > step.id && styles.stepIconCompleted,
          ]}
          onPress={() => goToStep(step.id)}
        >
          <Ionicons
            name={step.icon}
            size={16}
            color={currentStep >= step.id ? '#fff' : '#6b7280'}
          />
        </TouchableOpacity>
      ))}
    </View>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Account Credentials</Text>
            <Text style={styles.stepSubtitle}>Set up your login details</Text>
            
            <Text style={styles.fieldLabel}>Email Address *</Text>
            <TextInput
              ref={ref => inputRefs.current[0] = ref}
              style={styles.input}
              placeholder="Enter your email"
              value={formData.newEmail}
              onChangeText={(text) => updateFormData('newEmail', text)}
              keyboardType="email-address"
              autoCapitalize="none"
              returnKeyType="next"
              onSubmitEditing={nextField}
            />
            
            <Text style={styles.fieldLabel}>Password *</Text>
            <TextInput
              ref={ref => inputRefs.current[1] = ref}
              style={styles.input}
              placeholder="Create a password"
              value={formData.newPassword}
              onChangeText={(text) => updateFormData('newPassword', text)}
              secureTextEntry
              returnKeyType="next"
              onSubmitEditing={nextField}
            />
            
            <Text style={styles.fieldLabel}>Confirm Password *</Text>
            <TextInput
              ref={ref => inputRefs.current[2] = ref}
              style={styles.input}
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChangeText={(text) => updateFormData('confirmPassword', text)}
              secureTextEntry
              returnKeyType="done"
              onSubmitEditing={nextField}
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Personal Information</Text>
            <Text style={styles.stepSubtitle}>Tell us about yourself</Text>
            
            <Text style={styles.fieldLabel}>First Name *</Text>
            <TextInput
              ref={ref => inputRefs.current[0] = ref}
              style={styles.input}
              placeholder="Enter your first name"
              value={formData.firstName}
              onChangeText={(text) => updateFormData('firstName', text)}
              returnKeyType="next"
              onSubmitEditing={nextField}
            />
            
            <Text style={styles.fieldLabel}>Last Name *</Text>
            <TextInput
              ref={ref => inputRefs.current[1] = ref}
              style={styles.input}
              placeholder="Enter your last name"
              value={formData.lastName}
              onChangeText={(text) => updateFormData('lastName', text)}
              returnKeyType="next"
              onSubmitEditing={nextField}
            />
            
            <Text style={styles.fieldLabel}>Date of Birth *</Text>
            <TouchableOpacity
              style={[styles.input, styles.dateInput]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateText, !formData.dateOfBirth && styles.placeholderText]}>
                {formData.dateOfBirth || 'Select your date of birth'}
              </Text>
              <Ionicons name="calendar" size={20} color="#6b7280" />
            </TouchableOpacity>
            
            {showDatePicker && (
              <DateTimePicker
                value={formData.dateOfBirth ? new Date(formData.dateOfBirth) : new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                maximumDate={new Date()}
                minimumDate={new Date(1950, 0, 1)}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    const formattedDate = selectedDate.toLocaleDateString('en-AU');
                    updateFormData('dateOfBirth', formattedDate);
                  }
                }}
              />
            )}
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Address Details</Text>
            <Text style={styles.stepSubtitle}>Where do you live?</Text>
            
            <Text style={styles.fieldLabel}>Street Address *</Text>
            <TextInput
              ref={ref => inputRefs.current[0] = ref}
              style={styles.input}
              placeholder="123 Main Street"
              value={formData.streetAddress}
              onChangeText={(text) => updateFormData('streetAddress', text)}
              returnKeyType="next"
              onSubmitEditing={nextField}
            />
            
            <Text style={styles.fieldLabel}>Suburb *</Text>
            <TextInput
              ref={ref => inputRefs.current[1] = ref}
              style={styles.input}
              placeholder="Melbourne"
              value={formData.suburb}
              onChangeText={(text) => updateFormData('suburb', text)}
              returnKeyType="next"
              onSubmitEditing={nextField}
            />
            
            <Text style={styles.fieldLabel}>Postcode *</Text>
            <TextInput
              ref={ref => inputRefs.current[2] = ref}
              style={styles.input}
              placeholder="3000"
              value={formData.postcode}
              onChangeText={(text) => updateFormData('postcode', text)}
              keyboardType="numeric"
              maxLength={4}
              returnKeyType="done"
            />
            
            <TouchableOpacity
              style={[styles.verifyButton, addressVerified && styles.verifyButtonSuccess]}
              onPress={validateAddress}
              disabled={verifyingAddress || addressVerified}
            >
              <Text style={[styles.verifyButtonText, addressVerified && styles.verifyButtonTextSuccess]}>
                {verifyingAddress ? 'Verifying...' : addressVerified ? '✅ Address Verified' : 'Verify Address'}
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Contact Information</Text>
            <Text style={styles.stepSubtitle}>How can we reach you?</Text>
            
            <Text style={styles.fieldLabel}>Phone Number *</Text>
            <TextInput
              ref={ref => inputRefs.current[0] = ref}
              style={styles.input}
              placeholder="0412 345 678"
              value={formData.phone}
              onChangeText={(text) => updateFormData('phone', text)}
              keyboardType="phone-pad"
              returnKeyType="next"
              onSubmitEditing={nextField}
            />
            
            <Text style={styles.fieldLabel}>Alternate Phone</Text>
            <TextInput
              ref={ref => inputRefs.current[1] = ref}
              style={styles.input}
              placeholder="Optional alternate number"
              value={formData.alternatePhone}
              onChangeText={(text) => updateFormData('alternatePhone', text)}
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={nextField}
            />
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Availability & Preferences</Text>
            <Text style={styles.stepSubtitle}>When are you available to work?</Text>
            
            <Text style={styles.fieldLabel}>Preferred Shift Hours *</Text>
            <View style={styles.shiftGrid}>
              {SHIFT_HOURS.map((shift) => (
                <TouchableOpacity
                  key={shift.value}
                  style={[
                    styles.shiftButton,
                    formData.preferredShifts.includes(shift.value) && styles.shiftButtonSelected
                  ]}
                  onPress={() => updateFormData('preferredShifts', 
                    toggleArrayItem(formData.preferredShifts, shift.value)
                  )}
                >
                  <Text style={[
                    styles.shiftButtonText,
                    formData.preferredShifts.includes(shift.value) && styles.shiftButtonTextSelected
                  ]}>
                    {shift.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.fieldLabel}>Available Days *</Text>
            <View style={styles.dayGrid}>
              {DAYS_OF_WEEK.map((day) => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayButton,
                    formData.availableDays.includes(day) && styles.dayButtonSelected
                  ]}
                  onPress={() => updateFormData('availableDays', 
                    toggleArrayItem(formData.availableDays, day)
                  )}
                >
                  <Text style={[
                    styles.dayButtonText,
                    formData.availableDays.includes(day) && styles.dayButtonTextSelected
                  ]}>
                    {day.slice(0, 3)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.fieldLabel}>Unavailable Dates</Text>
            <View style={styles.unavailabilitySection}>
              <TextInput
                style={styles.input}
                placeholder="DD/MM/YYYY - Add dates you're unavailable"
                onSubmitEditing={(e) => {
                  addUnavailableDate(e.nativeEvent.text);
                  e.target.clear();
                }}
              />
              {formData.unavailableDates.map((date, index) => (
                <View key={index} style={styles.unavailableDate}>
                  <Text style={styles.unavailableDateText}>{date}</Text>
                  <TouchableOpacity onPress={() => removeUnavailableDate(date)}>
                    <MaterialIcons name="close" size={20} color="#dc3545" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Emergency Contact</Text>
            <Text style={styles.stepSubtitle}>Who should we contact in case of emergency?</Text>
            
            <Text style={styles.fieldLabel}>Contact Name *</Text>
            <TextInput
              ref={ref => inputRefs.current[0] = ref}
              style={styles.input}
              placeholder="Full name"
              value={formData.emergencyName}
              onChangeText={(text) => updateFormData('emergencyName', text)}
              returnKeyType="next"
              onSubmitEditing={nextField}
            />
            
            <Text style={styles.fieldLabel}>Relationship</Text>
            <TextInput
              ref={ref => inputRefs.current[1] = ref}
              style={styles.input}
              placeholder="e.g., Parent, Spouse, Sibling"
              value={formData.emergencyRelation}
              onChangeText={(text) => updateFormData('emergencyRelation', text)}
              returnKeyType="next"
              onSubmitEditing={nextField}
            />
            
            <Text style={styles.fieldLabel}>Phone Number *</Text>
            <TextInput
              ref={ref => inputRefs.current[2] = ref}
              style={styles.input}
              placeholder="0412 345 678"
              value={formData.emergencyPhone}
              onChangeText={(text) => updateFormData('emergencyPhone', text)}
              keyboardType="phone-pad"
              returnKeyType="done"
              onSubmitEditing={nextField}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <Text style={styles.headerTitle}>Employee Setup</Text>
        <Text style={styles.headerSubtitle}>Step {currentStep} of 6</Text>
      </LinearGradient>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
      </View>

      {/* Step Indicator */}
      {renderStepIndicator()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={prevStep}>
            <AntDesign name="arrowleft" size={16} color="#6b7280" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.nextButton, loading && styles.nextButtonDisabled]}
          onPress={nextStep}
          disabled={loading}
        >
          <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.nextButtonGradient}>
            <Text style={styles.nextButtonText}>
              {loading ? 'Processing...' : currentStep === 6 ? 'Complete Setup' : 'Next Step'}
            </Text>
            <AntDesign name="arrowright" size={16} color="#fff" style={styles.nextButtonIcon} />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { paddingHorizontal: 20, paddingVertical: 20, alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 4 },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  progressContainer: { paddingHorizontal: 20, paddingVertical: 16 },
  progressBar: { height: 6, backgroundColor: '#e5e7eb', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#4facfe', borderRadius: 3 },
  stepIndicator: { flexDirection: 'row', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  stepIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#e5e7eb', alignItems: 'center', justifyContent: 'center', marginHorizontal: 8 },
  stepIconActive: { backgroundColor: '#4facfe' },
  stepIconCompleted: { backgroundColor: '#28a745' },
  content: { flex: 1, paddingHorizontal: 20, paddingBottom: 100 },
  stepContent: { paddingBottom: 20 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  stepSubtitle: { fontSize: 16, color: '#6b7280', marginBottom: 24 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 20 },
  verifyButton: { backgroundColor: '#4facfe', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  verifyButtonSuccess: { backgroundColor: '#28a745' },
  verifyButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  verifyButtonTextSuccess: { color: '#fff' },
  shiftGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  shiftButton: { backgroundColor: '#f3f4f6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, margin: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  shiftButtonSelected: { backgroundColor: '#4facfe', borderColor: '#4facfe' },
  shiftButtonText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  shiftButtonTextSelected: { color: '#fff' },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  dayButton: { backgroundColor: '#f3f4f6', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, margin: 4, borderWidth: 1, borderColor: '#e5e7eb', minWidth: 60, alignItems: 'center' },
  dayButtonSelected: { backgroundColor: '#4facfe', borderColor: '#4facfe' },
  dayButtonText: { fontSize: 14, color: '#374151', fontWeight: '500' },
  dayButtonTextSelected: { color: '#fff' },
  unavailabilitySection: { marginTop: 8 },
  unavailableDate: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff3cd', padding: 12, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#ffeaa7' },
  unavailableDateText: { fontSize: 14, color: '#856404' },
  buttonContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  backButtonText: { fontSize: 16, color: '#6b7280', fontWeight: '500', marginLeft: 8 },
  nextButton: { flex: 1, marginLeft: 12, borderRadius: 12, overflow: 'hidden' },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 24 },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  nextButtonIcon: { marginLeft: 8 },
  dateInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  dateText: { fontSize: 16, color: '#1f2937' },
  placeholderText: { color: '#9ca3af' },
});