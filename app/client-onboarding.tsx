import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Animated, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import { doc, updateDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

const steps = [
  { id: 1, title: 'Welcome!', subtitle: 'Let\'s get you set up' },
  { id: 2, title: 'Personal Info', subtitle: 'Tell us about yourself' },
  { id: 3, title: 'Contact Details', subtitle: 'How can we reach you?' },
  { id: 4, title: 'Service Address', subtitle: 'Where do you need cleaning?' },
  { id: 5, title: 'Preferences', subtitle: 'Customize your experience' },
  { id: 6, title: 'All Set!', subtitle: 'Welcome to Teddy\'s family' }
];

export default function ClientOnboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: auth.currentUser?.email || '',
    phone: '',
    fullAddress: '',
    propertyType: 'house',
    cleaningFrequency: 'weekly',
    specialRequests: '',
    emergencyContact: '',
    emergencyPhone: '',
    addressVerified: false
  });
  
  const router = useRouter();
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateToNextStep = () => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: -50, duration: 200, useNativeDriver: true }),
    ]).start(() => {
      setCurrentStep(prev => prev + 1);
      slideAnim.setValue(50);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true })
      ]).start();
    });
  };

  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (isValid) {
      if (currentStep < 6) {
        animateToNextStep();
      } else {
        completeOnboarding();
      }
    }
  };

  const formatPhoneNumber = (phone) => {
    // Remove all non-digits
    const cleaned = phone.replace(/\D/g, '');
    
    // Format as Australian phone number
    if (cleaned.length <= 4) {
      return cleaned;
    } else if (cleaned.length <= 7) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    } else if (cleaned.length <= 10) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    } else {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)}`;
    }
  };

  const validatePhone = (phone) => {
    const cleaned = phone.replace(/\D/g, '');
    // Australian mobile: 04xx xxx xxx or landline: 0x xxxx xxxx
    return /^(04\d{8}|0[2-9]\d{8})$/.test(cleaned);
  };

  const validateAddress = async () => {
    if (!formData.fullAddress.trim()) {
      Alert.alert('Missing Address', 'Please enter your complete address first.');
      return false;
    }
    
    try {
      const encodedAddress = encodeURIComponent(formData.fullAddress.trim());
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
        
        // Check if it's in Victoria (optional - can be removed if servicing other states)
        const state = components.find(c => c.types.includes('administrative_area_level_1'))?.short_name;
        if (state && state !== 'VIC') {
          const shouldContinue = await new Promise((resolve) => {
            Alert.alert(
              'Service Area Notice',
              'We primarily service Victoria, Australia. Would you like to continue with this address?',
              [
                { text: 'Change Address', onPress: () => resolve(false) },
                { text: 'Continue Anyway', onPress: () => resolve(true) }
              ]
            );
          });
          if (!shouldContinue) {
            return false;
          }
        }
        
        setFormData(prev => ({
          ...prev,
          fullAddress: result.formatted_address,
          latitude: location.lat,
          longitude: location.lng,
          addressVerified: true
        }));
        return true;
      } else {
        Alert.alert('Address Not Found', 'We couldn\'t verify this address. Please check the spelling and format, or try a more specific address.');
        return false;
      }
    } catch (error) {
      console.error('Address validation error:', error);
      Alert.alert('Verification Error', 'Unable to verify address at the moment. Please try again or continue without verification.');
      return false;
    }
  };

  const validateCurrentStep = async () => {
    switch (currentStep) {
      case 2:
        if (!formData.firstName.trim() || !formData.lastName.trim()) {
          Alert.alert('Required Fields', 'Please enter your first and last name');
          return false;
        }
        break;
      case 3:
        if (!formData.phone.trim()) {
          Alert.alert('Required Fields', 'Please enter your phone number');
          return false;
        }
        if (!validatePhone(formData.phone)) {
          Alert.alert('Invalid Phone Number', 'Your phone number is invalid. Please enter a valid Australian number:\n• Mobile: 04xx xxx xxx\n• Landline: 0x xxxx xxxx');
          return false;
        }
        if (formData.emergencyPhone && !validatePhone(formData.emergencyPhone)) {
          Alert.alert('Invalid Emergency Phone', 'Your emergency contact phone number is invalid. Please enter a valid Australian number:\n• Mobile: 04xx xxx xxx\n• Landline: 0x xxxx xxxx');
          return false;
        }
        break;
      case 4:
        if (!formData.fullAddress.trim()) {
          Alert.alert('Required Fields', 'Please enter your service address');
          return false;
        }
        if (!formData.addressVerified) {
          const shouldContinue = await new Promise((resolve) => {
            Alert.alert(
              'Address Not Verified',
              'We recommend verifying your address to ensure accurate service delivery. Would you like to continue anyway?',
              [
                { text: 'Verify Address', onPress: () => resolve(false) },
                { text: 'Continue Anyway', onPress: () => resolve(true) }
              ]
            );
          });
          if (!shouldContinue) {
            return false;
          }
        }
        break;
    }
    return true;
  };

  const completeOnboarding = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        // Create client document if it doesn't exist
        await setDoc(doc(db, 'clients', user.uid), {
          ...formData,
          name: `${formData.firstName} ${formData.lastName}`,
          onboardingCompleted: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          platform: 'app'
        }, { merge: true });
        
        Alert.alert(
          'Welcome to Teddy\'s! 🎉',
          'Your profile has been set up successfully. You can now book cleaning services!',
          [{ text: 'Get Started', onPress: () => router.replace('/') }]
        );
      }
    } catch (error) {
      console.error('Onboarding completion error:', error);
      Alert.alert('Error', 'Failed to complete setup. Please try again.');
    }
  };

  const renderProgressBar = () => (
    <View style={styles.progressContainer}>
      {steps.map((step, index) => (
        <View key={step.id} style={styles.progressStep}>
          <TouchableOpacity 
            style={[
              styles.progressDot,
              currentStep >= step.id ? styles.progressDotActive : styles.progressDotInactive
            ]}
            onPress={() => {
              if (step.id < currentStep) {
                setCurrentStep(step.id);
              }
            }}
          >
            <Text style={[
              styles.progressDotText,
              currentStep >= step.id ? styles.progressDotTextActive : styles.progressDotTextInactive
            ]}>
              {step.id}
            </Text>
          </TouchableOpacity>
          {index < steps.length - 1 && (
            <View style={[
              styles.progressLine,
              currentStep > step.id ? styles.progressLineActive : styles.progressLineInactive
            ]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStepContent = () => {
    const currentStepData = steps.find(s => s.id === currentStep);
    
    return (
      <Animated.View style={[
        styles.stepContainer,
        { transform: [{ translateX: slideAnim }], opacity: fadeAnim }
      ]}>
        <Text style={styles.stepTitle}>{currentStepData?.title}</Text>
        <Text style={styles.stepSubtitle}>{currentStepData?.subtitle}</Text>
        
        {currentStep === 1 && (
          <View style={styles.welcomeContent}>
            <Text style={styles.welcomeText}>
              Welcome to Teddy's Cleaning! We're excited to have you join our family of satisfied customers.
            </Text>
            <Text style={styles.welcomeText}>
              Let's take a few minutes to set up your profile so we can provide you with the best possible service.
            </Text>
            <View style={styles.featureList}>
              <Text style={styles.featureItem}>🏠 Personalized cleaning plans</Text>
              <Text style={styles.featureItem}>📱 Easy booking and management</Text>
              <Text style={styles.featureItem}>🧪 Science-backed cleaning methods</Text>
              <Text style={styles.featureItem}>🌱 Eco-friendly solutions</Text>
            </View>
          </View>
        )}

        {currentStep === 2 && (
          <View style={styles.formContent}>
            <Text style={styles.fieldLabel}>First Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your first name"
              value={formData.firstName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, firstName: text }))}
            />
            <Text style={styles.fieldLabel}>Last Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your last name"
              value={formData.lastName}
              onChangeText={(text) => setFormData(prev => ({ ...prev, lastName: text }))}
            />
            <Text style={styles.fieldLabel}>Email Address ✅</Text>
            <TextInput
              style={[styles.input, styles.inputDisabled]}
              placeholder="Email verified"
              value={formData.email}
              editable={false}
            />
          </View>
        )}

        {currentStep === 3 && (
          <View style={styles.formContent}>
            <Text style={styles.fieldLabel}>Phone Number *</Text>
            <TextInput
              style={styles.input}
              placeholder="0412 345 678"
              value={formData.phone}
              onChangeText={(text) => {
                const formatted = formatPhoneNumber(text);
                setFormData(prev => ({ ...prev, phone: formatted }));
              }}
              keyboardType="phone-pad"
              maxLength={13}
            />
            <Text style={styles.phoneHint}>Australian mobile or landline number</Text>
            <Text style={styles.fieldLabel}>Emergency Contact Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Emergency contact full name"
              value={formData.emergencyContact}
              onChangeText={(text) => setFormData(prev => ({ ...prev, emergencyContact: text }))}
            />
            <Text style={styles.fieldLabel}>Emergency Contact Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="0412 345 678"
              value={formData.emergencyPhone}
              onChangeText={(text) => {
                const formatted = formatPhoneNumber(text);
                setFormData(prev => ({ ...prev, emergencyPhone: formatted }));
              }}
              keyboardType="phone-pad"
              maxLength={13}
            />
          </View>
        )}

        {currentStep === 4 && (
          <View style={styles.formContent}>
            <Text style={styles.fieldLabel}>Service Address *</Text>
            <TextInput
              style={[styles.input, styles.addressInput]}
              placeholder="Enter your complete address (e.g., 123 Collins Street, Melbourne VIC 3000)"
              value={formData.fullAddress}
              onChangeText={(text) => setFormData(prev => ({ ...prev, fullAddress: text, addressVerified: false }))}
              multiline
              numberOfLines={2}
            />
            <Text style={styles.addressHint}>
              Include street number, street name, suburb, state, and postcode for best results
            </Text>
            
            {formData.addressVerified && (
              <View style={styles.verifiedBadge}>
                <AntDesign name="checkcircle" size={16} color="#10b981" />
                <Text style={styles.verifiedText}>Address Verified ✅</Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={[
                styles.verifyButton,
                formData.addressVerified && styles.verifyButtonVerified
              ]}
              onPress={async () => {
                const isValid = await validateAddress();
                if (isValid) {
                  Alert.alert('Address Verified ✅', 'Your address has been verified successfully!');
                }
              }}
            >
              <AntDesign 
                name={formData.addressVerified ? "checkcircle" : "enviromento"} 
                size={20} 
                color={formData.addressVerified ? "#10b981" : "#fff"} 
              />
              <Text style={[
                styles.verifyButtonText,
                formData.addressVerified && styles.verifyButtonTextVerified
              ]}>
                {formData.addressVerified ? 'Address Verified' : 'Verify Address'}
              </Text>
            </TouchableOpacity>
            
            <Text style={styles.serviceNote}>
              📍 We service all areas - address verification helps us provide accurate quotes and service delivery
            </Text>
          </View>
        )}

        {currentStep === 5 && (
          <View style={styles.formContent}>
            <Text style={styles.sectionTitle}>What service do you need?</Text>
            <View style={styles.serviceOptions}>
              {[
                { id: 'regular', title: 'Regular Cleaning', desc: 'Weekly/fortnightly maintenance' },
                { id: 'deep', title: 'Deep Cleaning', desc: 'One-time thorough clean' },
                { id: 'move', title: 'Move In/Out', desc: 'End of lease cleaning' },
                { id: 'office', title: 'Office Cleaning', desc: 'Commercial spaces' },
                { id: 'waste', title: 'Waste Management', desc: 'Recyclable collection bins' },
                { id: 'other', title: 'Other', desc: 'Custom cleaning requirements' }
              ].map(service => (
                <TouchableOpacity
                  key={service.id}
                  style={[
                    styles.serviceOption,
                    formData.cleaningFrequency === service.id && styles.serviceOptionActive
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, cleaningFrequency: service.id }))}
                >
                  <Text style={[
                    styles.serviceTitle,
                    formData.cleaningFrequency === service.id && styles.serviceTitleActive
                  ]}>
                    {service.title}
                  </Text>
                  <Text style={styles.serviceDesc}>{service.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Property Type</Text>
            <View style={styles.optionGrid}>
              {[
                { id: 'house', label: 'House' },
                { id: 'apartment', label: 'Apartment' },
                { id: 'office', label: 'Office' },
                { id: 'retail', label: 'Retail' },
                { id: 'warehouse', label: 'Warehouse' },
                { id: 'other', label: 'Other' }
              ].map(type => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.optionButton,
                    formData.propertyType === type.id && styles.optionButtonActive
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, propertyType: type.id }))}
                >
                  <Text style={[
                    styles.optionText,
                    formData.propertyType === type.id && styles.optionTextActive
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>Special Requests</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Any special requirements or notes..."
              value={formData.specialRequests}
              onChangeText={(text) => setFormData(prev => ({ ...prev, specialRequests: text }))}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {currentStep === 6 && (
          <View style={styles.completionContent}>
            <Text style={styles.completionEmoji}>🎉</Text>
            <Text style={styles.completionText}>
              Congratulations! Your profile is now complete.
            </Text>
            <Text style={styles.completionSubtext}>
              You're all set to start booking our premium cleaning services. Our team is ready to make your space sparkle!
            </Text>
            <View style={styles.nextSteps}>
              <Text style={styles.nextStepsTitle}>What's Next?</Text>
              <Text style={styles.nextStepsItem}>📅 Book your first cleaning service</Text>
              <Text style={styles.nextStepsItem}>📚 Explore our TED-ucation platform</Text>
              <Text style={styles.nextStepsItem}>💬 Contact support if you need help</Text>
            </View>
          </View>
        )}
      </Animated.View>
    );
  };

  return (
    <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {renderProgressBar()}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {renderStepContent()}
        </ScrollView>
        
        <View style={styles.buttonContainer}>
          {currentStep > 1 && (
            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => setCurrentStep(currentStep - 1)}
            >
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity 
            style={[styles.nextButton, currentStep > 1 && styles.nextButtonSmall]} 
            onPress={handleNext}
          >
            <Text style={styles.nextButtonText}>
              {currentStep === 6 ? 'Complete Setup' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, paddingHorizontal: 20 },
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  progressStep: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  progressDot: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  progressDotActive: { backgroundColor: '#fff' },
  progressDotInactive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  progressDotText: { fontSize: 12, fontWeight: 'bold' },
  progressDotTextActive: { color: '#4facfe' },
  progressDotTextInactive: { color: '#fff' },
  progressLine: { flex: 1, height: 2, marginHorizontal: 5 },
  progressLineActive: { backgroundColor: '#fff' },
  progressLineInactive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  scrollView: { flex: 1 },
  stepContainer: { backgroundColor: 'white', borderRadius: 20, padding: 24, marginBottom: 20, minHeight: 400 },
  stepTitle: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 8 },
  stepSubtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
  welcomeContent: { alignItems: 'center' },
  welcomeText: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 20, lineHeight: 24 },
  featureList: { marginTop: 20 },
  featureItem: { fontSize: 16, color: '#333', marginBottom: 12, textAlign: 'center' },
  formContent: { flex: 1 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, backgroundColor: '#f9f9f9' },
  inputDisabled: { backgroundColor: '#f0f0f0', color: '#999' },
  rowInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  inputHalf: { width: '100%' },
  inputHalfContainer: { width: '48%' },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#333', marginBottom: 6, marginTop: 8 },
  emailNote: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 4 },
  phoneHint: { fontSize: 12, color: '#666', marginTop: -12, marginBottom: 16 },

  serviceOptions: { marginBottom: 20 },
  serviceOption: { backgroundColor: '#f9f9f9', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 2, borderColor: 'transparent' },
  serviceOptionActive: { borderColor: '#4facfe', backgroundColor: '#f0f8ff' },
  serviceTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  serviceTitleActive: { color: '#4facfe' },
  serviceDesc: { fontSize: 14, color: '#666' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 12 },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 20 },
  optionButton: { width: '48%', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 8, alignItems: 'center' },
  optionButtonActive: { backgroundColor: '#4facfe', borderColor: '#4facfe' },
  optionText: { fontSize: 12, color: '#666', textAlign: 'center' },
  optionTextActive: { color: '#fff', fontWeight: 'bold' },
  textArea: { height: 80, textAlignVertical: 'top' },
  completionContent: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  completionEmoji: { fontSize: 60, marginBottom: 20 },
  completionText: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 16 },
  completionSubtext: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30, lineHeight: 24 },
  nextSteps: { alignItems: 'center' },
  nextStepsTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  nextStepsItem: { fontSize: 16, color: '#666', marginBottom: 8 },
  buttonContainer: { 
    paddingVertical: 20,
    flexDirection: 'row',
    gap: 12
  },
  backButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center'
  },
  backButtonText: {
    color: '#6b7280',
    fontSize: 16,
    fontWeight: '600'
  },
  nextButton: { 
    backgroundColor: '#333', 
    paddingVertical: 16, 
    borderRadius: 12, 
    alignItems: 'center',
    flex: 1
  },
  nextButtonSmall: {
    flex: 2
  },
  nextButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  addressInput: {
    minHeight: 60,
    textAlignVertical: 'top'
  },
  addressHint: {
    fontSize: 12,
    color: '#666',
    marginTop: -12,
    marginBottom: 16,
    fontStyle: 'italic'
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 16,
    alignSelf: 'flex-start'
  },
  verifiedText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6
  },
  verifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4facfe',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  verifyButtonVerified: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#10b981'
  },
  verifyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8
  },
  verifyButtonTextVerified: {
    color: '#10b981'
  },
  serviceNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20
  }
});