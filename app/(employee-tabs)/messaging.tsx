import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, SafeAreaView, Text, TextInput, TouchableOpacity, FlatList, Alert, Image, Dimensions, ScrollView } from 'react-native';
import { Ionicons, AntDesign, Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../contexts/AuthContext';
import { auth } from '../../config/firebase';
import { messagingService } from '../../services/messagingService';

const { width } = Dimensions.get('window');
const SIDEBAR_WIDTH = width * 0.8;

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  lastMessageAt: any;
  isGroup: boolean;
  participants: string[];
  participantNames: { [key: string]: string };
}

interface Message {
  id: string;
  chatId: string;
  userId: string;
  userName: string;
  text: string;
  type: string;
  imageUrl?: string;
  createdAt: any;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'admin';
  profileImage?: string;
}

type Screen = 'list' | 'chat' | 'users' | 'group-creation';

export default function EmployeeMessaging() {
  const { userProfile, authReady } = useAuth();
  const router = useRouter();
  const [currentScreen, setCurrentScreen] = useState<Screen>('list');
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);
  const [retryLoading, setRetryLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const sidebarX = useSharedValue(-SIDEBAR_WIDTH);
  const overlayOpacity = useSharedValue(0);
  const messagesUnsubscribe = useRef<(() => void) | null>(null);
  const chatsUnsubscribe = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!authReady) return;
    
    const uid = userProfile?.uid || auth.currentUser?.uid;
    
    if (uid) {
      console.debug('Setting up messaging for uid:', uid);
      loadUsers();
      
      try {
        chatsUnsubscribe.current = messagingService.getUserChats(uid, (snapshot) => {
          const chatData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Chat[];
          
          // Sort chats by lastMessageAt (newest first)
          chatData.sort((a, b) => {
            const aTime = a.lastMessageAt?.toDate?.() || new Date(0);
            const bTime = b.lastMessageAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          });
          
          setChats(chatData);
          setLoading(false);
        });
      } catch (error) {
        console.error('Error setting up chats listener:', error);
        setLoading(false);
      }
      
      return () => {
        if (chatsUnsubscribe.current) {
          chatsUnsubscribe.current();
          chatsUnsubscribe.current = null;
        }
      };
    } else {
      console.debug('No uid available, clearing state');
      setChats([]);
      setUsers([]);
      setLoading(false);
    }
  }, [userProfile, authReady]);
  
  // Close sidebar and cleanup when component unmounts
  useEffect(() => {
    return () => {
      setIsSidebarOpen(false);
      sidebarX.value = -SIDEBAR_WIDTH;
      overlayOpacity.value = 0;
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

  const loadUsers = async () => {
    const uid = userProfile?.uid || auth.currentUser?.uid;
    
    if (!uid) {
      if (!authReady) {
        console.debug('Auth not ready, waiting...');
        return;
      }
      console.debug('No uid available after auth ready');
      return;
    }
    
    console.debug('Starting loadUsers for uid:', uid);
    
    // Immediately set admin contact
    const adminContact = {
      id: 'admin-team',
      name: 'Admin Team',
      email: 'admin@teddyscleaning.com',
      role: 'admin' as const
    };
    setUsers([adminContact]);
    
    try {
      const allUsers = await messagingService.getMessagingUsers();
      const filteredUsers = allUsers.filter(user => user.id !== uid);
      
      console.debug('Fetched users count:', filteredUsers.length);
      setUsers(filteredUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      // Keep admin contact as fallback
      setUsers([adminContact]);
    }
  };

  const handleChatPress = (chat: Chat) => {
    setSelectedChat(chat);
    setCurrentScreen('chat');
    loadMessages(chat.id);
  };

  const loadMessages = (chatId: string) => {
    // Clean up previous listener
    if (messagesUnsubscribe.current) {
      messagesUnsubscribe.current();
      messagesUnsubscribe.current = null;
    }
    
    messagesUnsubscribe.current = messagingService.getChatMessages(chatId, (snapshot) => {
      const messageData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Message[];
      setMessages(messageData);
    });
  };

  const handleUserPress = async (user: User) => {
    const uid = userProfile?.uid || auth.currentUser?.uid;
    const userName = userProfile?.name || auth.currentUser?.displayName || 'User';
    
    if (!uid) {
      Alert.alert('Error', 'Authentication required');
      return;
    }
    
    console.log('[EMPLOYEE-MSG] Creating chat with employee ID:', uid, 'target ID:', user.id);
    
    try {
      const chatId = await messagingService.createDirectChat(
        uid,
        user.id,
        userName,
        user.name
      );
      const chat = chats.find(c => c.id === chatId) || {
        id: chatId,
        name: user.name,
        lastMessage: '',
        lastMessageAt: new Date(),
        isGroup: false,
        participants: [uid, user.id],
        participantNames: { [uid]: userName, [user.id]: user.name }
      };
      handleChatPress(chat);
    } catch (error) {
      Alert.alert('Error', 'Failed to create chat');
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

      // Safety checks for iOS 17+ partial photo access
      if (result.canceled || !result.assets?.length) {
        return;
      }

      if (selectedChat && result.assets[0]?.uri) {
        const uid = userProfile?.uid || auth.currentUser?.uid;
        const userName = userProfile?.name || auth.currentUser?.displayName || 'User';
        
        if (!uid) {
          Alert.alert('Error', 'Authentication required');
          return;
        }
        
        console.log('Sending image with uid:', uid, 'auth state:', !!auth.currentUser);
        await messagingService.sendMessage(
          selectedChat.id,
          uid,
          userName,
          '📷 Image',
          'image',
          result.assets[0].uri
        );
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to attach image');
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !selectedChat) return;
    
    const uid = userProfile?.uid || auth.currentUser?.uid;
    const userName = userProfile?.name || auth.currentUser?.displayName || 'User';
    
    if (!uid) {
      Alert.alert('Error', 'Authentication required');
      return;
    }
    
    try {
      console.log('Sending message with uid:', uid, 'auth state:', !!auth.currentUser);
      await messagingService.sendMessage(
        selectedChat.id,
        uid,
        userName,
        messageText.trim()
      );
      setMessageText('');
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', `Failed to send message: ${error.message}`);
    }
  };

  const toggleSidebar = () => {
    const isOpening = !isSidebarOpen;
    sidebarX.value = withSpring(isOpening ? 0 : -SIDEBAR_WIDTH, { damping: 15 });
    overlayOpacity.value = withTiming(isOpening ? 0.5 : 0, { duration: 300 });
    setIsSidebarOpen(isOpening);
  };
  
  const closeSidebar = () => {
    sidebarX.value = withSpring(-SIDEBAR_WIDTH, { damping: 15 });
    overlayOpacity.value = withTiming(0, { duration: 300 });
    setIsSidebarOpen(false);
  };

  const handleBack = () => {
    // Clean up messages listener
    if (messagesUnsubscribe.current) {
      messagesUnsubscribe.current();
      messagesUnsubscribe.current = null;
    }
    
    setSelectedChat(null);
    setMessages([]);
    setCurrentScreen('list');
  };

  const sidebarStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sidebarX.value }],
  }));

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const filteredUsers = messagingService.searchUsers(users, searchTerm);
  const filteredChats = chats.filter(chat => 
    chat.name && typeof chat.name === 'string' && chat.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatMessageTime = (createdAt: any) => {
    try {
      if (!createdAt) return 'now';
      if (createdAt.toDate && typeof createdAt.toDate === 'function') {
        return createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      if (createdAt instanceof Date) {
        return createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      }
      return 'now';
    } catch (error) {
      return 'now';
    }
  };

  const renderChatList = () => (
    <View style={styles.container}>
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <TouchableOpacity onPress={toggleSidebar} style={styles.menuButton}>
          <AntDesign name="menuunfold" size={26} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Image source={require('../../assets/teddy-logo.png')} style={styles.logo} />
          <View>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSubtitle}>Team Chat</Text>
          </View>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search chats and people..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <AntDesign name="loading1" size={24} color="#4facfe" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <>
            {/* Show existing chats */}
            {filteredChats.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Recent Chats</Text>
                {filteredChats.map((item) => (
                  <TouchableOpacity 
                    key={item.id}
                    style={styles.chatItem}
                    onPress={() => handleChatPress(item)}
                  >
                    <View style={[styles.avatar, item.name.includes('Admin') && styles.adminAvatar]}>
                      {item.profileImage ? (
                        <Image source={{ uri: item.profileImage }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>
                          {(() => {
                            const names = item.name.split(' ');
                            return names.length >= 2 
                              ? (names[0].charAt(0) + names[1].charAt(0)).toUpperCase()
                              : item.name.charAt(0).toUpperCase();
                          })()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.chatInfo}>
                      <Text style={styles.chatName}>{item.name}</Text>
                      <Text style={styles.lastMessage} numberOfLines={1}>
                        {item.lastMessage || 'No messages yet'}
                      </Text>
                    </View>
                    {item.isGroup && (
                      <Ionicons name="people" size={16} color="#666" />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Quick Admin Contact */}
            <View style={styles.quickContactContainer}>
              <TouchableOpacity 
                style={styles.quickAdminContact}
                onPress={() => handleUserPress({
                  id: 'admin-team',
                  name: 'Admin Team',
                  email: 'admin@teddyscleaning.com',
                  role: 'admin'
                })}
              >
                <LinearGradient colors={['#dc2626', '#ef4444']} style={styles.quickContactGradient}>
                  <View style={styles.quickContactIcon}>
                    <AntDesign name="message1" size={24} color="#fff" />
                  </View>
                  <View style={styles.quickContactInfo}>
                    <Text style={styles.quickContactTitle}>Message Admin Team</Text>
                    <Text style={styles.quickContactSubtitle}>Get help or report issues</Text>
                  </View>
                  <AntDesign name="right" size={16} color="rgba(255,255,255,0.8)" />
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Show admin users */}
            <Text style={styles.sectionTitle}>Admin Team</Text>
            {filteredUsers.filter(user => user.role === 'admin').map((item) => (
              <TouchableOpacity 
                key={item.id}
                style={[styles.userItem, styles.adminUserItem]}
                onPress={() => handleUserPress(item)}
              >
                <View style={[styles.avatar, styles.adminAvatar]}>
                  {item.profileImage ? (
                    <Image source={{ uri: item.profileImage }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {(() => {
                        const names = item.name.split(' ');
                        return names.length >= 2 
                          ? (names[0].charAt(0) + names[1].charAt(0)).toUpperCase()
                          : item.name.charAt(0).toUpperCase();
                      })()}
                    </Text>
                  )}
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{item.name}</Text>
                  <Text style={[styles.userRole, styles.adminRole]}>
                    👑 Admin Team - Tap to Message
                  </Text>
                </View>
                <View style={styles.priorityBadge}>
                  <Text style={styles.priorityText}>Available</Text>
                </View>
              </TouchableOpacity>
            ))}
            
            {/* Show employee users */}
            {filteredUsers.filter(user => user.role === 'employee').length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Team Members</Text>
                {filteredUsers.filter(user => user.role === 'employee').map((item) => (
                  <TouchableOpacity 
                    key={item.id}
                    style={styles.userItem}
                    onPress={() => handleUserPress(item)}
                  >
                    <View style={styles.avatar}>
                      {item.profileImage ? (
                        <Image source={{ uri: item.profileImage }} style={styles.avatarImage} />
                      ) : (
                        <Text style={styles.avatarText}>
                          {item.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.userInfo}>
                      <Text style={styles.userName}>{item.name}</Text>
                      <Text style={styles.userRole}>
                        👤 Employee
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </>
            )}
            
            {filteredUsers.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={48} color="#d1d5db" />
                <Text style={styles.emptyTitle}>No Team Members Found</Text>
                <Text style={styles.emptySubtitle}>Check console for debugging info</Text>
                <TouchableOpacity 
                  style={[styles.retryButton, retryLoading && { opacity: 0.6 }]}
                  onPress={async () => {
                    setRetryLoading(true);
                    await loadUsers();
                    setRetryLoading(false);
                  }}
                  disabled={retryLoading}
                >
                  <Text style={styles.retryText}>
                    {retryLoading ? 'Loading...' : 'Retry Loading Users'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );

  const renderUserList = () => (
    <View style={styles.container}>
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.menuButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Image source={require('../../assets/teddy-logo.png')} style={styles.logo} />
          <View>
            <Text style={styles.headerTitle}>New Message</Text>
            <Text style={styles.headerSubtitle}>Select Contact</Text>
          </View>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>
      
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employees..."
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Admin users first */}
      <Text style={styles.sectionTitle}>Admin Team</Text>
      {filteredUsers.filter(user => user.role === 'admin').map((item) => (
        <TouchableOpacity 
          key={item.id}
          style={[styles.userItem, styles.adminUserItem]}
          onPress={() => handleUserPress(item)}
        >
          <View style={[styles.avatar, styles.adminAvatar]}>
            {item.profileImage ? (
              <Image source={{ uri: item.profileImage }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarText}>
                {item.name.charAt(0).toUpperCase()}
              </Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{item.name}</Text>
            <Text style={[styles.userRole, styles.adminRole]}>
              👑 Admin - Start Chat
            </Text>
          </View>
        </TouchableOpacity>
      ))}
      
      {/* Employee users */}
      {filteredUsers.filter(user => user.role === 'employee').length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Employees</Text>
          {filteredUsers.filter(user => user.role === 'employee').map((item) => (
            <TouchableOpacity 
              key={item.id}
              style={styles.userItem}
              onPress={() => handleUserPress(item)}
            >
              <View style={styles.avatar}>
                {item.profileImage ? (
                  <Image source={{ uri: item.profileImage }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {item.name.charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userRole}>
                  👤 Employee
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </>
      )}
    </View>
  );

  const renderChat = () => (
    <View style={styles.container}>
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.menuButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Image source={require('../../assets/teddy-logo.png')} style={styles.logo} />
          <View>
            <Text style={styles.headerTitle}>{selectedChat?.name}</Text>
            <Text style={styles.headerSubtitle}>Chat</Text>
          </View>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const isOwnMessage = item.senderId === (userProfile?.uid || auth.currentUser?.uid);
          return (
            <View style={[
              styles.messageContainer,
              isOwnMessage ? styles.myMessage : styles.otherMessage
            ]}>
              {item.type === 'image' && item.imageUrl ? (
                <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
              ) : null}
              <Text style={[
                styles.messageText,
                isOwnMessage ? styles.myMessageText : styles.otherMessageText
              ]}>
                {item.text}
              </Text>
              <Text style={styles.messageTime}>
                {formatMessageTime(item.createdAt)}
              </Text>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={20}
        maxToRenderPerBatch={10}
        windowSize={10}
      />

      <View style={styles.inputContainer}>
        <TouchableOpacity 
          style={styles.attachButton}
          onPress={() => Alert.alert(
            'Attach File',
            'Choose attachment type',
            [
              { text: 'Camera', onPress: () => attachImage('camera') },
              { text: 'Gallery', onPress: () => attachImage('gallery') },
              { text: 'Cancel', style: 'cancel' }
            ]
          )}
        >
          <Ionicons name="attach" size={20} color="#666" />
        </TouchableOpacity>
        <TextInput
          style={styles.messageInput}
          placeholder="Type a message..."
          value={messageText}
          onChangeText={setMessageText}
          multiline
        />
        <TouchableOpacity 
          style={styles.sendButton}
          onPress={sendMessage}
          disabled={!messageText.trim()}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderScreen = () => {
    switch (currentScreen) {
      case 'chat':
        return renderChat();
      case 'users':
        return renderUserList();
      default:
        return renderChatList();
    }
  };

  // Enhanced navigation cleanup
  const handleNavigation = (route: string) => {
    // Close sidebar
    closeSidebar();
    
    // Clean up listeners
    if (messagesUnsubscribe.current) {
      messagesUnsubscribe.current();
      messagesUnsubscribe.current = null;
    }
    
    router.replace(route);
  };

  return (
    <SafeAreaView style={styles.container}>
      {isSidebarOpen && (
        <Animated.View style={[styles.overlay, overlayStyle]}>
          <TouchableOpacity style={styles.overlayTouch} onPress={toggleSidebar} />
        </Animated.View>
      )}

      <Animated.View style={[styles.sidebar, sidebarStyle]}>
        <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.sidebarGradient}>
          <View style={styles.sidebarHeader}>
            <View style={styles.sidebarProfile}>
              <View style={styles.avatarContainer}>
                {userProfile?.profilePicture || userProfile?.profileImage ? (
                  <Image 
                    source={{ uri: userProfile.profilePicture || userProfile.profileImage }} 
                    style={styles.sidebarAvatarImage} 
                    onError={() => console.log('Profile image failed to load')}
                  />
                ) : (
                  <AntDesign name="user" size={24} color="#fff" />
                )}
              </View>
              <View>
                <Text style={styles.sidebarUserName}>Welcome Back{userProfile?.firstName ? `, ${userProfile.firstName}!` : userProfile?.name ? `, ${userProfile.name.split(' ')[0]}!` : '!'}</Text>
                <Text style={styles.sidebarUserRole}>Cleaning Professional</Text>
              </View>
            </View>
            <TouchableOpacity onPress={toggleSidebar} style={styles.closeButton}>
              <AntDesign name="close" size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          <View style={styles.sidebarDivider} />

          <TouchableOpacity style={styles.sidebarItem} onPress={() => handleNavigation('/(employee-tabs)/dashboard')}>
            <AntDesign name="home" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Employee Dashboard</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarItem} onPress={() => handleNavigation('/(employee-tabs)/jobs')}>
            <Feather name="briefcase" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Job Sites & Tracking</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarItem} onPress={() => handleNavigation('/(employee-tabs)/messaging')}>
            <AntDesign name="message1" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Messages</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarItem} onPress={() => handleNavigation('/(employee-tabs)/news')}>
            <MaterialCommunityIcons name="newspaper" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>News</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={() => handleNavigation('/(employee-tabs)/profile')}>
            <AntDesign name="user" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Profile</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.sidebarItem} onPress={() => handleNavigation('/(employee-tabs)/schedule')}>
            <AntDesign name="calendar" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Schedule</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.sidebarItem} onPress={() => { router.push("/settings"); closeSidebar(); }}>
            <AntDesign name="setting" size={22} color="#fff" style={styles.sidebarIcon} />
            <Text style={styles.sidebarText}>Settings</Text>
            <AntDesign name="right" size={16} color="rgba(255,255,255,0.6)" />
          </TouchableOpacity>

          <View style={styles.sidebarFooter}>
            <TouchableOpacity style={styles.logoutButton} onPress={() => {
              Alert.alert(
                "Sign Out",
                "Are you sure you want to sign out?",
                [
                  { text: "Cancel", style: "cancel" },
                  { 
                    text: "Sign Out", 
                    style: "destructive",
                    onPress: () => handleNavigation("/")
                  }
                ]
              );
            }}>
              <AntDesign name="logout" size={20} color="#fff" />
              <Text style={styles.logoutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animated.View>

      {renderScreen()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'black',
    zIndex: 15,
  },
  overlayTouch: {
    flex: 1,
  },
  sidebar: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_WIDTH,
    zIndex: 20,
    elevation: 16,
  },
  sidebarGradient: {
    flex: 1,
    paddingTop: 60,
  },
  sidebarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sidebarProfile: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sidebarAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  sidebarUserName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  sidebarUserRole: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  sidebarDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  sidebarItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginBottom: 8,
  },
  sidebarIcon: {
    marginRight: 16,
  },
  sidebarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  sidebarFooter: {
    marginTop: "auto",
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingVertical: 12,
    borderRadius: 12,
  },
  logoutText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  menuButton: {
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
  headerRight: {
    width: 40,
  },
  newChatButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  scrollContent: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  avatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  chatInfo: {
    flex: 1,
  },
  chatName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    color: '#64748b',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: '#64748b',
  },
  messageContainer: {
    maxWidth: '80%',
    marginVertical: 4,
    marginHorizontal: 16,
    padding: 12,
    borderRadius: 16,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3b82f6',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  messageText: {
    fontSize: 16,
    color: '#1e293b',
  },
  messageTime: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  attachButton: {
    padding: 12,
    marginRight: 8,
  },
  messageInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    maxHeight: 100,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 8,
  },
  myMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#1e293b',
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
    textAlign: 'center',
  },
  adminAvatar: {
    backgroundColor: '#dc2626',
  },
  adminUserItem: {
    borderColor: '#fecaca',
    backgroundColor: '#fef2f2',
  },
  adminRole: {
    color: '#dc2626',
    fontWeight: '600',
  },
  priorityBadge: {
    backgroundColor: '#dc2626',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  retryButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginTop: 16,
  },
  retryText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  quickContactContainer: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  quickAdminContact: {
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  quickContactGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  quickContactIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickContactInfo: {
    flex: 1,
  },
  quickContactTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  quickContactSubtitle: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontWeight: '500',
  },
});