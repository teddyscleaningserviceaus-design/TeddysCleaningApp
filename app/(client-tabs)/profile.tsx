import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signOut } from 'firebase/auth';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import ClientHeader from '../../components/ClientHeader';
import { useClient } from '../../contexts/ClientContext';
import notificationService from '../../services/notificationService';


interface ClientData {
  firstName?: string;
  lastName?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  fullAddress?: string;
  suburb?: string;
  postcode?: string;
  state?: string;
  propertyType?: string;
  cleaningFrequency?: string;
  specialRequests?: string;
  emergencyContact?: string;
  emergencyPhone?: string;
}

export default function ClientProfile() {
  const { clientData, refreshClientData, cleanup } = useClient();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<ClientData>({});
  const router = useRouter();

  useEffect(() => {
    setEditData(clientData || {});
  }, [clientData]);

  const handleSave = async () => {
    try {
      const user = auth.currentUser;
      if (user) {
        await updateDoc(doc(db, 'clients', user.uid), {
          ...editData,
          name: `${editData.firstName} ${editData.lastName}`,
          updatedAt: new Date()
        });
        refreshClientData();
        setIsEditing(false);
        Alert.alert('Success', 'Profile updated successfully!');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const handleCancel = () => {
    setEditData(clientData);
    setIsEditing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Cleanup all listeners before logout
              notificationService.cleanup();
              cleanup?.();
              
              await signOut(auth);
              router.replace('/');
            } catch (error) {
              console.error('Logout error:', error);
            }
          }
        }
      ]
    );
  };

  const getDisplayName = () => {
    if (clientData?.firstName && clientData?.lastName) {
      return `${clientData.firstName} ${clientData.lastName}`;
    }
    if (clientData?.firstName) {
      return clientData.firstName;
    }
    if (clientData?.name && !clientData.name.includes('@')) {
      return clientData.name;
    }
    return 'Client';
  };

  const profileSections = [
    {
      title: 'Personal Information',
      icon: 'person-outline',
      fields: [
        { key: 'firstName', label: 'First Name', value: isEditing ? (editData?.firstName || '') : (clientData?.firstName || '') },
        { key: 'lastName', label: 'Last Name', value: isEditing ? (editData?.lastName || '') : (clientData?.lastName || '') },
        { key: 'email', label: 'Email', value: clientData?.email || '', readonly: true },
        { key: 'phone', label: 'Phone', value: isEditing ? (editData?.phone || '') : (clientData?.phone || '') }
      ]
    },
    {
      title: 'Service Address',
      icon: 'home-outline',
      fields: [
        { key: 'address', label: 'Street Address', value: isEditing ? (editData?.address || editData?.fullAddress || '') : (clientData?.address || clientData?.fullAddress || '') },
        { key: 'suburb', label: 'Suburb', value: isEditing ? (editData?.suburb || '') : (clientData?.suburb || '') },
        { key: 'postcode', label: 'Postcode', value: isEditing ? (editData?.postcode || '') : (clientData?.postcode || '') },
        { key: 'state', label: 'State', value: isEditing ? (editData?.state || '') : (clientData?.state || '') }
      ]
    },
    {
      title: 'Service Preferences',
      icon: 'settings-outline',
      fields: [
        { key: 'propertyType', label: 'Property Type', value: isEditing ? (editData?.propertyType || '') : (clientData?.propertyType || '') },
        { key: 'cleaningFrequency', label: 'Cleaning Frequency', value: isEditing ? (editData?.cleaningFrequency || '') : (clientData?.cleaningFrequency || '') },
        { key: 'specialRequests', label: 'Special Requests', value: isEditing ? (editData?.specialRequests || '') : (clientData?.specialRequests || ''), multiline: true }
      ]
    },
    {
      title: 'Emergency Contact',
      icon: 'call-outline',
      fields: [
        { key: 'emergencyContact', label: 'Emergency Contact Name', value: isEditing ? (editData?.emergencyContact || '') : (clientData?.emergencyContact || '') },
        { key: 'emergencyPhone', label: 'Emergency Contact Phone', value: isEditing ? (editData?.emergencyPhone || '') : (clientData?.emergencyPhone || '') }
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      <ClientHeader title="My Profile" subtitle="Manage your account" userName={getDisplayName()} theme="profile" />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {!isEditing && (
          <View style={styles.profileCard}>
            <View style={styles.profileAvatar}>
              <Text style={styles.avatarText}>
                {getDisplayName().split(' ').map(n => n[0]).join('').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.profileName}>{getDisplayName()}</Text>
            <Text style={styles.profileEmail}>{clientData?.email || ''}</Text>
          </View>
        )}
        {profileSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon as any} size={20} color="#4facfe" />
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            <View style={styles.sectionCard}>
              {section.fields.map((field, fieldIndex) => (
                <View key={fieldIndex} style={styles.fieldContainer}>
                  <Text style={styles.fieldLabel}>{field.label}</Text>
                  {isEditing && !field.readonly ? (
                    <TextInput
                      style={[styles.fieldInput, field.multiline && styles.fieldInputMultiline]}
                      value={field.value || ''}
                      onChangeText={(text) => setEditData(prev => ({ ...prev, [field.key]: text }))}
                      placeholder={`Enter ${field.label.toLowerCase()}`}
                      multiline={field.multiline}
                      numberOfLines={field.multiline ? 3 : 1}
                    />
                  ) : (
                    <Text style={[styles.fieldValue, field.readonly && styles.fieldValueReadonly]}>
                      {field.value || 'Not set'}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        ))}

        <View style={styles.actionsSection}>
          {isEditing ? (
            <View style={styles.editActions}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.editButton} onPress={() => setIsEditing(true)}>
              <Ionicons name="create-outline" size={20} color="#fff" />
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.dangerSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#dc3545" />
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  profileCard: { backgroundColor: '#fff', marginHorizontal: 20, marginTop: 20, borderRadius: 16, padding: 20, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  profileAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#4facfe', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  profileName: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  profileEmail: { fontSize: 16, color: '#666' },
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  section: { marginBottom: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginLeft: 8 },
  sectionCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  fieldContainer: { marginBottom: 16 },
  fieldLabel: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 6 },
  fieldValue: { fontSize: 16, color: '#333' },
  fieldValueReadonly: { color: '#999' },
  fieldInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f9f9f9' },
  fieldInputMultiline: { height: 80, textAlignVertical: 'top' },
  actionsSection: { marginBottom: 20 },
  editButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4facfe', paddingVertical: 16, borderRadius: 12 },
  editButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },
  editActions: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelButton: { flex: 1, backgroundColor: '#6c757d', paddingVertical: 16, borderRadius: 12, marginRight: 8, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  saveButton: { flex: 1, backgroundColor: '#28a745', paddingVertical: 16, borderRadius: 12, marginLeft: 8, alignItems: 'center' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  dangerSection: { marginBottom: 20 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', paddingVertical: 16, borderRadius: 12, borderWidth: 1, borderColor: '#dc3545' },
  logoutButtonText: { color: '#dc3545', fontSize: 16, fontWeight: 'bold', marginLeft: 8 }
});