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
  { id: 1, title: 'Personal Info', icon: 'user' },
  { id: 2, title: 'Contact Details', icon: 'phone' },
  { id: 3, title: 'Work Experience', icon: 'solution1' },
  { id: 4, title: 'Skills & Certifications', icon: 'star' },
  { id: 5, title: 'Availability', icon: 'calendar' },
  { id: 6, title: 'Equipment & Tools', icon: 'tool' },
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
    
    // Step 7: Equipment & Tools
    equipment: [],
    vehicleType: '',
    hasDriversLicense: false,
    
    // Step 8: Emergency Contact
    emergencyName: '',
    emergencyRelation: '',
    emergencyPhone2: '',
  });

  const [addressVerified, setAddressVerified] = useState(false);
  const [verifyingAddress, setVerifyingAddress] = useState(false);

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

  const router = useRouter();
  const progressWidth = useSharedValue(14.29); // 100/7 steps
  const stepScale = useSharedValue(1);

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
      
      await createEmployeeProfile(auth.currentUser.uid, {
        ...formData,
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
            
            <Text style={styles.fieldLabel}>Home Address *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Enter your full address"
              value={formData.address}
              onChangeText={(text) => updateFormData('address', text)}
              multiline
              numberOfLines={3}
            />
          </View>
        );

      case 2:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Contact Details</Text>
            <Text style={styles.stepSubtitle}>How can we reach you?</Text>
            
            <Text style={styles.fieldLabel}>Primary Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 0412 345 678"
              value={formData.phone}
              onChangeText={(text) => updateFormData('phone', text)}
              keyboardType="phone-pad"
            />
            
            <Text style={styles.fieldLabel}>Alternative Phone (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Secondary contact number"
              value={formData.emergencyPhone}
              onChangeText={(text) => updateFormData('emergencyPhone', text)}
              keyboardType="phone-pad"
            />
          </View>
        );

      case 3:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Work Experience</Text>
            <Text style={styles.stepSubtitle}>Tell us about your cleaning experience</Text>
            
            <Text style={styles.fieldLabel}>Years of Experience *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2"
              value={formData.yearsExperience}
              onChangeText={(text) => updateFormData('yearsExperience', text)}
              keyboardType="numeric"
            />
            
            <Text style={styles.fieldLabel}>Previous Experience Details</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe your cleaning background, previous employers, types of cleaning you've done..."
              value={formData.previousExperience}
              onChangeText={(text) => updateFormData('previousExperience', text)}
              multiline
              numberOfLines={4}
            />
            
            <Text style={styles.sectionTitle}>Your Specializations</Text>
            <Text style={styles.sectionSubtitle}>Select all that apply</Text>
            <View style={styles.checkboxContainer}>
              {['Residential', 'Commercial', 'Deep Cleaning', 'Window Cleaning', 'Carpet Cleaning'].map(spec => (
                <TouchableOpacity
                  key={spec}
                  style={[
                    styles.checkbox,
                    formData.specializations.includes(spec) && styles.checkboxSelected
                  ]}
                  onPress={() => updateFormData('specializations', toggleArrayItem(formData.specializations, spec))}
                >
                  <Text style={[
                    styles.checkboxText,
                    formData.specializations.includes(spec) && styles.checkboxTextSelected
                  ]}>
                    {spec}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 4:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Skills & Certifications</Text>
            <Text style={styles.stepSubtitle}>What are your strengths?</Text>
            
            <Text style={styles.sectionTitle}>Your Key Skills</Text>
            <Text style={styles.sectionSubtitle}>Select all that apply</Text>
            <View style={styles.checkboxContainer}>
              {['Time Management', 'Attention to Detail', 'Customer Service', 'Equipment Operation', 'Safety Protocols'].map(skill => (
                <TouchableOpacity
                  key={skill}
                  style={[
                    styles.checkbox,
                    formData.skills.includes(skill) && styles.checkboxSelected
                  ]}
                  onPress={() => updateFormData('skills', toggleArrayItem(formData.skills, skill))}
                >
                  <Text style={[
                    styles.checkboxText,
                    formData.skills.includes(skill) && styles.checkboxTextSelected
                  ]}>
                    {skill}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.fieldLabel}>Certifications & Training</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="List any relevant certifications, training courses, or qualifications..."
              value={formData.certifications}
              onChangeText={(text) => updateFormData('certifications', text)}
              multiline
              numberOfLines={3}
            />
          </View>
        );

      case 5:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Availability</Text>
            <Text style={styles.stepSubtitle}>When can you work?</Text>
            
            <Text style={styles.sectionTitle}>Available Days</Text>
            <View style={styles.checkboxContainer}>
              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.checkbox,
                    formData.workDays.includes(day) && styles.checkboxSelected
                  ]}
                  onPress={() => updateFormData('workDays', toggleArrayItem(formData.workDays, day))}
                >
                  <Text style={[
                    styles.checkboxText,
                    formData.workDays.includes(day) && styles.checkboxTextSelected
                  ]}>
                    {day}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.sectionTitle}>Preferred Shifts</Text>
            <View style={styles.checkboxContainer}>
              {['Morning (6AM-12PM)', 'Afternoon (12PM-6PM)', 'Evening (6PM-10PM)'].map(shift => (
                <TouchableOpacity
                  key={shift}
                  style={[
                    styles.checkbox,
                    formData.preferredShifts.includes(shift) && styles.checkboxSelected
                  ]}
                  onPress={() => updateFormData('preferredShifts', toggleArrayItem(formData.preferredShifts, shift))}
                >
                  <Text style={[
                    styles.checkboxText,
                    formData.preferredShifts.includes(shift) && styles.checkboxTextSelected
                  ]}>
                    {shift}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        );

      case 6:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Equipment & Tools</Text>
            <Text style={styles.stepSubtitle}>What equipment and tools do you have access to?</Text>
            
            <Text style={styles.sectionTitle}>Available Equipment</Text>
            <Text style={styles.sectionSubtitle}>Select all equipment you own or have access to</Text>
            <View style={styles.checkboxContainer}>
              {['Vacuum Cleaner', 'Mop & Bucket', 'Cleaning Supplies', 'Pressure Washer', 'Window Cleaning Kit', 'Carpet Cleaner', 'Steam Cleaner', 'Floor Polisher'].map(equipment => (
                <TouchableOpacity
                  key={equipment}
                  style={[
                    styles.checkbox,
                    formData.equipment.includes(equipment) && styles.checkboxSelected
                  ]}
                  onPress={() => updateFormData('equipment', toggleArrayItem(formData.equipment, equipment))}
                >
                  <Text style={[
                    styles.checkboxText,
                    formData.equipment.includes(equipment) && styles.checkboxTextSelected
                  ]}>
                    {equipment}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={styles.fieldLabel}>Vehicle Type</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Car, Van, Truck, Motorcycle"
              value={formData.vehicleType}
              onChangeText={(text) => updateFormData('vehicleType', text)}
            />
            
            <Text style={styles.sectionTitle}>Driver's License</Text>
            <TouchableOpacity
              style={[
                styles.checkbox,
                formData.hasDriversLicense && styles.checkboxSelected
              ]}
              onPress={() => updateFormData('hasDriversLicense', !formData.hasDriversLicense)}
            >
              <Text style={[
                styles.checkboxText,
                formData.hasDriversLicense && styles.checkboxTextSelected
              ]}>
                I have a valid driver's license
              </Text>
            </TouchableOpacity>
          </View>
        );

      case 7:
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Emergency Contact</Text>
            <Text style={styles.stepSubtitle}>Someone we can contact in case of emergency</Text>
            
            <Text style={styles.fieldLabel}>Emergency Contact Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Full name of emergency contact"
              value={formData.emergencyName}
              onChangeText={(text) => updateFormData('emergencyName', text)}
            />
            
            <Text style={styles.fieldLabel}>Relationship *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Spouse, Parent, Sibling"
              value={formData.emergencyRelation}
              onChangeText={(text) => updateFormData('emergencyRelation', text)}
            />
            
            <Text style={styles.fieldLabel}>Emergency Contact Phone *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 0412 345 678"
              value={formData.emergencyPhone2}
              onChangeText={(text) => updateFormData('emergencyPhone2', text)}
              keyboardType="phone-pad"
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
        <Text style={styles.headerSubtitle}>Step {currentStep} of 7</Text>
      </LinearGradient>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={[styles.progressFill, progressStyle]} />
        </View>
      </View>

      {/* Step Indicators */}
      <View style={styles.stepIndicators}>
        {steps.map((step) => (
          <Animated.View
            key={step.id}
            style={[
              styles.stepIndicator,
              currentStep === step.id && stepStyle,
              currentStep >= step.id && styles.stepIndicatorActive
            ]}
          >
            <AntDesign
              name={step.icon as any}
              size={16}
              color={currentStep >= step.id ? '#fff' : '#6b7280'}
            />
          </Animated.View>
        ))}
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
          style={styles.nextButton}
          onPress={currentStep === 7 ? handleSubmit : nextStep}
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
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4facfe',
    borderRadius: 3,
  },
  stepIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  stepIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicatorActive: {
    backgroundColor: '#4facfe',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  stepContent: {
    paddingBottom: 40,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    marginTop: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    marginBottom: 20,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  checkboxContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  checkbox: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  checkboxSelected: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe',
  },
  checkboxText: {
    fontSize: 14,
    color: '#6b7280',
  },
  checkboxTextSelected: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  backButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  nextButton: {
    flex: 1,
    marginLeft: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  nextButtonIcon: {
    marginLeft: 8,
  },
});