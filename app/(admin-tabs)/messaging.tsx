import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, Text, TextInput, TouchableOpacity, FlatList, Alert, Dimensions, ScrollView, Image } from 'react-native';
import { Ionicons, AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { useChatContext } from '../../contexts/ChatContext';
import { auth, db } from '../../config/firebase';
import { collection, query, where, onSnapshot, addDoc } from 'firebase/firestore';
import { messagingService } from '../../services/messagingService';

const { width } = Dimensions.get('window');

interface Chat {
  id: string;
  name?: string;
  guestName?: string;
  guestEmail?: string;
  lastMessage: string;
  lastMessageAt: any;
  updatedAt: any;
  isGuest: boolean;
  participants: string[];
  participantNames: string[];
  unreadCount?: number;
  profilePicture?: string;
}

interface Message {
  id: string;
  conversationId?: string;
  senderId?: string;
  sender?: string;
  userName?: string;
  clientName?: string;
  text?: string;
  message?: string;
  type?: string;
  imageUrl?: string;
  isGuest?: boolean;
  createdAt: any;
}

type Filter = 'all' | 'employees' | 'guests' | 'clients';
type Screen = 'list' | 'chat';

export default function AdminMessaging() {
  const { userProfile, authReady } = useAuth();
  const { setIsInChatView } = useChatContext();
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState<Screen>('list');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  
  const messagesUnsubscribe = useRef<(() => void) | null>(null);
  const chatsUnsubscribe = useRef<(() => void) | null>(null);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!authReady || !auth.currentUser?.uid) {
      setChats([]);
      setLoading(false);
      return;
    }
    
    const uid = auth.currentUser.uid;
    
    const loadData = async () => {
      try {
        const employeesList = await messagingService.getMessagingUsers();
        
        chatsUnsubscribe.current = messagingService.getAdminConversations((snapshot) => {
          const existingChats = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Chat[];
          
          const employeeChats = [];
          const seenEmployeeIds = new Set();
          
          employeesList.forEach((employee) => {
            if (seenEmployeeIds.has(employee.id)) return;
            seenEmployeeIds.add(employee.id);
            
            const existingChat = existingChats.find(chat => 
              !chat.isGuest && !chat.isClient && chat.participants?.includes(employee.id)
            );
            
            if (existingChat) {
              employeeChats.push({ 
                ...existingChat,
                name: employee.name, 
                profilePicture: employee.profileImage
              });
            } else {
              employeeChats.push({
                id: `new_emp_${employee.id}`,
                name: employee.name,
                profilePicture: employee.profileImage,
                lastMessage: 'Start a conversation',
                lastMessageAt: new Date(0),
                updatedAt: new Date(0),
                isGuest: false,
                participants: [uid, employee.id],
                participantNames: ['Admin', employee.name],
                employeeId: employee.id
              });
            }
          });
          
          const guestChats = existingChats.filter(chat => chat.isGuest);
          const clientChats = existingChats.filter(chat => chat.isClient);
          
          const allChats = [...employeeChats, ...guestChats, ...clientChats].sort((a, b) => {
            const aTime = a.updatedAt?.toDate?.() || a.lastMessageAt?.toDate?.() || new Date(0);
            const bTime = b.updatedAt?.toDate?.() || b.lastMessageAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          });
          
          setChats(allChats);
          setLoading(false);
        });
      } catch (error) {
        console.error('Error setting up admin chats listener:', error);
        setLoading(false);
      }
    };
    
    loadData();
    
    return () => {
      if (chatsUnsubscribe.current) {
        chatsUnsubscribe.current();
        chatsUnsubscribe.current = null;
      }
    };
  }, [authReady]);

  useEffect(() => {
    return () => {
      if (messagesUnsubscribe.current) {
        messagesUnsubscribe.current();
        messagesUnsubscribe.current = null;
      }
      if (chatsUnsubscribe.current) {
        chatsUnsubscribe.current();
        chatsUnsubscribe.current = null;
      }
    };
  }, []);

  const handleChatPress = (chat: Chat) => {
    setSelectedChat(chat);
    setCurrentScreen('chat');
    setIsInChatView(true);
    loadMessages(chat.id, chat.isGuest);
  };

  const loadMessages = (chatId: string, isGuest: boolean) => {
    if (messagesUnsubscribe.current) {
      messagesUnsubscribe.current();
      messagesUnsubscribe.current = null;
    }
    
    console.log('Loading messages for chat:', chatId, 'isGuest:', isGuest);
    
    // If this is a placeholder employee chat, don't load messages yet
    if (chatId.startsWith('new_emp_')) {
      console.log('Placeholder employee chat, not loading messages');
      setMessages([]);
      return;
    }
    
    // Remove any prefixes from chat ID for actual Firestore operations
    const actualChatId = chatId.replace(/^(existing_|guest_)/, '');
    
    if (isGuest) {
      messagesUnsubscribe.current = messagingService.getGuestMessages(actualChatId, (snapshot) => {
        const messageData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
        setMessages(messageData);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      });
    } else if (selectedChat?.isClient) {
      // Handle client chats from 'chats' collection
      const q = query(
        collection(db, 'chats'),
        where('clientId', '==', actualChatId)
      );
      messagesUnsubscribe.current = onSnapshot(q, (snapshot) => {
        const messageData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
        // Sort by createdAt
        messageData.sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return aTime - bTime;
        });
        setMessages(messageData);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      }, (error) => {
        console.error('Client chat messages error:', error);
        setMessages([]);
      });
    } else {
      messagesUnsubscribe.current = messagingService.getChatMessages(actualChatId, (snapshot) => {
        const messageData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Message[];
        setMessages(messageData);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
      });
    }
  };

  const attachImage = async (source: 'camera' | 'gallery') => {
    try {
      let result;
      if (source === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant camera permissions.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.5,
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission needed', 'Please grant gallery permissions.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.5,
        });
      }

      if (result.canceled || !result.assets?.length) {
        return;
      }

      if (selectedChat && result.assets[0]?.uri) {
        const uid = userProfile?.uid || auth.currentUser?.uid;
        const userName = userProfile?.name || auth.currentUser?.displayName || 'Admin';
        
        if (!uid) {
          Alert.alert('Error', 'Authentication required');
          return;
        }
        
        await messagingService.sendMessage(
          selectedChat.id,
          uid,
          userName,
          '📷 Image',
          'image',
          result.assets[0].uri,
          selectedChat.isGuest
        );
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to attach image');
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChat) return;
    
    if (!authReady) {
      Alert.alert('Error', 'Please wait for authentication to complete');
      return;
    }
    
    const uid = userProfile?.uid || auth.currentUser?.uid;
    const userName = userProfile?.name || auth.currentUser?.displayName || 'Admin Team';
    
    if (!uid || !auth.currentUser) {
      Alert.alert('Error', 'Authentication required. Please log in again.');
      return;
    }
    
    try {
      let chatId = selectedChat.id;
      
      // Clean any prefixes from chat ID for Firestore operations
      const cleanChatId = chatId.replace(/^(existing_|guest_|new_emp_)/, '');
      
      // Check if this is a new conversation that needs to be created
      if (selectedChat.lastMessage === 'Start a conversation' || chatId.startsWith('new_emp_')) {
        if (selectedChat.isGuest) {
          // Create new guest conversation
          console.log('Creating new guest conversation');
          chatId = await messagingService.createGuestConversation(
            selectedChat.guestName || selectedChat.name,
            selectedChat.guestEmail || ''
          );
        } else {
          // Create new employee conversation
          const employeeId = selectedChat.employeeId || chatId.replace(/^new_emp_|_\d+$/g, '');
          console.log('Creating new employee conversation with employee ID:', employeeId);
          chatId = await messagingService.createDirectChat(
            uid,
            employeeId,
            userName,
            selectedChat.name
          );
        }
        console.log('New conversation created with ID:', chatId);
        // Update selected chat with the new ID
        setSelectedChat(prev => ({ ...prev, id: chatId, lastMessage: '' }));
      } else {
        // Use existing conversation ID (cleaned)
        chatId = cleanChatId;
      }
      
      if (selectedChat.isClient) {
        // Send message to client chat collection
        await addDoc(collection(db, 'chats'), {
          clientId: selectedChat.id, // Use the chat ID which is the clientId
          clientName: selectedChat.name,
          message: messageText.trim(),
          sender: 'admin',
          readByAdmin: true,
          readByClient: false,
          createdAt: new Date()
        });
      } else {
        await messagingService.sendMessage(
          chatId,
          uid,
          userName,
          messageText.trim(),
          'text',
          null,
          selectedChat.isGuest
        );
      }
      setMessageText('');
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', `Failed to send message: ${error.message}`);
    }
  };

  const getFilteredChats = () => {
    let filtered = chats;
    
    if (filter === 'employees') {
      filtered = chats.filter(chat => !chat.isGuest && !chat.isClient);
    } else if (filter === 'guests') {
      filtered = chats.filter(chat => chat.isGuest);
    } else if (filter === 'clients') {
      filtered = chats.filter(chat => chat.isClient);
    }
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(chat => {
        const name = chat.isGuest ? chat.guestName : chat.name;
        const email = chat.isGuest ? chat.guestEmail : '';
        return (name && name.toLowerCase().includes(term)) || 
               (email && email.toLowerCase().includes(term)) ||
               (chat.lastMessage && chat.lastMessage.toLowerCase().includes(term));
      });
    }
    
    return filtered;
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
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

  const renderChatItem = ({ item }: { item: Chat }) => {
    const displayName = item.isGuest ? item.guestName || 'Guest User' : item.name || 'Unknown';
    const isUnread = (item.unreadCount || 0) > 0;
    
    return (
      <TouchableOpacity
        style={[styles.chatItem, isUnread && styles.unreadChatItem]}
        onPress={() => handleChatPress(item)}
      >
        <View style={styles.avatarContainer}>
          <View style={[styles.avatar, { 
            backgroundColor: item.isGuest ? '#10b981' : 
                           item.isClient ? '#f59e0b' : '#4facfe' 
          }]}>
            {!item.isGuest && !item.isClient && item.profileImage ? (
              <Image source={{ uri: item.profileImage }} style={styles.profileImage} />
            ) : (
              <Text style={styles.avatarText}>{getInitials(displayName)}</Text>
            )}
          </View>
          {item.isGuest && (
            <View style={styles.guestBadge}>
              <MaterialCommunityIcons name="account-question" size={12} color="#fff" />
            </View>
          )}
          {item.isClient && (
            <View style={styles.clientBadge}>
              <MaterialCommunityIcons name="account" size={12} color="#fff" />
            </View>
          )}
        </View>
        
        <View style={styles.chatContent}>
          <View style={styles.chatHeader}>
            <Text style={[styles.chatName, isUnread && styles.unreadText]} numberOfLines={1}>
              {displayName}
            </Text>
            <Text style={styles.chatTime}>
              {formatTime(item.updatedAt || item.lastMessageAt)}
            </Text>
          </View>
          
          <View style={styles.chatPreview}>
            <Text style={[styles.lastMessage, isUnread && styles.unreadMessage]} numberOfLines={1}>
              {item.lastMessage || 'No messages yet'}
            </Text>
            {isUnread && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
          
          {item.isGuest && item.guestEmail && (
            <Text style={styles.guestEmail} numberOfLines={1}>{item.guestEmail}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isAdmin = item.sender === 'admin' || item.senderId === (userProfile?.uid || auth.currentUser?.uid);
    const messageTime = formatTime(item.createdAt);
    const messageText = item.message || item.text || '';
    const hasImage = item.imageUrl;
    
    return (
      <View style={[styles.messageContainer, isAdmin ? styles.adminMessage : styles.userMessage]}>
        <View style={[styles.messageBubble, isAdmin ? styles.adminBubble : styles.userBubble]}>
          {!isAdmin && (
            <Text style={styles.senderName}>{item.userName || item.clientName || 'Client'}</Text>
          )}
          
          {hasImage && (
            <Image 
              source={{ uri: item.imageUrl }} 
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}
          
          {messageText && (
            <Text style={[styles.messageText, isAdmin ? styles.adminMessageText : styles.userMessageText]}>
              {messageText}
            </Text>
          )}
          
          <Text style={[styles.messageTime, isAdmin ? styles.adminMessageTime : styles.userMessageTime]}>
            {messageTime}
          </Text>
        </View>
      </View>
    );
  };

  if (currentScreen === 'chat' && selectedChat) {
    return (
      <View style={styles.fullScreenContainer}>
        <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
          <TouchableOpacity onPress={() => {
            setCurrentScreen('list');
            setIsInChatView(false);
          }} style={styles.backButton}>
            <AntDesign name="arrowleft" size={24} color="#fff" />
          </TouchableOpacity>
          
          <View style={styles.chatHeaderInfo}>
            <Text style={styles.chatHeaderName}>
              {selectedChat.isGuest ? selectedChat.guestName || 'Guest User' : selectedChat.name || 'Unknown'}
            </Text>
            <Text style={styles.chatHeaderSubtitle}>
              {selectedChat.isGuest ? `Guest • ${selectedChat.guestEmail || ''}` : 
               selectedChat.isClient ? 'Client' : 'Employee'}
            </Text>
          </View>
          
          <View style={styles.headerRight} />
        </LinearGradient>

        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => `message_${item.id}`}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        />

        <View style={styles.inputContainer}>
          <TouchableOpacity 
            style={styles.attachButton}
            onPress={() => Alert.alert(
              'Attach Image',
              'Choose image source',
              [
                { text: 'Camera', onPress: () => attachImage('camera') },
                { text: 'Gallery', onPress: () => attachImage('gallery') },
                { text: 'Cancel', style: 'cancel' }
              ]
            )}
          >
            <Ionicons name="attach" size={20} color="#6b7280" />
          </TouchableOpacity>
          <TextInput
            style={styles.messageInput}
            value={messageText}
            onChangeText={setMessageText}
            placeholder="Type a message..."
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
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>
            {getFilteredChats().length} conversations
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.newsButton}
          onPress={() => router.push('/news')}
        >
          <Ionicons name="newspaper-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color="#9ca3af" />
          <TextInput
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search conversations..."
            placeholderTextColor="#9ca3af"
          />
        </View>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {(['all', 'employees', 'guests', 'clients'] as Filter[]).map((filterType) => (
            <TouchableOpacity
              key={filterType}
              style={[styles.filterButton, filter === filterType && styles.activeFilterButton]}
              onPress={() => setFilter(filterType)}
            >
              <Text style={[styles.filterText, filter === filterType && styles.activeFilterText]}>
                {filterType === 'all' ? 'All' : 
                 filterType === 'employees' ? 'Employees' : 
                 filterType === 'guests' ? 'Guests' : 'Clients'}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <AntDesign name="loading1" size={32} color="#4facfe" />
          <Text style={styles.loadingText}>Loading conversations...</Text>
        </View>
      ) : (
        <FlatList
          data={getFilteredChats()}
          renderItem={renderChatItem}
          keyExtractor={(item) => `chat_${item.id}`}
          style={styles.chatsList}
          contentContainerStyle={styles.chatsContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="message-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>No Conversations</Text>
              <Text style={styles.emptyDescription}>
                {filter === 'guests' ? 'No guest messages yet' : 
                 filter === 'employees' ? 'No employee conversations yet' : 
                 'No conversations yet'}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, elevation: 8 },
  headerContent: { alignItems: 'center' },
  headerTitle: { fontSize: 24, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.9)', fontWeight: '600' },
  
  backButton: { padding: 8, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.1)' },
  chatHeaderInfo: { flex: 1, alignItems: 'center' },
  chatHeaderName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  chatHeaderSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  headerRight: { width: 40 },
  
  searchContainer: { padding: 16, backgroundColor: '#fff' },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 16, color: '#1f2937' },
  
  filterContainer: { backgroundColor: '#fff', paddingBottom: 8 },
  filterScroll: { paddingHorizontal: 16, gap: 8 },
  filterButton: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f1f5f9' },
  activeFilterButton: { backgroundColor: '#4facfe' },
  filterText: { fontSize: 14, fontWeight: '600', color: '#6b7280' },
  activeFilterText: { color: '#fff' },
  
  chatsList: { flex: 1 },
  chatsContent: { padding: 16 },
  chatItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 8, elevation: 1 },
  unreadChatItem: { borderLeftWidth: 4, borderLeftColor: '#4facfe' },
  
  avatarContainer: { position: 'relative', marginRight: 12 },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  guestBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#10b981', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  clientBadge: { position: 'absolute', bottom: -2, right: -2, backgroundColor: '#f59e0b', borderRadius: 8, width: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  
  chatContent: { flex: 1 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  chatName: { fontSize: 16, fontWeight: '600', color: '#1f2937', flex: 1 },
  unreadText: { fontWeight: '700', color: '#1f2937' },
  chatTime: { fontSize: 12, color: '#9ca3af' },
  
  chatPreview: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lastMessage: { fontSize: 14, color: '#6b7280', flex: 1 },
  unreadMessage: { fontWeight: '600', color: '#374151' },
  unreadBadge: { backgroundColor: '#4facfe', borderRadius: 10, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  unreadCount: { fontSize: 12, fontWeight: '700', color: '#fff' },
  
  guestEmail: { fontSize: 12, color: '#10b981', marginTop: 2 },
  
  messagesList: { flex: 1, backgroundColor: '#f8fafc' },
  messagesContent: { padding: 16 },
  messageContainer: { marginBottom: 12 },
  adminMessage: { alignItems: 'flex-end' },
  userMessage: { alignItems: 'flex-start' },
  
  messageBubble: { maxWidth: '80%', borderRadius: 16, padding: 12 },
  adminBubble: { backgroundColor: '#4facfe' },
  userBubble: { backgroundColor: '#fff', elevation: 1 },
  
  senderName: { fontSize: 12, fontWeight: '600', color: '#6b7280', marginBottom: 4 },
  messageText: { fontSize: 16, lineHeight: 20 },
  adminMessageText: { color: '#fff' },
  userMessageText: { color: '#1f2937' },
  
  messageTime: { fontSize: 11, marginTop: 4 },
  adminMessageTime: { color: 'rgba(255,255,255,0.8)' },
  userMessageTime: { color: '#9ca3af' },
  
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e5e7eb' },
  attachButton: { padding: 12, marginRight: 8 },
  messageInput: { flex: 1, borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, marginRight: 12, maxHeight: 100, fontSize: 16 },
  fullScreenContainer: { flex: 1, backgroundColor: '#f8fafc', position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 },
  sendButton: { backgroundColor: '#4facfe', borderRadius: 20, width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: '#cbd5e1' },
  
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontSize: 16, color: '#6b7280', fontWeight: '600' },
  
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#374151', marginTop: 16, marginBottom: 8 },
  emptyDescription: { fontSize: 14, color: '#6b7280', textAlign: 'center' },
  
  messageImage: { width: 200, height: 150, borderRadius: 8, marginBottom: 4 },
  newsButton: { padding: 12, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.15)' },
  profileImage: { width: 48, height: 48, borderRadius: 24 },
});