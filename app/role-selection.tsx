import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, UserRole } from '../contexts/AuthContext';

export default function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<UserRole>('employee');
  const { setUserRole } = useAuth();
  const router = useRouter();

  const handleRoleSelection = async () => {
    try {
      await setUserRole(selectedRole);
      
      // Route based on role
      if (selectedRole === 'admin') {
        router.replace('/(admin-tabs)/dashboard');
      } else if (selectedRole === 'client') {
        router.replace('/(client-tabs)/bookings');
      } else {
        router.replace('/(tabs)/dashboard');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to set user role');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <Text style={styles.title}>Select Your Role</Text>
        <Text style={styles.subtitle}>Choose how you'll use the app</Text>
      </LinearGradient>

      <View style={styles.content}>
        <TouchableOpacity
          style={[styles.roleCard, selectedRole === 'employee' && styles.selectedCard]}
          onPress={() => setSelectedRole('employee')}
        >
          <AntDesign name="user" size={48} color={selectedRole === 'employee' ? '#4facfe' : '#6b7280'} />
          <Text style={[styles.roleTitle, selectedRole === 'employee' && styles.selectedText]}>
            Employee
          </Text>
          <Text style={styles.roleDescription}>
            Access job management, schedules, and team features
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleCard, selectedRole === 'client' && styles.selectedCard]}
          onPress={() => setSelectedRole('client')}
        >
          <AntDesign name="home" size={48} color={selectedRole === 'client' ? '#4facfe' : '#6b7280'} />
          <Text style={[styles.roleTitle, selectedRole === 'client' && styles.selectedText]}>
            Client
          </Text>
          <Text style={styles.roleDescription}>
            Book services, view appointments, and manage invoices
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleCard, selectedRole === 'admin' && styles.selectedCard]}
          onPress={() => setSelectedRole('admin')}
        >
          <AntDesign name="setting" size={48} color={selectedRole === 'admin' ? '#4facfe' : '#6b7280'} />
          <Text style={[styles.roleTitle, selectedRole === 'admin' && styles.selectedText]}>
            Administrator
          </Text>
          <Text style={styles.roleDescription}>
            Full system access, user management, and analytics
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.continueButton} onPress={handleRoleSelection}>
          <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.continueGradient}>
            <Text style={styles.continueText}>Continue</Text>
            <AntDesign name="arrowright" size={20} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 40, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff', marginBottom: 8 },
  subtitle: { fontSize: 16, color: 'rgba(255,255,255,0.9)' },
  content: { flex: 1, padding: 20 },
  roleCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    marginBottom: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedCard: { borderColor: '#4facfe' },
  roleTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937', marginTop: 16, marginBottom: 8 },
  selectedText: { color: '#4facfe' },
  roleDescription: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  continueButton: { marginTop: 32, borderRadius: 12, overflow: 'hidden' },
  continueGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  continueText: { fontSize: 18, fontWeight: 'bold', color: '#fff', marginRight: 8 },
});