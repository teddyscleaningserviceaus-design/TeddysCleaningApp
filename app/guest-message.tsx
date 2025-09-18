import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, TextInput, Image } from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../config/firebase';
import { messagingService } from '../services/messagingService';
import { Stack } from 'expo-router';

export default function GuestMessage() {
  const router = useRouter();
  const { guestName, guestEmail, guestPhone, bookingId } = useLocalSearchParams();
  const [selectedQuestion, setSelectedQuestion] = useState('');
  const [customMessage, setCustomMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const quickQuestions = [
    { id: 'reschedule', text: 'I need to reschedule my appointment', icon: 'calendar-outline' },
    { id: 'cancel', text: 'I need to cancel my booking', icon: 'close-circle-outline' },
    { id: 'pricing', text: 'I have questions about pricing', icon: 'card-outline' },
    { id: 'service', text: 'I want to modify my service requirements', icon: 'construct-outline' },
    { id: 'access', text: 'I have special access instructions', icon: 'key-outline' },
    { id: 'timing', text: 'I need to discuss timing details', icon: 'time-outline' },
  ];

  const handleQuickQuestion = (question) => {
    setSelectedQuestion(question.id);
    setCustomMessage(question.text);
  };

  const handleSendMessage = async () => {
    if (!customMessage.trim()) {
      Alert.alert('Message Required', 'Please enter a message or select a quick question.');
      return;
    }

    setLoading(true);
    try {
      // Create guest conversation with admin
      const conversationId = await messagingService.createGuestConversation(
        guestName || 'Guest User',
        guestEmail || ''
      );
      
      // Send the message
      await messagingService.sendMessage(
        conversationId,
        conversationId, // Use conversation ID as sender ID for guests
        guestName || 'Guest User',
        customMessage.trim(),
        'text',
        null,
        true // isGuest = true
      );

      Alert.alert(
        'Message Sent! 📧',
        'Your message has been sent to our support team. You can now continue the conversation.',
        [
          {
            text: 'Continue Chat',
            onPress: () => router.push({
              pathname: '/guest-chat',
              params: {
                conversationId,
                guestName: guestName || 'Guest User',
                guestEmail: guestEmail || ''
              }
            })
          },
          {
            text: 'Close',
            style: 'cancel',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
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
              <Text style={styles.headerTitle}>Contact Support</Text>
              <Text style={styles.headerSubtitle}>We're here to help!</Text>
            </View>
          </View>
          
          <View style={styles.headerRight} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Contact Info Display */}
          <View style={styles.contactCard}>
            <Text style={styles.cardTitle}>Your Contact Information</Text>
            <View style={styles.contactRow}>
              <Ionicons name="person-outline" size={20} color="#4facfe" />
              <Text style={styles.contactText}>{guestName || 'Guest User'}</Text>
            </View>
            {guestEmail && (
              <View style={styles.contactRow}>
                <Ionicons name="mail-outline" size={20} color="#4facfe" />
                <Text style={styles.contactText}>{guestEmail}</Text>
              </View>
            )}
            {guestPhone && (
              <View style={styles.contactRow}>
                <Ionicons name="call-outline" size={20} color="#4facfe" />
                <Text style={styles.contactText}>{guestPhone}</Text>
              </View>
            )}
          </View>

          {/* Quick Questions */}
          <View style={styles.quickQuestionsCard}>
            <Text style={styles.cardTitle}>Quick Questions</Text>
            <Text style={styles.cardSubtitle}>Tap a common question or write your own message below</Text>
            
            <View style={styles.questionsGrid}>
              {quickQuestions.map((question) => (
                <TouchableOpacity
                  key={question.id}
                  style={[
                    styles.questionButton,
                    selectedQuestion === question.id && styles.questionButtonSelected
                  ]}
                  onPress={() => handleQuickQuestion(question)}
                >
                  <Ionicons 
                    name={question.icon} 
                    size={20} 
                    color={selectedQuestion === question.id ? '#4facfe' : '#6b7280'} 
                  />
                  <Text style={[
                    styles.questionText,
                    selectedQuestion === question.id && styles.questionTextSelected
                  ]}>
                    {question.text}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Custom Message */}
          <View style={styles.messageCard}>
            <Text style={styles.cardTitle}>Your Message</Text>
            <TextInput
              style={styles.messageInput}
              value={customMessage}
              onChangeText={setCustomMessage}
              placeholder="Type your message here... Include any specific details about your booking or questions you have."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          {/* Emergency Contact */}
          <View style={styles.emergencyCard}>
            <View style={styles.emergencyHeader}>
              <Ionicons name="call" size={24} color="#ef4444" />
              <Text style={styles.emergencyTitle}>Need Immediate Help?</Text>
            </View>
            <Text style={styles.emergencyText}>
              For urgent matters, call us directly at{' '}
              <Text style={styles.phoneNumber}>+61 412 345 678</Text>
            </Text>
            <Text style={styles.emergencyHours}>Available 7 days a week, 8 AM - 8 PM</Text>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Send Button */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.sendButton, (!customMessage.trim() || loading) && styles.sendButtonDisabled]}
            onPress={handleSendMessage}
            disabled={!customMessage.trim() || loading}
          >
            <LinearGradient 
              colors={(!customMessage.trim() || loading) ? ['#e2e8f0', '#cbd5e1'] : ['#10b981', '#059669']} 
              style={styles.sendButtonGradient}
            >
              {loading ? (
                <AntDesign name="loading1" size={20} color="#fff" />
              ) : (
                <Ionicons name="send" size={20} color="#fff" />
              )}
              <Text style={styles.sendButtonText}>
                {loading ? 'Sending...' : 'Send Message'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
  
  contactCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  contactText: {
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  
  quickQuestionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  questionsGrid: {
    gap: 12,
  },
  questionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  questionButtonSelected: {
    backgroundColor: '#f0f8ff',
    borderColor: '#4facfe',
  },
  questionText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
    flex: 1,
  },
  questionTextSelected: {
    color: '#4facfe',
    fontWeight: '600',
  },
  
  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  messageInput: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    minHeight: 120,
  },
  
  emergencyCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  emergencyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#dc2626',
    marginLeft: 8,
  },
  emergencyText: {
    fontSize: 14,
    color: '#7f1d1d',
    lineHeight: 20,
    marginBottom: 8,
  },
  phoneNumber: {
    fontWeight: 'bold',
    color: '#dc2626',
  },
  emergencyHours: {
    fontSize: 12,
    color: '#991b1b',
    fontStyle: 'italic',
  },
  
  buttonContainer: {
    padding: 20,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  sendButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
});