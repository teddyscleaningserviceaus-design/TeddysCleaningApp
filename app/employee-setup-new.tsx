import React, { useState, useRef, useEffect } from 'react';
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
  KeyboardAvoidingView,
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
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { updatePassword } from 'firebase/auth';

const { width } = Dimensions.get('window');

const steps = [
  { id: 1, title: 'Credentials', icon: 'key' },
  { id: 2, title: 'Personal', icon: 'person' },
  { id: 3, title: 'Address', icon: 'location' },
  { id: 4, title: 'Contact', icon: 'call' },
  { id: 5, title: 'Availability', icon: 'time' },
  { id: 6, title: 'Emergency', icon: 'medical' },
];

const SHIFT_HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00`, label: `${hour}:00` };
});

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function EmployeeSetupNew() {
  const [currentStep, setCurrentStep] = useState(1);
  const [addressVerified, setAddressVerified] = useState(false);
  const [verifyingAddress, setVerifyingAddress] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const router = useRouter();
  const progressWidth = useSharedValue(16.67);
  const inputRefs = useRef([]);

  const [formData, setFormData] = useState({
    username: '',
    newPassword: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    fullAddress: '',
    phone: '',
    alternatePhone: '',
    weeklySchedule: {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [],
      Friday: [], Saturday: [], Sunday: []
    },
    unavailableDays: [],
    unavailableDates: [],
    additionalNotes: '',
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone: '',
  });

  const [passwordRequirements, setPasswordRequirements] = useState({
    length: false, uppercase: false, lowercase: false, number: false
  });

  // Load existing user data
  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    if (auth.currentUser) {
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setFormData(prev => ({
            ...prev,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            fullAddress: userData.address || userData.fullAddress || '',
          }));
          
          // If address is already present, mark as verified
          if (userData.address || userData.fullAddress) {
            setAddressVerified(true);
          }
        }
      } catch (error) {
        console.error('Error loading user data:', error);
      }
    }
  };

  const validatePhone = (phone) => {
    const phoneRegex = /^(\+61|0)[2-9]\d{8}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const clearAndEditAddress = () => {
    updateFormData('fullAddress', '');
    setAddressVerified(false);
  };

  const validateAddress = async () => {
    if (!formData.fullAddress.trim()) {
      Alert.alert('Missing Information', 'Please enter your address.');
      return;
    }

    setVerifyingAddress(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(formData.fullAddress + ', Australia')}&limit=1&countrycodes=au`,
        {
          headers: {
            'User-Agent': 'TeddysCleaningApp/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const text = await response.text();
      if (!text || text.startsWith('<')) {
        throw new Error('Invalid response format');
      }
      
      const data = JSON.parse(text);
      
      if (data && data.length > 0) {
        setAddressVerified(true);
        Alert.alert('✅ Address Verified', 'Your address has been successfully verified.');
      } else {
        Alert.alert(
          'Address Verification',
          'Could not automatically verify this address. Is this address correct?',
          [
            { text: 'No, let me fix it', style: 'cancel' },
            { 
              text: 'Yes, continue', 
              onPress: () => {
                setAddressVerified(true);
                Alert.alert('✅ Address Accepted', 'Address has been accepted.');
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Address validation error:', error);
      Alert.alert(
        'Verification Error', 
        'Could not verify address. Would you like to continue anyway?',
        [
          { text: 'Retry', onPress: validateAddress },
          { 
            text: 'Continue Anyway', 
            onPress: () => {
              setAddressVerified(true);
              Alert.alert('✅ Address Accepted', 'Address has been accepted.');
            }
          }
        ]
      );
    } finally {
      setVerifyingAddress(false);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (field === 'fullAddress') {
      setAddressVerified(false);
    }
  };

  const nextStep = () => {
    // Validation
    if (currentStep === 1) {
      if (!formData.username || !formData.newPassword || !formData.confirmPassword) {
        Alert.alert('Missing Information', 'Please fill in all credential fields.');
        return;
      }
      if (formData.newPassword !== formData.confirmPassword) {
        Alert.alert('Password Mismatch', 'Passwords do not match.');
        return;
      }
      if (!Object.values(passwordRequirements).every(Boolean)) {
        Alert.alert('Weak Password', 'Password must meet all requirements.');
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.firstName || !formData.lastName || !formData.dateOfBirth) {
        Alert.alert('Missing Information', 'Please fill in all personal information.');
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.fullAddress.trim()) {
        Alert.alert('Missing Information', 'Please enter your address.');
        return;
      }
      if (!addressVerified) {
        Alert.alert('Address Not Verified', 'Please verify your address before continuing.');
        return;
      }
    } else if (currentStep === 4) {
      if (!formData.phone) {
        Alert.alert('Missing Information', 'Please provide your phone number.');
        return;
      }
      if (!validatePhone(formData.phone)) {
        Alert.alert('Invalid Phone', 'Please enter a valid Australian phone number.');
        return;
      }
    } else if (currentStep === 5) {
      const allDaysConfigured = DAYS_OF_WEEK.every(day => 
        formData.unavailableDays.includes(day) || formData.weeklySchedule[day].length > 0
      );
      if (!allDaysConfigured) {
        Alert.alert('Missing Information', 'Please configure availability for all days (either mark as unavailable or select hours).');
        return;
      }
    }

    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
      progressWidth.value = withSpring((currentStep + 1) * 16.67);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      progressWidth.value = withSpring((currentStep - 1) * 16.67);
    }
  };

  const goToStep = (stepNumber) => {
    if (stepNumber <= currentStep || stepNumber === currentStep - 1) {
      setCurrentStep(stepNumber);
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
      if (auth.currentUser) {
        // Only update password if a new one was provided
        if (formData.newPassword && Object.values(passwordRequirements).every(Boolean)) {
          try {
            await updatePassword(auth.currentUser, formData.newPassword);
          } catch (passwordError) {
            if (passwordError.code === 'auth/requires-recent-login') {
              // Save profile without password change and continue to dashboard
              await saveProfileOnly();
              return;
            }
            throw passwordError;
          }
        }

        await saveProfileOnly();
      }
    } catch (error) {
      console.error('Setup error:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const saveProfileOnly = async () => {
    await updateDoc(doc(db, 'users', auth.currentUser.uid), {
      username: formData.username,
      firstName: formData.firstName,
      lastName: formData.lastName,
      name: `${formData.firstName} ${formData.lastName}`,
      dateOfBirth: formData.dateOfBirth,
      address: formData.fullAddress,
      phone: formData.phone,
      alternatePhone: formData.alternatePhone,
      weeklySchedule: formData.weeklySchedule,
      unavailableDays: formData.unavailableDays,
      unavailableDates: formData.unavailableDates,
      additionalNotes: formData.additionalNotes,
      emergencyContact: {
        name: formData.emergencyName,
        relation: formData.emergencyRelation,
        phone: formData.emergencyPhone,
      },
      setupCompleted: true,
      onboardingCompleted: true,
      profileCompleted: true,
      updatedAt: new Date(),
    });

    Alert.alert(
      '🎉 Setup Complete!',
      'Welcome to Teddy\'s Cleaning team!',
      [{ text: 'Continue', onPress: () => router.replace('/(employee-tabs)/dashboard') }]
    );
  };

  const toggleDayUnavailable = (day) => {
    const unavailable = formData.unavailableDays.includes(day)
      ? formData.unavailableDays.filter(d => d !== day)
      : [...formData.unavailableDays, day];
    
    updateFormData('unavailableDays', unavailable);
    
    // Clear hours if marking as unavailable
    if (unavailable.includes(day)) {
      updateFormData('weeklySchedule', {
        ...formData.weeklySchedule,
        [day]: []
      });
    }
  };

  const toggleHourForDay = (day, hour) => {
    if (formData.unavailableDays.includes(day)) return;
    
    const daySchedule = formData.weeklySchedule[day];
    const newSchedule = daySchedule.includes(hour)
      ? daySchedule.filter(h => h !== hour)
      : [...daySchedule, hour].sort();
    
    updateFormData('weeklySchedule', {
      ...formData.weeklySchedule,
      [day]: newSchedule
    });
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {steps.map((step) => (
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
            <Text style={styles.stepSubtitle}>Choose your username and password</Text>
            
            <Text style={styles.fieldLabel}>Username *</Text>
            <TextInput
              style={styles.input}
              placeholder="Choose a unique username"
              value={formData.username}
              onChangeText={(text) => updateFormData('username', text)}
              autoCapitalize="none"
            />
            
            <Text style={styles.fieldLabel}>New Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Create a secure password"
                value={formData.newPassword}
                onChangeText={(text) => {
                  updateFormData('newPassword', text);
                  const reqs = {
                    length: text.length >= 8,
                    uppercase: /[A-Z]/.test(text),
                    lowercase: /[a-z]/.test(text),
                    number: /\d/.test(text)
                  };
                  setPasswordRequirements(reqs);
                }}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            
            {formData.newPassword.length > 0 && (
              <View style={styles.passwordRequirements}>
                <Text style={styles.requirementsTitle}>Password Requirements:</Text>
                {[
                  { key: 'length', text: 'At least 8 characters' },
                  { key: 'uppercase', text: 'One uppercase letter' },
                  { key: 'lowercase', text: 'One lowercase letter' },
                  { key: 'number', text: 'One number' }
                ].map(req => (
                  <View key={req.key} style={styles.requirementItem}>
                    <Ionicons 
                      name={passwordRequirements[req.key] ? "checkmark-circle" : "close-circle"} 
                      size={16} 
                      color={passwordRequirements[req.key] ? "#10b981" : "#ef4444"} 
                    />
                    <Text style={[styles.requirementText, passwordRequirements[req.key] && styles.requirementMet]}>
                      {req.text}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            <Text style={styles.fieldLabel}>Confirm Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Confirm your password"
                value={formData.confirmPassword}
                onChangeText={(text) => updateFormData('confirmPassword', text)}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.passwordToggle}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? "eye-off" : "eye"}
                  size={20}
                  color="#6b7280"
                />
              </TouchableOpacity>
            </View>
            
            {formData.confirmPassword.length > 0 && (
              <View style={styles.passwordMatch}>
                <Ionicons 
                  name={formData.newPassword === formData.confirmPassword ? "checkmark-circle" : "close-circle"} 
                  size={16} 
                  color={formData.newPassword === formData.confirmPassword ? "#10b981" : "#ef4444"} 
                />
                <Text style={[styles.requirementText, formData.newPassword === formData.confirmPassword && styles.requirementMet]}>
                  Passwords match
                </Text>
              </View>
            )}
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Personal Information</Text>
            <Text style={styles.stepSubtitle}>Verify your details</Text>
            
            <Text style={styles.fieldLabel}>First Name *</Text>
            <View style={styles.inputWithButton}>
              <TextInput
                style={[styles.input, styles.inputWithEdit]}
                placeholder="Enter your first name"
                value={formData.firstName}
                onChangeText={(text) => updateFormData('firstName', text)}
              />
              <TouchableOpacity style={styles.editButton}>
                <Ionicons name="pencil" size={16} color="#4facfe" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.fieldLabel}>Last Name *</Text>
            <View style={styles.inputWithButton}>
              <TextInput
                style={[styles.input, styles.inputWithEdit]}
                placeholder="Enter your last name"
                value={formData.lastName}
                onChangeText={(text) => updateFormData('lastName', text)}
              />
              <TouchableOpacity style={styles.editButton}>
                <Ionicons name="pencil" size={16} color="#4facfe" />
              </TouchableOpacity>
            </View>
            
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
                display="default"
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
            <Text style={styles.stepSubtitle}>Enter your complete address</Text>
            
            <Text style={styles.fieldLabel}>Full Address *</Text>
            <TextInput
              style={[styles.input, styles.addressInput]}
              placeholder="123 Main Street, Melbourne VIC 3000"
              value={formData.fullAddress}
              onChangeText={(text) => updateFormData('fullAddress', text)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            
            <View style={styles.addressButtonContainer}>
              {addressVerified ? (
                <TouchableOpacity
                  style={styles.editAddressButton}
                  onPress={clearAndEditAddress}
                >
                  <Ionicons name="pencil" size={16} color="#4facfe" />
                  <Text style={styles.editAddressText}>Edit Address</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.verifyButton}
                  onPress={validateAddress}
                  disabled={verifyingAddress}
                >
                  <Text style={styles.verifyButtonText}>
                    {verifyingAddress ? 'Verifying...' : 'Verify Address'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Contact Information</Text>
            <Text style={styles.stepSubtitle}>How can we reach you?</Text>
            
            <Text style={styles.fieldLabel}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="0412 345 678"
              value={formData.phone}
              onChangeText={(text) => updateFormData('phone', text)}
              keyboardType="phone-pad"
            />
            
            <Text style={styles.fieldLabel}>Alternate Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional alternate number"
              value={formData.alternatePhone}
              onChangeText={(text) => updateFormData('alternatePhone', text)}
              keyboardType="phone-pad"
            />
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Weekly Availability</Text>
            <Text style={styles.stepSubtitle}>Set your schedule for each day</Text>
            
            <View style={styles.daySelector}>
              {DAYS_OF_WEEK.map((day) => {
                const isUnavailable = formData.unavailableDays.includes(day);
                const hasHours = formData.weeklySchedule[day]?.length > 0;
                const isConfigured = isUnavailable || hasHours;
                
                return (
                  <TouchableOpacity
                    key={day}
                    style={[
                      styles.dayTab, 
                      selectedDay === day && styles.dayTabActive,
                      isUnavailable && styles.dayTabUnavailable,
                      hasHours && styles.dayTabAvailable,
                      !isConfigured && styles.dayTabUnconfigured
                    ]}
                    onPress={() => setSelectedDay(day)}
                  >
                    <Text style={[
                      styles.dayTabText, 
                      selectedDay === day && styles.dayTabTextActive,
                      isUnavailable && styles.dayTabTextUnavailable,
                      hasHours && styles.dayTabTextAvailable
                    ]}>
                      {day.slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            <View style={styles.dayControls}>
              <TouchableOpacity
                style={[
                  styles.unavailableButton,
                  formData.unavailableDays.includes(selectedDay) && styles.unavailableButtonActive
                ]}
                onPress={() => toggleDayUnavailable(selectedDay)}
              >
                <Text style={[
                  styles.unavailableButtonText,
                  formData.unavailableDays.includes(selectedDay) && styles.unavailableButtonTextActive
                ]}>
                  {formData.unavailableDays.includes(selectedDay) ? 'Mark Available' : 'Mark Unavailable'}
                </Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.fieldLabel}>{selectedDay} Hours</Text>
            <ScrollView style={styles.hoursGrid} showsVerticalScrollIndicator={false}>
              <View style={styles.hoursContainer}>
                {SHIFT_HOURS.map((hour) => (
                  <TouchableOpacity
                    key={hour.value}
                    style={[
                      styles.hourButton,
                      formData.weeklySchedule[selectedDay]?.includes(hour.value) && styles.hourButtonSelected,
                      formData.unavailableDays.includes(selectedDay) && styles.hourButtonDisabled
                    ]}
                    onPress={() => toggleHourForDay(selectedDay, hour.value)}
                    disabled={formData.unavailableDays.includes(selectedDay)}
                  >
                    <Text style={[
                      styles.hourButtonText,
                      formData.weeklySchedule[selectedDay]?.includes(hour.value) && styles.hourButtonTextSelected,
                      formData.unavailableDays.includes(selectedDay) && styles.hourButtonTextDisabled
                    ]}>
                      {hour.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            
            <Text style={styles.fieldLabel}>Additional Notes</Text>
            <TextInput
              style={[styles.input, styles.notesInput]}
              placeholder="Any special availability notes..."
              value={formData.additionalNotes}
              onChangeText={(text) => updateFormData('additionalNotes', text)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Emergency Contact</Text>
            <Text style={styles.stepSubtitle}>Who should we contact in case of emergency?</Text>
            
            <Text style={styles.fieldLabel}>Contact Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name"
              value={formData.emergencyName}
              onChangeText={(text) => updateFormData('emergencyName', text)}
            />
            
            <Text style={styles.fieldLabel}>Relationship</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Parent, Spouse, Sibling"
              value={formData.emergencyRelation}
              onChangeText={(text) => updateFormData('emergencyRelation', text)}
            />
            
            <Text style={styles.fieldLabel}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="0412 345 678"
              value={formData.emergencyPhone}
              onChangeText={(text) => updateFormData('emergencyPhone', text)}
              keyboardType="phone-pad"
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <Text style={styles.headerTitle}>Employee Setup</Text>
        <Text style={styles.headerSubtitle}>Step {currentStep} of 6</Text>
      </LinearGradient>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
      </View>

      {renderStepIndicator()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

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
    </KeyboardAvoidingView>
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
  content: { flex: 1, paddingHorizontal: 20, marginBottom: 100 },
  stepContent: { paddingBottom: 20 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  stepSubtitle: { fontSize: 16, color: '#6b7280', marginBottom: 24 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 20, color: '#1f2937' },
  inputWithButton: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  inputWithEdit: { flex: 1, marginBottom: 0, marginRight: 12 },
  editButton: { padding: 12, backgroundColor: '#f0f9ff', borderRadius: 8, borderWidth: 1, borderColor: '#4facfe' },
  dateInput: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16 },
  dateText: { fontSize: 16, color: '#1f2937' },
  placeholderText: { color: '#9ca3af' },
  addressInput: { height: 80, textAlignVertical: 'top' },
  notesInput: { height: 80, textAlignVertical: 'top' },
  verifyButton: { backgroundColor: '#4facfe', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  verifyButtonSuccess: { backgroundColor: '#28a745' },
  verifyButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  verifyButtonTextSuccess: { color: '#fff' },
  passwordRequirements: { backgroundColor: '#f8fafc', borderRadius: 8, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e2e8f0' },
  requirementsTitle: { fontSize: 12, fontWeight: '600', color: '#374151', marginBottom: 8 },
  requirementItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  requirementText: { fontSize: 12, color: '#6b7280', marginLeft: 8 },
  requirementMet: { color: '#10b981' },
  passwordContainer: { position: 'relative', marginBottom: 20 },
  passwordInput: { marginBottom: 0, paddingRight: 50 },
  passwordToggle: { position: 'absolute', right: 16, top: 16, padding: 4 },
  passwordMatch: { flexDirection: 'row', alignItems: 'center', marginTop: -16, marginBottom: 16 },
  daySelector: { flexDirection: 'row', backgroundColor: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 20 },
  dayTab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8 },
  dayTabActive: { backgroundColor: '#4facfe' },
  dayTabText: { fontSize: 12, fontWeight: '600', color: '#6b7280' },
  dayTabTextActive: { color: '#fff' },
  hoursGrid: { maxHeight: 200, marginBottom: 20 },
  hoursContainer: { flexDirection: 'row', flexWrap: 'wrap' },
  hourButton: { backgroundColor: '#f3f4f6', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, margin: 4, borderWidth: 1, borderColor: '#e5e7eb' },
  hourButtonSelected: { backgroundColor: '#4facfe', borderColor: '#4facfe' },
  hourButtonText: { fontSize: 12, color: '#374151', fontWeight: '500' },
  hourButtonTextSelected: { color: '#fff' },
  hourButtonDisabled: { backgroundColor: '#f3f4f6', opacity: 0.5 },
  hourButtonTextDisabled: { color: '#9ca3af' },
  addressButtonContainer: { marginTop: 8 },
  editAddressButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f9ff', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, borderWidth: 1, borderColor: '#4facfe' },
  editAddressText: { color: '#4facfe', fontSize: 14, fontWeight: '600', marginLeft: 8 },
  dayControls: { marginBottom: 16 },
  unavailableButton: { backgroundColor: '#f3f4f6', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb' },
  unavailableButtonActive: { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
  unavailableButtonText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  unavailableButtonTextActive: { color: '#ef4444' },
  dayTabUnavailable: { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
  dayTabAvailable: { backgroundColor: '#dcfce7', borderColor: '#22c55e' },
  dayTabUnconfigured: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
  dayTabTextUnavailable: { color: '#ef4444' },
  dayTabTextAvailable: { color: '#22c55e' },
  buttonContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  backButton: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  backButtonText: { fontSize: 16, color: '#6b7280', fontWeight: '500', marginLeft: 8 },
  nextButton: { flex: 1, marginLeft: 12, borderRadius: 12, overflow: 'hidden' },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 24 },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  nextButtonIcon: { marginLeft: 8 },
});