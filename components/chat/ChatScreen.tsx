import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, FlatList, Image, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useChat } from '../../contexts/ChatContext';
import { uploadChatImage } from '../../config/supabase';
import { chatService } from '../../config/supabase-chat';
import EmojiPicker from './EmojiPicker';

interface Message {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: Date;
  type: 'text' | 'image' | 'emoji';
  imageUrl?: string;
  avatar?: string;
}

interface ChatScreenProps {
  chatId: string;
  chatName: string;
  isGroup: boolean;
  onBack: () => void;
  currentUserId: string;
  currentUserName: string;
}

export default function ChatScreen({ 
  chatId, 
  chatName, 
  isGroup, 
  onBack, 
  currentUserId, 
  currentUserName 
}: ChatScreenProps) {
  const { messages: allMessages, sendMessage, setMessages } = useChat();
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  
  const messages = allMessages[chatId] || [];
  const [lastMessageTime, setLastMessageTime] = useState(new Date().toISOString());

  // Poll for new messages every 2 seconds when chat is active
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const chatMessages = await chatService.getChatMessages(chatId);
        const formattedMessages = chatMessages.map(msg => ({
          id: msg.id,
          text: msg.text,
          userId: msg.user_id,
          userName: msg.user_name,
          timestamp: new Date(msg.created_at),
          type: msg.type,
          imageUrl: msg.image_url,
          chatId: msg.chat_id
        }));
        
        // Update messages in context
        setMessages(prev => ({ ...prev, [chatId]: formattedMessages }));
      } catch (error) {
        console.error('Error loading messages:', error);
      }
    };

    loadMessages();

    const interval = setInterval(async () => {
      try {
        const newMessages = await chatService.getChatMessagesSince(chatId, lastMessageTime);
        if (newMessages.length > 0) {
          const formattedMessages = newMessages.map(msg => ({
            id: msg.id,
            text: msg.text,
            userId: msg.user_id,
            userName: msg.user_name,
            timestamp: new Date(msg.created_at),
            type: msg.type,
            imageUrl: msg.image_url,
            chatId: msg.chat_id
          }));
          
          setMessages(prev => ({
            ...prev,
            [chatId]: [...(prev[chatId] || []), ...formattedMessages]
          }));
          
          setLastMessageTime(new Date().toISOString());
        }
      } catch (error) {
        console.error('Error polling messages:', error);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [chatId]);

  const handleSendMessage = async (text: string, type: 'text' | 'image' | 'emoji' = 'text', imageUrl?: string) => {
    await sendMessage(chatId, text, type, imageUrl);
    setInputText('');
    
    // Auto-scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      const fileName = `image_${Date.now()}.jpg`;
      const uploadResult = await uploadChatImage(chatId, result.assets[0].uri, fileName);
      
      if (uploadResult.success) {
        handleSendMessage('📷 Photo', 'image', uploadResult.url);
      } else {
        Alert.alert('Upload Error', 'Failed to upload image. Please try again.');
      }
    }
  };

  const onEmojiSelected = (emoji: string) => {
    setInputText(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwnMessage = item.userId === currentUserId;
    
    return (
      <View style={[
        styles.messageContainer,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}>
        {!isOwnMessage && isGroup && (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.userName.charAt(0)}</Text>
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isOwnMessage ? styles.ownBubble : styles.otherBubble
        ]}>
          {!isOwnMessage && isGroup && (
            <Text style={styles.senderName}>{item.userName}</Text>
          )}
          
          {item.type === 'image' && item.imageUrl && (
            <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
          )}
          
          <Text style={[
            styles.messageText,
            isOwnMessage ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.text}
          </Text>
          
          <Text style={[
            styles.timestamp,
            isOwnMessage ? styles.ownTimestamp : styles.otherTimestamp
          ]}>
            {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>{chatName}</Text>
          {isGroup && <Text style={styles.headerSubtitle}>Group Chat</Text>}
        </View>
        <TouchableOpacity style={styles.infoButton}>
          <Ionicons name="information-circle-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      />

      {showEmojiPicker && (
        <EmojiPicker onEmojiSelected={onEmojiSelected} />
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity onPress={pickImage} style={styles.attachButton}>
          <Ionicons name="camera" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type a message..."
          multiline
          maxLength={500}
        />
        
        <TouchableOpacity 
          onPress={() => setShowEmojiPicker(!showEmojiPicker)} 
          style={styles.emojiButton}
        >
          <Ionicons name="happy-outline" size={24} color="#007AFF" />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => handleSendMessage(inputText)} 
          style={[styles.sendButton, inputText.trim() ? styles.sendButtonActive : null]}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#6b7280',
  },
  infoButton: {
    padding: 8,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingVertical: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: 4,
    paddingHorizontal: 16,
  },
  ownMessage: {
    justifyContent: 'flex-end',
  },
  otherMessage: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 18,
  },
  ownBubble: {
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
  },
  senderName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 8,
    marginBottom: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: '#fff',
  },
  otherMessageText: {
    color: '#1f2937',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
  },
  ownTimestamp: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'right',
  },
  otherTimestamp: {
    color: '#9ca3af',
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  attachButton: {
    padding: 8,
    marginRight: 8,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
    fontSize: 16,
  },
  emojiButton: {
    padding: 8,
    marginLeft: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#9ca3af',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  sendButtonActive: {
    backgroundColor: '#007AFF',
  },
});