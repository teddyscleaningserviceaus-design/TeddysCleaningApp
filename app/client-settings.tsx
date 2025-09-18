import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import settingsService from '../services/settingsService';

interface SettingsData {
  notifications: {
    bookingReminders: boolean;
    promotions: boolean;
    serviceUpdates: boolean;
    emergencyAlerts: boolean;
  };
  preferences: {
    autoBooking: boolean;
    ecoMode: boolean;
    dataUsage: 'low' | 'medium' | 'high';
    language: 'en' | 'es' | 'fr';
  };
  privacy: {
    shareData: boolean;
    locationTracking: boolean;
    analytics: boolean;
  };
}

export default function ClientSettings() {
  const router = useRouter();
  const [settings, setSettings] = useState<SettingsData>({
    notifications: {
      bookingReminders: true,
      promotions: false,
      serviceUpdates: true,
      emergencyAlerts: true,
    },
    preferences: {
      autoBooking: false,
      ecoMode: true,
      dataUsage: 'medium',
      language: 'en',
    },
    privacy: {
      shareData: false,
      locationTracking: true,
      analytics: false,
    },
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Try to load from local storage first
      const localSettings = await AsyncStorage.getItem('clientSettings');
      if (localSettings) {
        setSettings(JSON.parse(localSettings));
      }
      
      // Then try to load from Firestore
      const user = auth.currentUser;
      if (user) {
        try {
          const clientDoc = await getDoc(doc(db, 'clients', user.uid));
          if (clientDoc.exists()) {
            const data = clientDoc.data();
            if (data.settings) {
              setSettings(data.settings as SettingsData);
              await AsyncStorage.setItem('clientSettings', JSON.stringify(data.settings));
            }
          }
        } catch (firestoreError) {
          console.log('Using local settings due to Firestore permissions');
        }
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings: SettingsData) => {
    setLoading(true);
    try {
      // Always save locally first
      await AsyncStorage.setItem('clientSettings', JSON.stringify(newSettings));
      setSettings(newSettings);
      
      // Try to save to Firestore
      const user = auth.currentUser;
      if (user) {
        try {
          await updateDoc(doc(db, 'clients', user.uid), {
            settings: newSettings,
            updatedAt: new Date(),
          });
        } catch (firestoreError) {
          console.log('Settings saved locally (Firestore unavailable)');
        }
      }
      
      Alert.alert('Settings Saved', 'Your preferences have been updated successfully.');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const updateNotificationSetting = async (key: keyof SettingsData['notifications'], value: boolean) => {
    const newSettings = {
      ...settings,
      notifications: {
        ...settings.notifications,
        [key]: value,
      },
    };
    
    // Apply functional changes
    if (key === 'bookingReminders' && value) {
      await settingsService.requestNotificationPermissions();
    }
    
    saveSettings(newSettings);
  };

  const updatePreferenceSetting = (key: keyof SettingsData['preferences'], value: any) => {
    const newSettings = {
      ...settings,
      preferences: {
        ...settings.preferences,
        [key]: value,
      },
    };
    saveSettings(newSettings);
  };

  const updatePrivacySetting = async (key: keyof SettingsData['privacy'], value: boolean) => {
    const newSettings = {
      ...settings,
      privacy: {
        ...settings.privacy,
        [key]: value,
      },
    };
    
    // Apply functional changes
    if (key === 'locationTracking' && value) {
      await settingsService.requestLocationPermission();
    }
    
    saveSettings(newSettings);
  };

  const clearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will clear all cached data and may improve app performance. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await AsyncStorage.multiRemove(['heroSliderCache', 'servicesCache', 'educationCache']);
              Alert.alert('Success', 'Cache cleared successfully.');
            } catch (error) {
              Alert.alert('Error', 'Failed to clear cache.');
            }
          },
        },
      ]
    );
  };

  const resetSettings = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to default values. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaultSettings: SettingsData = {
              notifications: {
                bookingReminders: true,
                promotions: false,
                serviceUpdates: true,
                emergencyAlerts: true,
              },
              preferences: {
                autoBooking: false,
                ecoMode: true,
                dataUsage: 'medium',
                language: 'en',
              },
              privacy: {
                shareData: false,
                locationTracking: true,
                analytics: false,
              },
            };
            saveSettings(defaultSettings);
          },
        },
      ]
    );
  };

  const SettingRow = ({ 
    title, 
    subtitle, 
    value, 
    onToggle, 
    icon, 
    type = 'switch' 
  }: {
    title: string;
    subtitle?: string;
    value: boolean | string;
    onToggle: (value: any) => void;
    icon: string;
    type?: 'switch' | 'select';
  }) => (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <Ionicons name={icon as any} size={20} color="#4facfe" />
        <View style={styles.settingText}>
          <Text style={styles.settingTitle}>{title}</Text>
          {subtitle && <Text style={styles.settingSubtitle}>{subtitle}</Text>}
        </View>
      </View>
      {type === 'switch' ? (
        <Switch
          value={value as boolean}
          onValueChange={onToggle}
          trackColor={{ false: '#e2e8f0', true: '#4facfe' }}
          thumbColor={value ? '#fff' : '#f4f3f4'}
        />
      ) : (
        <TouchableOpacity onPress={() => onToggle(!value)}>
          <Text style={styles.selectValue}>{value as string}</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              title="Booking Reminders"
              subtitle="Get notified before your scheduled cleanings"
              value={settings.notifications.bookingReminders}
              onToggle={(value) => updateNotificationSetting('bookingReminders', value)}
              icon="notifications-outline"
            />
            <SettingRow
              title="Service Updates"
              subtitle="Updates about your cleaning service"
              value={settings.notifications.serviceUpdates}
              onToggle={(value) => updateNotificationSetting('serviceUpdates', value)}
              icon="information-circle-outline"
            />
            <SettingRow
              title="Emergency Alerts"
              subtitle="Important safety and emergency notifications"
              value={settings.notifications.emergencyAlerts}
              onToggle={(value) => updateNotificationSetting('emergencyAlerts', value)}
              icon="warning-outline"
            />
            <SettingRow
              title="Promotions & Offers"
              subtitle="Special deals and promotional content"
              value={settings.notifications.promotions}
              onToggle={(value) => updateNotificationSetting('promotions', value)}
              icon="gift-outline"
            />
          </View>
        </View>

        {/* App Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Preferences</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              title="Auto-Booking"
              subtitle="Automatically rebook recurring services"
              value={settings.preferences.autoBooking}
              onToggle={(value) => updatePreferenceSetting('autoBooking', value)}
              icon="repeat-outline"
            />
            <SettingRow
              title="Eco Mode"
              subtitle="Prioritize eco-friendly cleaning options"
              value={settings.preferences.ecoMode}
              onToggle={(value) => updatePreferenceSetting('ecoMode', value)}
              icon="leaf-outline"
            />
            
            <TouchableOpacity 
              style={styles.settingRow}
              onPress={() => {
                const options = ['low', 'medium', 'high'];
                const currentIndex = options.indexOf(settings.preferences.dataUsage);
                const nextIndex = (currentIndex + 1) % options.length;
                updatePreferenceSetting('dataUsage', options[nextIndex]);
              }}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="cellular-outline" size={20} color="#4facfe" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Data Usage</Text>
                  <Text style={styles.settingSubtitle}>Control app data consumption</Text>
                </View>
              </View>
              <Text style={styles.selectValue}>{settings.preferences.dataUsage}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Privacy & Security */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy & Security</Text>
          <View style={styles.sectionCard}>
            <SettingRow
              title="Location Tracking"
              subtitle="Allow location access for better service"
              value={settings.privacy.locationTracking}
              onToggle={(value) => updatePrivacySetting('locationTracking', value)}
              icon="location-outline"
            />
            <SettingRow
              title="Share Usage Data"
              subtitle="Help improve our services"
              value={settings.privacy.shareData}
              onToggle={(value) => updatePrivacySetting('shareData', value)}
              icon="share-outline"
            />
            <SettingRow
              title="Analytics"
              subtitle="Allow anonymous usage analytics"
              value={settings.privacy.analytics}
              onToggle={(value) => updatePrivacySetting('analytics', value)}
              icon="analytics-outline"
            />
          </View>
        </View>

        {/* App Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Management</Text>
          <View style={styles.sectionCard}>
            <TouchableOpacity style={styles.actionRow} onPress={clearCache}>
              <View style={styles.settingLeft}>
                <Ionicons name="trash-outline" size={20} color="#ffc107" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Clear Cache</Text>
                  <Text style={styles.settingSubtitle}>Free up storage space</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#999" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionRow} onPress={resetSettings}>
              <View style={styles.settingLeft}>
                <Ionicons name="refresh-outline" size={20} color="#dc3545" />
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>Reset Settings</Text>
                  <Text style={styles.settingSubtitle}>Restore default preferences</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.sectionCard}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>App Version</Text>
              <Text style={styles.infoValue}>1.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Updated</Text>
              <Text style={styles.infoValue}>Today</Text>
            </View>
            <TouchableOpacity 
              style={styles.actionRow}
              onPress={() => Alert.alert('Support', 'Contact us at support@teddyscleaning.com or call (03) 1234 5678')}
            >
              <View style={styles.settingLeft}>
                <Ionicons name="help-circle-outline" size={20} color="#4facfe" />
                <Text style={styles.settingTitle}>Help & Support</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 100 }} />
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
  content: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: '#666',
  },
  selectValue: {
    fontSize: 14,
    color: '#4facfe',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});