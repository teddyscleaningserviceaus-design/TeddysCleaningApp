import React, { createContext, useContext, useState, useEffect } from 'react';
import { messagingService } from '../services/messagingService';
import { useAuth } from './AuthContext';

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: Date;
  type: 'text' | 'image' | 'emoji';
  imageUrl?: string;
  chatId: string;
}

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  isGroup: boolean;
  avatar?: string;
  participants?: string[];
  createdBy?: string;
  createdAt?: Date;
}

interface ChatContextType {
  chats: Chat[];
  messages: { [chatId: string]: Message[] };
  setMessages: React.Dispatch<React.SetStateAction<{ [chatId: string]: Message[] }>>;
  sendMessage: (chatId: string, text: string, type?: 'text' | 'image' | 'emoji', imageUrl?: string) => Promise<void>;
  createDirectChat: (targetUserId: string, targetUserName: string) => Promise<string>;
  createGroup: (name: string, participantIds: string[]) => Promise<Chat>;
  markAsRead: (chatId: string) => void;
  loading: boolean;
  loadChatMessages: (chatId: string) => void;
}

const FirebaseChatContext = createContext<ChatContextType>({
  chats: [],
  messages: {},
  setMessages: () => {},
  sendMessage: async () => {},
  createDirectChat: async () => '',
  createGroup: async () => ({} as Chat),
  markAsRead: () => {},
  loading: true,
  loadChatMessages: () => {},
});

export const useFirebaseChat = () => useContext(FirebaseChatContext);

export const FirebaseChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userProfile } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<{ [chatId: string]: Message[] }>({});
  const [loading, setLoading] = useState(true);
  const [chatUnsubscribes, setChatUnsubscribes] = useState<{ [chatId: string]: () => void }>({});

  useEffect(() => {
    if (userProfile?.uid) {
      loadUserChats();
    }
    return () => {
      // Cleanup all subscriptions
      Object.values(chatUnsubscribes).forEach(unsubscribe => unsubscribe());
    };
  }, [userProfile]);

  const loadUserChats = () => {
    if (!userProfile?.uid) return;

    const unsubscribe = messagingService.getUserChats(userProfile.uid, (snapshot) => {
      const userChats = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.isGroup ? data.name : getDirectChatName(data, userProfile.uid),
          lastMessage: data.lastMessage || '',
          timestamp: formatTimestamp(data.lastMessageAt?.toDate()),
          unreadCount: 0,
          isGroup: data.isGroup || false,
          participants: data.participants || [],
          createdBy: data.createdBy,
          createdAt: data.createdAt?.toDate(),
        };
      });
      
      setChats(userChats);
      setLoading(false);
    });

    return unsubscribe;
  };

  const getDirectChatName = (chatData: any, currentUserId: string) => {
    if (chatData.isGroup) return chatData.name;
    
    const otherUserId = chatData.participants?.find((id: string) => id !== currentUserId);
    return chatData.participantNames?.[otherUserId] || 'Unknown User';
  };

  const loadChatMessages = (chatId: string) => {
    if (chatUnsubscribes[chatId]) return; // Already subscribed

    const unsubscribe = messagingService.getChatMessages(chatId, (snapshot) => {
      const chatMessages = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          text: data.text || '',
          userId: data.userId,
          userName: data.userName,
          timestamp: data.createdAt?.toDate() || new Date(),
          type: data.type || 'text',
          imageUrl: data.imageUrl,
          chatId: data.chatId,
        };
      });

      setMessages(prev => ({
        ...prev,
        [chatId]: chatMessages,
      }));
    });

    setChatUnsubscribes(prev => ({
      ...prev,
      [chatId]: unsubscribe,
    }));
  };

  const formatTimestamp = (timestamp?: Date) => {
    if (!timestamp) return '';
    const now = new Date();
    const diffInHours = (now.getTime() - timestamp.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'now';
    } else if (diffInHours < 24) {
      return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return timestamp.toLocaleDateString();
    }
  };

  const sendMessage = async (
    chatId: string,
    text: string,
    type: 'text' | 'image' | 'emoji' = 'text',
    imageUrl?: string
  ) => {
    if (!userProfile || (!text.trim() && !imageUrl)) return;

    try {
      await messagingService.sendMessage(
        chatId,
        userProfile.uid,
        userProfile.name || userProfile.firstName || 'User',
        text.trim(),
        type,
        imageUrl
      );

      // Update chat's last message in local state
      setChats(prev => prev.map(chat => 
        chat.id === chatId 
          ? { 
              ...chat, 
              lastMessage: type === 'image' ? '📷 Image' : text,
              timestamp: 'now',
            }
          : chat
      ));
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const createDirectChat = async (targetUserId: string, targetUserName: string): Promise<string> => {
    if (!userProfile) throw new Error('User not authenticated');

    try {
      const chatId = await messagingService.createDirectChat(
        userProfile.uid,
        targetUserId,
        userProfile.name || userProfile.firstName || 'User',
        targetUserName
      );

      // Reload chats to include the new one
      loadUserChats();
      
      return chatId;
    } catch (error) {
      console.error('Error creating direct chat:', error);
      throw error;
    }
  };

  const createGroup = async (name: string, participantIds: string[]): Promise<Chat> => {
    if (!userProfile) throw new Error('User not authenticated');

    try {
      // Get participant names
      const users = await messagingService.getMessagingUsers();
      const participantNames = {};
      participantIds.forEach(id => {
        const user = users.find(u => u.id === id);
        if (user) {
          participantNames[id] = user.name;
        }
      });
      participantNames[userProfile.uid] = userProfile.name || userProfile.firstName || 'User';

      const chatId = await messagingService.createGroupChat(
        name,
        userProfile.uid,
        participantIds,
        participantNames
      );

      const newGroup: Chat = {
        id: chatId,
        name,
        lastMessage: '',
        timestamp: 'now',
        unreadCount: 0,
        isGroup: true,
        participants: [...participantIds, userProfile.uid],
        createdBy: userProfile.uid,
        createdAt: new Date(),
      };

      setChats(prev => [newGroup, ...prev]);
      setMessages(prev => ({ ...prev, [chatId]: [] }));

      return newGroup;
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  };

  const markAsRead = (chatId: string) => {
    setChats(prev => prev.map(chat => 
      chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
    ));
  };

  return (
    <FirebaseChatContext.Provider value={{
      chats,
      messages,
      setMessages,
      sendMessage,
      createDirectChat,
      createGroup,
      markAsRead,
      loading,
      loadChatMessages,
    }}>
      {children}
    </FirebaseChatContext.Provider>
  );
};