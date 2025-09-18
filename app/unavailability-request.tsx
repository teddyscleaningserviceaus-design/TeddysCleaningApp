import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, TextInput, Image } from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../config/firebase';
import { Stack } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

export default function UnavailabilityRequest() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  
  const [request, setRequest] = useState({
    reason: '',
    startDate: new Date(),
    endDate: new Date(),
    notes: '',
    type: 'vacation' // vacation, sick, personal, emergency
  });

  const reasonTypes = [
    { id: 'vacation', title: 'Vacation', icon: 'enviromento', color: '#10b981' },
    { id: 'sick', title: 'Sick Leave', icon: 'medicinebox', color: '#ef4444' },
    { id: 'personal', title: 'Personal', icon: 'user', color: '#4facfe' },
    { id: 'emergency', title: 'Emergency', icon: 'exclamationcircle', color: '#f59e0b' },
  ];

  const handleSubmitRequest = async () => {
    if (!request.reason.trim()) {
      Alert.alert('Missing Information', 'Please provide a reason for your time off request.');
      return;
    }

    if (request.startDate >= request.endDate) {
      Alert.alert('Invalid Dates', 'End date must be after start date.');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'unavailability'), {
        employeeId: auth.currentUser.uid,
        reason: request.reason,
        type: request.type,
        startDate: request.startDate,
        endDate: request.endDate,
        notes: request.notes,
        status: 'pending',
        requestedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      });

      Alert.alert(
        'Request Submitted! 📅',
        'Your time off request has been submitted for approval. You will be notified once it has been reviewed.',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Error submitting request:', error);
      Alert.alert('Error', 'Failed to submit request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculateDays = () => {
    const diffTime = Math.abs(request.endDate - request.startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
        
        <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <AntDesign name="arrowleft" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Image source={require('../assets/teddy-logo.png')} style={styles.logo} />
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Time Off Request</Text>
              <Text style={styles.headerSubtitle}>Request leave from work</Text>
            </View>
          </View>
          
          <View style={styles.headerRight} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Request Type */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Type of Leave</Text>
            <View style={styles.reasonGrid}>
              {reasonTypes.map((type) => (
                <TouchableOpacity
                  key={type.id}
                  style={[
                    styles.reasonOption,
                    request.type === type.id && styles.reasonOptionSelected
                  ]}
                  onPress={() => setRequest({...request, type: type.id})}
                >
                  <AntDesign 
                    name={type.icon} 
                    size={24} 
                    color={request.type === type.id ? '#fff' : type.color} 
                  />
                  <Text style={[
                    styles.reasonText,
                    request.type === type.id && styles.reasonTextSelected
                  ]}>
                    {type.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Reason */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Reason for Leave</Text>
            <TextInput
              style={styles.reasonInput}
              value={request.reason}
              onChangeText={(text) => setRequest({...request, reason: text})}
              placeholder="Please provide a brief reason for your time off request..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Dates */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Leave Dates</Text>
            
            <View style={styles.dateContainer}>
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowStartDatePicker(true)}
              >
                <AntDesign name="calendar" size={20} color="#4facfe" />
                <View style={styles.dateText}>
                  <Text style={styles.dateLabel}>Start Date</Text>
                  <Text style={styles.dateValue}>
                    {request.startDate.toLocaleDateString('en-AU', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.dateButton}
                onPress={() => setShowEndDatePicker(true)}
              >
                <AntDesign name="calendar" size={20} color="#4facfe" />
                <View style={styles.dateText}>
                  <Text style={styles.dateLabel}>End Date</Text>
                  <Text style={styles.dateValue}>
                    {request.endDate.toLocaleDateString('en-AU', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short',
                      year: 'numeric'
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.durationInfo}>
              <Text style={styles.durationText}>
                Duration: {calculateDays()} day{calculateDays() !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>

          {/* Additional Notes */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Additional Notes (Optional)</Text>
            <TextInput
              style={styles.notesInput}
              value={request.notes}
              onChangeText={(text) => setRequest({...request, notes: text})}
              placeholder="Any additional information or special circumstances..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Important Information */}
          <View style={styles.infoCard}>
            <View style={styles.infoHeader}>
              <AntDesign name="infocirlce" size={20} color="#4facfe" />
              <Text style={styles.infoTitle}>Important Information</Text>
            </View>
            <Text style={styles.infoText}>
              • Vacation requests should be submitted at least 2 weeks in advance{'\n'}
              • Sick leave can be requested immediately{'\n'}
              • Emergency leave will be reviewed as soon as possible{'\n'}
              • You will receive a notification once your request is reviewed
            </Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.submitButtonDisabled]}
            onPress={handleSubmitRequest}
            disabled={loading}
          >
            <LinearGradient 
              colors={loading ? ['#e2e8f0', '#cbd5e1'] : ['#10b981', '#059669']} 
              style={styles.submitButtonGradient}
            >
              {loading ? (
                <AntDesign name="loading1" size={20} color="#fff" />
              ) : (
                <AntDesign name="calendar" size={20} color="#fff" />
              )}
              <Text style={styles.submitButtonText}>
                {loading ? 'Submitting...' : 'Submit Request'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Date Pickers */}
        {showStartDatePicker && (
          <DateTimePicker
            value={request.startDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowStartDatePicker(false);
              if (selectedDate) {
                setRequest({...request, startDate: selectedDate});
              }
            }}
            minimumDate={new Date()}
          />
        )}
        
        {showEndDatePicker && (
          <DateTimePicker
            value={request.endDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowEndDatePicker(false);
              if (selectedDate) {
                setRequest({...request, endDate: selectedDate});
              }
            }}
            minimumDate={request.startDate}
          />
        )}
      </View>
    </>
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
    padding: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  headerTextContainer: {
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  headerRight: { width: 40 },
  
  content: { flex: 1, padding: 20 },
  
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  
  reasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reasonOption: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reasonOptionSelected: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe',
  },
  reasonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginLeft: 8,
  },
  reasonTextSelected: {
    color: '#fff',
  },
  
  reasonInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    minHeight: 80,
  },
  
  dateContainer: {
    gap: 12,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  dateText: {
    marginLeft: 12,
  },
  dateLabel: {
    fontSize: 14,
    color: '#6b7280',
    fontWeight: '500',
  },
  dateValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
    marginTop: 2,
  },
  durationInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
  },
  durationText: {
    fontSize: 14,
    color: '#4facfe',
    fontWeight: '600',
    textAlign: 'center',
  },
  
  notesInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    minHeight: 100,
  },
  
  infoCard: {
    backgroundColor: '#f0f8ff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
  },
  
  buttonContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  submitButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});