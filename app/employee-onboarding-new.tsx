import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { auth } from '../config/firebase';
import { createEmployeeProfile } from '../utils/roleUtils';
import { updatePassword } from 'firebase/auth';

const steps = [
  { id: 1, title: 'Password Setup', icon: 'lock' },
  { id: 2, title: 'Personal Info', icon: 'user' },
  { id: 3, title: 'Contact Details', icon: 'phone' },
  { id: 4, title: 'Work Experience', icon: 'solution1' },
  { id: 5, title: 'Skills & Certifications', icon: 'star' },
  { id: 6, title: 'Availability', icon: 'calendar' },
  { id: 7, title: 'Emergency Contact', icon: 'contacts' },
];

export default function EmployeeOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    // Step 1: Password Setup
    newPassword: '',
    confirmPassword: '',
    
    // Step 2: Personal Info
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    address: '',
    suburb: '',
    postcode: '',
    
    // Step 3: Contact Details
    phone: '',
    emergencyPhone: '',
    
    // Step 4: Work Experience
    previousExperience: '',
    yearsExperience: '',
    specializations: [],
    
    // Step 5: Skills & Certifications
    skills: [],
    certifications: '',
    
    // Step 6: Availability
    workDays: [],
    preferredShifts: [],
    
    // Step 7: Emergency Contact
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone2: '',
  });

  const [addressVerified, setAddressVerified] = useState(false);
  const [verifyingAddress, setVerifyingAddress] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const router = useRouter();
  const progressWidth = useSharedValue(14.29); // 100/7 steps
  const stepScale = useSharedValue(1);

  // Password validation
  const getPasswordValidation = (password) => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password)
    };
  };

  const passwordValidation = getPasswordValidation(formData.newPassword);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);
  const passwordsMatch = formData.newPassword === formData.confirmPassword;

  // Address validation
  const validateAddress = async () => {
    if (!formData.address || !formData.suburb || !formData.postcode) {
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
      const fullAddress = `${formData.address}, ${formData.suburb}, VIC ${formData.postcode}, Australia`;
      
      // Try OpenStreetMap Nominatim with better parameters
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}&limit=1&countrycodes=au&addressdetails=1`
      );
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        // Validate it's actually in Victoria/Australia
        const isValidLocation = result.display_name.toLowerCase().includes('victoria') || 
                               result.display_name.toLowerCase().includes('vic') ||
                               (result.address && result.address.state && result.address.state.toLowerCase().includes('vic'));
        
        if (isValidLocation) {
          setAddressVerified(true);
          Alert.alert('✅ Address Verified', 'Your address has been successfully verified.');
        } else {
          Alert.alert('Invalid Location', 'Please enter a valid Victorian address.');
        }
      } else {
        // Fallback option for addresses that can't be found
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
        'Could not verify address due to network issues. Would you like to continue anyway?',
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

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < 7) {
      setCurrentStep(currentStep + 1);
      progressWidth.value = withSpring((currentStep + 1) * 14.29);
      stepScale.value = withSpring(1.1, {}, () => {
        stepScale.value = withSpring(1);
      });
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      progressWidth.value = withSpring((currentStep - 1) * 14.29);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!auth.currentUser) return;
      
      // Update password first
      if (formData.newPassword && isPasswordValid && passwordsMatch) {
        await updatePassword(auth.currentUser, formData.newPassword);
      }
      
      await createEmployeeProfile(auth.currentUser.uid, {
        ...formData,
        fullAddress: `${formData.address}, ${formData.suburb}, VIC ${formData.postcode}`,
        onboardingCompleted: true,
        completedAt: new Date(),
      });

      Alert.alert(
        '🎉 Welcome to the Team!',
        'Your profile has been set up successfully. Welcome to Teddy\'s Cleaning!',
        [{ text: 'Get Started', onPress: () => router.replace('/(employee-tabs)/dashboard') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    }
  };

  const toggleArrayItem = (array: string[], item: string) => {
    return array.includes(item) 
      ? array.filter(i => i !== item)
      : [...array, item];
  };

  const progressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const stepStyle = useAnimatedStyle(() => ({
    transform: [{ scale: stepScale.value }],
  }));

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Set Your Password</Text>
            <Text style={styles.stepSubtitle}>Create a secure password for your account</Text>
            
            <Text style={styles.fieldLabel}>New Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, formData.newPassword && !isPasswordValid && styles.inputError]}
                placeholder="Enter your new password"
                value={formData.newPassword}
                onChangeText={(text) => updateFormData('newPassword', text)}
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
                <View style={styles.requirementRow}>
                  <Ionicons 
                    name={passwordValidation.length ? "checkmark-circle" : "close-circle"} 
                    size={16} 
                    color={passwordValidation.length ? "#28a745" : "#dc3545"} 
                  />
                  <Text style={[styles.requirementText, passwordValidation.length && styles.requirementMet]}>
                    At least 8 characters
                  </Text>
                </View>
                <View style={styles.requirementRow}>
                  <Ionicons 
                    name={passwordValidation.uppercase ? "checkmark-circle" : "close-circle"} 
                    size={16} 
                    color={passwordValidation.uppercase ? "#28a745" : "#dc3545"} 
                  />
                  <Text style={[styles.requirementText, passwordValidation.uppercase && styles.requirementMet]}>
                    One uppercase letter
                  </Text>
                </View>
                <View style={styles.requirementRow}>
                  <Ionicons 
                    name={passwordValidation.lowercase ? "checkmark-circle" : "close-circle"} 
                    size={16} 
                    color={passwordValidation.lowercase ? "#28a745" : "#dc3545"} 
                  />
                  <Text style={[styles.requirementText, passwordValidation.lowercase && styles.requirementMet]}>
                    One lowercase letter
                  </Text>
                </View>
                <View style={styles.requirementRow}>
                  <Ionicons 
                    name={passwordValidation.number ? "checkmark-circle" : "close-circle"} 
                    size={16} 
                    color={passwordValidation.number ? "#28a745" : "#dc3545"} 
                  />
                  <Text style={[styles.requirementText, passwordValidation.number && styles.requirementMet]}>
                    One number
                  </Text>
                </View>
              </View>
            )}
            
            <Text style={styles.fieldLabel}>Confirm Password *</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput, formData.confirmPassword && !passwordsMatch && styles.inputError]}
                placeholder="Confirm your new password"
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
              <View style={styles.requirementRow}>
                <Ionicons 
                  name={passwordsMatch ? "checkmark-circle" : "close-circle"} 
                  size={16} 
                  color={passwordsMatch ? "#28a745" : "#dc3545"} 
                />
                <Text style={[styles.requirementText, passwordsMatch && styles.requirementMet]}>
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
            <Text style={styles.stepSubtitle}>Let's get to know you better</Text>
            
            <Text style={styles.fieldLabel}>First Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your first name"
              value={formData.firstName}
              onChangeText={(text) => updateFormData('firstName', text)}
            />
            
            <Text style={styles.fieldLabel}>Last Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your last name"
              value={formData.lastName}
              onChangeText={(text) => updateFormData('lastName', text)}
            />
            
            <Text style={styles.fieldLabel}>Date of Birth</Text>
            <TextInput
              style={styles.input}
              placeholder="DD/MM/YYYY"
              value={formData.dateOfBirth}
              onChangeText={(text) => updateFormData('dateOfBirth', text)}
            />
            
            <Text style={styles.fieldLabel}>Street Address *</Text>
            <TextInput
              style={styles.input}
              placeholder="123 Main Street"
              value={formData.address}
              onChangeText={(text) => {
                updateFormData('address', text);
                setAddressVerified(false);
              }}
            />
            
            <Text style={styles.fieldLabel}>Suburb *</Text>
            <TextInput
              style={styles.input}
              placeholder="Melbourne"
              value={formData.suburb}
              onChangeText={(text) => {
                updateFormData('suburb', text);
                setAddressVerified(false);
              }}
            />
            
            <Text style={styles.fieldLabel}>Postcode *</Text>
            <TextInput
              style={styles.input}
              placeholder="3000"
              value={formData.postcode}
              onChangeText={(text) => {
                updateFormData('postcode', text);
                setAddressVerified(false);
              }}
              keyboardType="numeric"
              maxLength={4}
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

      // Continue with other cases...
      default:
        return <Text>Step {currentStep} content</Text>;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <Text style={styles.headerTitle}>Employee Setup</Text>
        <Text style={styles.headerSubtitle}>Step {currentStep} of 7</Text>
      </LinearGradient>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderStep()}
      </ScrollView>

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        {currentStep > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={prevStep}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        
        <TouchableOpacity
          style={[styles.nextButton, 
            (currentStep === 1 && (!isPasswordValid || !passwordsMatch)) ||
            (currentStep === 2 && !addressVerified) ? styles.nextButtonDisabled : null
          ]}
          onPress={currentStep === 7 ? handleSubmit : nextStep}
          disabled={
            (currentStep === 1 && (!isPasswordValid || !passwordsMatch)) ||
            (currentStep === 2 && !addressVerified)
          }
        >
          <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.nextButtonGradient}>
            <Text style={styles.nextButtonText}>
              {currentStep === 7 ? 'Complete Setup' : 'Next'}
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
  content: { flex: 1, paddingHorizontal: 20 },
  stepContent: { paddingBottom: 40 },
  stepTitle: { fontSize: 22, fontWeight: '700', color: '#1f2937', marginBottom: 8 },
  stepSubtitle: { fontSize: 16, color: '#6b7280', marginBottom: 24 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 4 },
  input: { backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16, borderWidth: 1, borderColor: '#e5e7eb', marginBottom: 20, color: '#1f2937' },
  inputError: { borderColor: '#dc3545', backgroundColor: '#fff5f5' },
  passwordRequirements: { marginTop: 8, marginBottom: 16, padding: 12, backgroundColor: '#f8f9fa', borderRadius: 8, borderWidth: 1, borderColor: '#e9ecef' },
  requirementRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  requirementText: { fontSize: 12, color: '#dc3545', marginLeft: 6 },
  requirementMet: { color: '#28a745' },
  verifyButton: { backgroundColor: '#4facfe', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  verifyButtonSuccess: { backgroundColor: '#28a745' },
  verifyButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  verifyButtonTextSuccess: { color: '#fff' },
  buttonContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 20, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  backButton: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  backButtonText: { fontSize: 16, color: '#6b7280', fontWeight: '500' },
  nextButton: { flex: 1, marginLeft: 12, borderRadius: 12, overflow: 'hidden' },
  nextButtonDisabled: { opacity: 0.5 },
  nextButtonGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 24 },
  nextButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  nextButtonIcon: { marginLeft: 8 },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 50 },
  passwordToggle: { position: 'absolute', right: 16, top: 16, padding: 4 },
});