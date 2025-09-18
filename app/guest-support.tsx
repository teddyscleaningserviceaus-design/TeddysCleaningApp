import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Alert, TextInput, Image } from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../config/firebase';

interface Conversation {
  id: string;
  guestName: string;
  guestEmail: string;
  lastMessage: string;
  lastMessageAt: any;
  updatedAt: any;
}

export default function GuestSupport() {
  const router = useRouter();
  const { guestName, guestEmail, guestPhone } = useLocalSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState((guestEmail as string) || '');

  useEffect(() => {
    if (searchEmail) {
      loadConversations(searchEmail);
    } else {
      setLoading(false);
    }
  }, [searchEmail]);

  const loadConversations = (email: string) => {
    setLoading(true);
    
    const q = query(
      collection(db, 'guest-conversations'),
      where('guestEmail', '==', email),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const convos = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Conversation[];
        setConversations(convos);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading conversations:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  };

  const handleNewMessage = () => {
    router.push({
      pathname: '/guest-message',
      params: {
        guestName: guestName || 'Guest User',
        guestEmail: searchEmail,
        guestPhone: guestPhone || ''
      }
    });
  };

  const handleConversationPress = (conversation: Conversation) => {
    router.push({
      pathname: '/guest-chat',
      params: {
        conversationId: conversation.id,
        guestName: conversation.guestName,
        guestEmail: conversation.guestEmail
      }
    });
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
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
              <Text style={styles.headerTitle}>Support Center</Text>
              <Text style={styles.headerSubtitle}>Get help when you need it</Text>
            </View>
          </View>
          
          <View style={styles.headerRight} />
        </LinearGradient>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Email Search */}
          <View style={styles.searchCard}>
            <Text style={styles.cardTitle}>Find Your Conversations</Text>
            <Text style={styles.cardSubtitle}>Enter your email to view existing support conversations</Text>
            
            <View style={styles.searchContainer}>
              <Ionicons name="mail-outline" size={20} color="#4facfe" />
              <TextInput
                style={styles.searchInput}
                value={searchEmail}
                onChangeText={setSearchEmail}
                placeholder="Enter your email address"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
          </View>

          {/* Conversations List */}
          {searchEmail && (
            <View style={styles.conversationsCard}>
              <View style={styles.conversationsHeader}>
                <Text style={styles.cardTitle}>Your Conversations</Text>
                <TouchableOpacity style={styles.newMessageButton} onPress={handleNewMessage}>
                  <Ionicons name="add" size={20} color="#4facfe" />
                  <Text style={styles.newMessageText}>New</Text>
                </TouchableOpacity>
              </View>
              
              {loading ? (
                <View style={styles.loadingContainer}>
                  <AntDesign name="loading1" size={24} color="#4facfe" />
                  <Text style={styles.loadingText}>Loading conversations...</Text>
                </View>
              ) : conversations.length > 0 ? (
                <View style={styles.conversationsList}>
                  {conversations.map((conversation) => (
                    <TouchableOpacity
                      key={conversation.id}
                      style={styles.conversationItem}
                      onPress={() => handleConversationPress(conversation)}
                    >
                      <View style={styles.conversationIcon}>
                        <Ionicons name="chatbubbles" size={24} color="#4facfe" />
                      </View>
                      
                      <View style={styles.conversationContent}>
                        <View style={styles.conversationHeader}>
                          <Text style={styles.conversationTitle}>Support Conversation</Text>
                          <Text style={styles.conversationTime}>
                            {formatTime(conversation.updatedAt || conversation.lastMessageAt)}
                          </Text>
                        </View>
                        <Text style={styles.conversationPreview} numberOfLines={2}>
                          {conversation.lastMessage || 'No messages yet'}
                        </Text>
                      </View>
                      
                      <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={48} color="#ccc" />
                  <Text style={styles.emptyTitle}>No conversations found</Text>
                  <Text style={styles.emptyDescription}>
                    You haven't started any support conversations yet.
                  </Text>
                  <TouchableOpacity style={styles.startChatButton} onPress={handleNewMessage}>
                    <Text style={styles.startChatText}>Start New Conversation</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActionsCard}>
            <Text style={styles.cardTitle}>Quick Actions</Text>
            
            <TouchableOpacity style={styles.actionButton} onPress={handleNewMessage}>
              <View style={styles.actionIcon}>
                <Ionicons name="chatbubble-ellipses" size={24} color="#4facfe" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Start New Conversation</Text>
                <Text style={styles.actionDescription}>Get help with your booking or service</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.actionButton}>
              <View style={styles.actionIcon}>
                <Ionicons name="call" size={24} color="#ef4444" />
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Call Support</Text>
                <Text style={styles.actionDescription}>+61 412 345 678 • Available 8 AM - 8 PM</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          {/* FAQ */}
          <View style={styles.faqCard}>
            <Text style={styles.cardTitle}>Frequently Asked Questions</Text>
            
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How do I reschedule my appointment?</Text>
              <Text style={styles.faqAnswer}>Contact us through chat or call, and we'll help you find a new time that works.</Text>
            </View>
            
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>What if I need to cancel my booking?</Text>
              <Text style={styles.faqAnswer}>You can cancel up to 24 hours before your appointment for a full refund.</Text>
            </View>
            
            <View style={styles.faqItem}>
              <Text style={styles.faqQuestion}>How long will the cleaning take?</Text>
              <Text style={styles.faqAnswer}>Most standard cleans take 2-4 hours depending on the size and condition of your space.</Text>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
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
  
  searchCard: {
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
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    lineHeight: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    marginLeft: 12,
  },
  
  conversationsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  conversationsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  newMessageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#4facfe',
  },
  newMessageText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4facfe',
    marginLeft: 4,
  },
  
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
  
  conversationsList: {
    gap: 12,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  conversationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f8ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  conversationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  conversationPreview: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 18,
  },
  
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 20,
  },
  startChatButton: {
    backgroundColor: '#4facfe',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  startChatText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  
  quickActionsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  actionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 14,
    color: '#6b7280',
  },
  
  faqCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  faqItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});