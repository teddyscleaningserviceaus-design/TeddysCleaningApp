import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export default function CreateEmployee() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'employee'
  });

  // Password validation
  const getPasswordValidation = (password) => {
    return {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /\d/.test(password)
    };
  };

  const passwordValidation = getPasswordValidation(formData.password);
  const isPasswordValid = Object.values(passwordValidation).every(Boolean);

  const createEmployeeAccount = async () => {
    if (!formData.username || !formData.email || !formData.password || !formData.name) {
      Alert.alert('Missing Fields', 'Please fill in all required fields.');
      return;
    }

    setLoading(true);
    try {
      console.log(`Creating employee: ${formData.name} (${formData.username})`);

      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
      const user = userCredential.user;

      // Create users collection entry (required for new auth system)
      await setDoc(doc(db, 'users', user.uid), {
        username: formData.username.toLowerCase(),
        email: formData.email.toLowerCase(),
        displayName: formData.name,
        emailVerified: true, // Auto-verify employees
        userType: formData.role,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      // Create employees collection entry
      await setDoc(doc(db, 'employees', user.uid), {
        username: formData.username.toLowerCase(),
        email: formData.email.toLowerCase(),
        name: formData.name,
        phone: formData.phone || '',
        role: formData.role,
        status: 'active',
        emailVerified: true,
        onboardingCompleted: false, // Let them complete onboarding
        createdAt: new Date(),
        updatedAt: new Date(),
        platform: 'admin-created'
      });

      // If admin role, also create admin collection entry
      if (formData.role === 'admin') {
        await setDoc(doc(db, 'admins', user.uid), {
          username: formData.username.toLowerCase(),
          email: formData.email.toLowerCase(),
          name: formData.name,
          phone: formData.phone,
          role: 'admin',
          permissions: ['all'],
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          platform: 'admin-created'
        });
      }

      Alert.alert(
        'Employee Created! ✅',
        `${formData.name} can now login with:\nUsername: ${formData.username}\nPassword: ${formData.password}`,
        [
          { text: 'Create Another', onPress: () => {
            setFormData({
              username: '',
              email: '',
              password: '',
              name: '',
              phone: '',
              role: 'employee'
            });
          }},
          { text: 'Done', onPress: () => router.back() }
        ]
      );

    } catch (error) {
      console.error('Error creating employee:', error);
      Alert.alert('Error', error.message || 'Failed to create employee account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Employee</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.form}>
          <Text style={styles.sectionTitle}>Employee Details</Text>
          
          <Text style={styles.label}>Full Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.name}
            onChangeText={(text) => setFormData({...formData, name: text})}
            placeholder="John Smith"
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Username *</Text>
          <TextInput
            style={styles.input}
            value={formData.username}
            onChangeText={(text) => setFormData({...formData, username: text.toLowerCase()})}
            placeholder="john_smith"
            placeholderTextColor="#999"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={styles.input}
            value={formData.email}
            onChangeText={(text) => setFormData({...formData, email: text.toLowerCase()})}
            placeholder="john@teddyscleaning.com.au"
            placeholderTextColor="#999"
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={formData.phone}
            onChangeText={(text) => setFormData({...formData, phone: text})}
            placeholder="+61400000000"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Temporary Password *</Text>
          <TextInput
            style={[styles.input, formData.password && !isPasswordValid && styles.inputError]}
            value={formData.password}
            onChangeText={(text) => setFormData({...formData, password: text})}
            placeholder="TempPass123!"
            placeholderTextColor="#999"
            secureTextEntry
          />
          
          {formData.password.length > 0 && (
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

          <Text style={styles.label}>Role</Text>
          <View style={styles.roleContainer}>
            <TouchableOpacity
              style={[styles.roleButton, formData.role === 'employee' && styles.roleButtonActive]}
              onPress={() => setFormData({...formData, role: 'employee'})}
            >
              <Text style={[styles.roleText, formData.role === 'employee' && styles.roleTextActive]}>
                Employee
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.roleButton, formData.role === 'admin' && styles.roleButtonActive]}
              onPress={() => setFormData({...formData, role: 'admin'})}
            >
              <Text style={[styles.roleText, formData.role === 'admin' && styles.roleTextActive]}>
                Admin
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.createButton, (loading || !isPasswordValid) && styles.createButtonDisabled]}
            onPress={createEmployeeAccount}
            disabled={loading || !isPasswordValid}
          >
            <LinearGradient colors={['#28a745', '#20c997']} style={styles.createButtonGradient}>
              <Ionicons name="person-add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>
                {loading ? 'Creating...' : 'Create Employee'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={20} color="#4facfe" />
            <Text style={styles.infoText}>
              Employee will be able to login immediately with their username and password. 
              They should change their password on first login.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerRight: { width: 40 },
  content: { flex: 1, padding: 20 },
  form: { backgroundColor: '#fff', borderRadius: 16, padding: 20, elevation: 2 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  roleContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  roleButtonActive: {
    borderColor: '#4facfe',
    backgroundColor: '#f0f8ff',
  },
  roleText: {
    fontSize: 14,
    color: '#666',
  },
  roleTextActive: {
    color: '#4facfe',
    fontWeight: '600',
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 24,
  },
  createButtonDisabled: { opacity: 0.6 },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#f0f8ff',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'flex-start',
  },
  infoText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  inputError: {
    borderColor: '#dc3545',
    backgroundColor: '#fff5f5',
  },
  passwordRequirements: {
    marginTop: 8,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  requirementText: {
    fontSize: 12,
    color: '#dc3545',
    marginLeft: 6,
  },
  requirementMet: {
    color: '#28a745',
  },
});