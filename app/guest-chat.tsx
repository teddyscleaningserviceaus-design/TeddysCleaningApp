import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, StatusBar, TextInput, Image, Alert } from 'react-native';
import { Ionicons, AntDesign } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { messagingService } from '../services/messagingService';

interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  userName: string;
  text: string;
  type: string;
  imageUrl?: string;
  isGuest?: boolean;
  createdAt: any;
}

export default function GuestChat() {
  const router = useRouter();
  const { conversationId, guestName, guestEmail } = useLocalSearchParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const flatListRef = useRef<FlatList>(null);
  const messagesUnsubscribe = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (conversationId) {
      loadMessages();
    }
    
    return () => {
      if (messagesUnsubscribe.current) {
        messagesUnsubscribe.current();
      }
    };
  }, [conversationId]);

  const loadMessages = () => {
    if (messagesUnsubscribe.current) {
      messagesUnsubscribe.current();
    }
    
    messagesUnsubscribe.current = messagingService.getGuestMessages(conversationId as string, (snapshot) => {
      const messageData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(messageData);
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    });
  };

  const sendMessage = async () => {
    if (!messageText.trim()) return;
    
    try {
      await messagingService.sendMessage(
        conversationId as string,
        conversationId as string, // Use conversation ID as sender ID for guests
        guestName as string || 'Guest User',
        messageText.trim(),
        'text',
        null,
        true // isGuest = true
      );
      setMessageText('');
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
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

  const renderMessage = ({ item }: { item: Message }) => {
    const isGuest = item.isGuest || item.senderId === conversationId;
    const messageTime = formatTime(item.createdAt);
    const isImageMessage = item.type === 'image' && item.imageUrl;
    
    return (
      <View style={[styles.messageContainer, isGuest ? styles.guestMessage : styles.adminMessage]}>
        <View style={[styles.messageBubble, isGuest ? styles.guestBubble : styles.adminBubble]}>
          {!isGuest && (
            <Text style={styles.senderName}>{item.userName}</Text>
          )}
          
          {isImageMessage ? (
            <View>
              <Image 
                source={{ uri: item.imageUrl }} 
                style={styles.messageImage}
                resizeMode="cover"
              />
              {item.text !== '📷 Image' && (
                <Text style={[styles.messageText, isGuest ? styles.guestMessageText : styles.adminMessageText]}>
                  {item.text}
                </Text>
              )}
            </View>
          ) : (
            <Text style={[styles.messageText, isGuest ? styles.guestMessageText : styles.adminMessageText]}>
              {item.text}
            </Text>
          )}
          
          <Text style={[styles.messageTime, isGuest ? styles.guestMessageTime : styles.adminMessageTime]}>
            {messageTime}
          </Text>
        </View>
      </View>
    );
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
              <Text style={styles.headerTitle}>Support Chat</Text>
              <Text style={styles.headerSubtitle}>Live conversation with our team</Text>
            </View>
          </View>
          
          <View style={styles.headerRight} />
        </LinearGradient>

        {loading ? (
          <View style={styles.loadingContainer}>
            <AntDesign name="loading1" size={32} color="#4facfe" />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        ) : (
          <>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
                  <Text style={styles.emptyTitle}>Start the conversation</Text>
                  <Text style={styles.emptyDescription}>
                    Send a message below and our support team will respond shortly.
                  </Text>
                </View>
              }
            />

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.messageInput}
                value={messageText}
                onChangeText={setMessageText}
                placeholder="Type your message..."
                placeholderTextColor="#9ca3af"
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
                onPress={sendMessage}
                disabled={!messageText.trim()}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </>
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
  
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6b7280', fontWeight: '600' },
  
  messagesList: { flex: 1, backgroundColor: '#f8fafc' },
  messagesContent: { padding: 16 },
  messageContainer: { marginBottom: 12 },
  guestMessage: { alignItems: 'flex-end' },
  adminMessage: { alignItems: 'flex-start' },
  
  messageBubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  guestBubble: { backgroundColor: '#4facfe' },
  adminBubble: { backgroundColor: '#fff', elevation: 1 },
  
  senderName: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  messageText: { fontSize: 16, lineHeight: 20 },
  guestMessageText: { color: '#fff' },
  adminMessageText: { color: '#1f2937' },
  
  messageTime: { fontSize: 11, marginTop: 4 },
  guestMessageTime: { color: 'rgba(255,255,255,0.8)' },
  adminMessageTime: { color: '#9ca3af' },
  
  messageImage: { width: 200, height: 150, borderRadius: 8, marginBottom: 4 },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: '#4facfe',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { backgroundColor: '#cbd5e1' },
  
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptyDescription: { fontSize: 14, color: '#6b7280', textAlign: 'center', paddingHorizontal: 20 },
});