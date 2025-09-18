import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Image,
  Alert
} from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { auth, db } from '../../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

const { width } = Dimensions.get('window');
const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SHIFT_HOURS = Array.from({ length: 24 }, (_, i) => {
  const hour = i.toString().padStart(2, '0');
  return { value: `${hour}:00`, label: `${hour}:00` };
});

export default function EmployeeSchedule() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [scheduleData, setScheduleData] = useState({
    weeklySchedule: {
      Monday: [], Tuesday: [], Wednesday: [], Thursday: [],
      Friday: [], Saturday: [], Sunday: []
    },
    unavailableDays: [],
    additionalNotes: ''
  });

  useEffect(() => {
    loadScheduleData();
  }, []);

  const loadScheduleData = async () => {
    if (!auth.currentUser) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      
      if (userDoc.exists()) {
        const data = userDoc.data();
        setScheduleData({
          weeklySchedule: data.weeklySchedule || {
            Monday: [], Tuesday: [], Wednesday: [], Thursday: [],
            Friday: [], Saturday: [], Sunday: []
          },
          unavailableDays: data.unavailableDays || [],
          additionalNotes: data.additionalNotes || ''
        });
      }
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  };

  const toggleDayUnavailable = (day) => {
    const unavailable = scheduleData.unavailableDays.includes(day)
      ? scheduleData.unavailableDays.filter(d => d !== day)
      : [...scheduleData.unavailableDays, day];
    
    setScheduleData(prev => ({
      ...prev,
      unavailableDays: unavailable,
      weeklySchedule: unavailable.includes(day) 
        ? { ...prev.weeklySchedule, [day]: [] }
        : prev.weeklySchedule
    }));
  };

  const toggleHourForDay = (day, hour) => {
    if (scheduleData.unavailableDays.includes(day)) return;
    
    const daySchedule = scheduleData.weeklySchedule[day];
    const newSchedule = daySchedule.includes(hour)
      ? daySchedule.filter(h => h !== hour)
      : [...daySchedule, hour].sort();
    
    setScheduleData(prev => ({
      ...prev,
      weeklySchedule: {
        ...prev.weeklySchedule,
        [day]: newSchedule
      }
    }));
  };

  const saveSchedule = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), {
        weeklySchedule: scheduleData.weeklySchedule,
        unavailableDays: scheduleData.unavailableDays,
        additionalNotes: scheduleData.additionalNotes,
        updatedAt: new Date()
      });
      
      setIsEditing(false);
      Alert.alert('Success', 'Schedule updated successfully!');
    } catch (error) {
      console.error('Error saving schedule:', error);
      Alert.alert('Error', 'Failed to save schedule');
    } finally {
      setLoading(false);
    }
  };

  const getDayStatus = (day) => {
    const isUnavailable = scheduleData.unavailableDays.includes(day);
    const hasHours = scheduleData.weeklySchedule[day]?.length > 0;
    
    if (isUnavailable) return { status: 'unavailable', color: '#ef4444', text: 'Unavailable' };
    if (hasHours) return { status: 'available', color: '#22c55e', text: `${hasHours} hours` };
    return { status: 'unconfigured', color: '#f59e0b', text: 'Not set' };
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Image source={require('../../assets/teddy-logo.png')} style={styles.logo} />
          <View>
            <Text style={styles.headerTitle}>My Schedule</Text>
            <Text style={styles.headerSubtitle}>Weekly Availability</Text>
          </View>
        </View>
        
        <TouchableOpacity 
          style={styles.editButton}
          onPress={() => setIsEditing(!isEditing)}
        >
          <Ionicons name={isEditing ? "close" : "pencil"} size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Weekly Overview */}
        <View style={styles.overviewSection}>
          <Text style={styles.sectionTitle}>Weekly Overview</Text>
          <View style={styles.weekOverview}>
            {DAYS_OF_WEEK.map((day) => {
              const status = getDayStatus(day);
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayOverview,
                    selectedDay === day && styles.dayOverviewSelected
                  ]}
                  onPress={() => setSelectedDay(day)}
                >
                  <Text style={styles.dayName}>{day.slice(0, 3)}</Text>
                  <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                  <Text style={[styles.statusText, { color: status.color }]}>
                    {status.text}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Day Detail */}
        <View style={styles.daySection}>
          <View style={styles.daySectionHeader}>
            <Text style={styles.sectionTitle}>{selectedDay} Schedule</Text>
            {isEditing && (
              <TouchableOpacity
                style={[
                  styles.unavailableButton,
                  scheduleData.unavailableDays.includes(selectedDay) && styles.unavailableButtonActive
                ]}
                onPress={() => toggleDayUnavailable(selectedDay)}
              >
                <Text style={[
                  styles.unavailableButtonText,
                  scheduleData.unavailableDays.includes(selectedDay) && styles.unavailableButtonTextActive
                ]}>
                  {scheduleData.unavailableDays.includes(selectedDay) ? 'Mark Available' : 'Mark Unavailable'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.hoursGrid}>
            {SHIFT_HOURS.map((hour) => {
              const isSelected = scheduleData.weeklySchedule[selectedDay]?.includes(hour.value);
              const isDisabled = scheduleData.unavailableDays.includes(selectedDay);
              
              return (
                <TouchableOpacity
                  key={hour.value}
                  style={[
                    styles.hourButton,
                    isSelected && styles.hourButtonSelected,
                    isDisabled && styles.hourButtonDisabled
                  ]}
                  onPress={() => isEditing && toggleHourForDay(selectedDay, hour.value)}
                  disabled={!isEditing || isDisabled}
                >
                  <Text style={[
                    styles.hourButtonText,
                    isSelected && styles.hourButtonTextSelected,
                    isDisabled && styles.hourButtonTextDisabled
                  ]}>
                    {hour.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Schedule Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Available Days:</Text>
              <Text style={styles.summaryValue}>
                {DAYS_OF_WEEK.filter(day => 
                  !scheduleData.unavailableDays.includes(day) && 
                  scheduleData.weeklySchedule[day]?.length > 0
                ).length} / 7
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Hours/Week:</Text>
              <Text style={styles.summaryValue}>
                {Object.values(scheduleData.weeklySchedule).reduce((total, hours) => total + hours.length, 0)} hours
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Unavailable Days:</Text>
              <Text style={styles.summaryValue}>
                {scheduleData.unavailableDays.length} days
              </Text>
            </View>
          </View>
        </View>

        {isEditing && (
          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={saveSchedule}
            disabled={loading}
          >
            <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.saveButtonGradient}>
              <Text style={styles.saveButtonText}>
                {loading ? 'Saving...' : 'Save Schedule'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginLeft: -40,
  },
  logo: {
    width: 36,
    height: 36,
    marginRight: 12,
    borderRadius: 18,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  editButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  overviewSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 16,
  },
  weekOverview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayOverview: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    flex: 1,
    marginHorizontal: 2,
    elevation: 2,
  },
  dayOverviewSelected: {
    backgroundColor: '#4facfe',
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '500',
  },
  daySection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    elevation: 4,
  },
  daySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  unavailableButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  unavailableButtonActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#ef4444',
  },
  unavailableButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  unavailableButtonTextActive: {
    color: '#ef4444',
  },
  hoursGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  hourButton: {
    backgroundColor: '#f3f4f6',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    margin: 2,
    minWidth: '15%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  hourButtonSelected: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe',
  },
  hourButtonDisabled: {
    backgroundColor: '#f9fafb',
    opacity: 0.5,
  },
  hourButtonText: {
    fontSize: 11,
    color: '#374151',
    fontWeight: '500',
  },
  hourButtonTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  hourButtonTextDisabled: {
    color: '#9ca3af',
  },
  summarySection: {
    marginBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '600',
  },
  saveButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 40,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});