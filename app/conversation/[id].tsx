import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, Image, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { AntDesign, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { collection, query, where, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import * as ImagePicker from 'expo-image-picker';
import { db } from '../../config/firebase';
import { useAuth } from '../../contexts/AuthContext';
import { imageService } from '../../services/imageService';

export default function ConversationDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [conversation, setConversation] = useState(null);
  const [otherParticipantName, setOtherParticipantName] = useState('Chat');
  const [showAttachmentOptions, setShowAttachmentOptions] = useState(false);
  const flatListRef = useRef(null);

  useEffect(() => {
    if (!id) return;

    // Load conversation details
    const loadConversation = async () => {
      try {
        const convDoc = await getDoc(doc(db, 'conversations', id));
        if (convDoc.exists()) {
          const convData = convDoc.data();
          setConversation(convData);
          
          // Get other participant's name
          if (convData.participantNames) {
            const currentUserName = user?.displayName || user?.email || 'You';
            const otherName = convData.participantNames.find(name => name !== currentUserName);
            setOtherParticipantName(otherName || 'Chat');
          }
        }
      } catch (error) {
        console.error('Error loading conversation:', error);
      }
    };

    loadConversation();

    const messagesQuery = query(
      collection(db, 'messages'),
      where('conversationId', '==', id)
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const messageData = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => (a.createdAt?.toDate?.() || new Date()) - (b.createdAt?.toDate?.() || new Date()));
      setMessages(messageData);
      
      // Auto scroll to bottom when new messages arrive
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return unsubscribe;
  }, [id, user]);

  const sendMessage = async () => {
    if (!messageText.trim() || !id) return;

    try {
      await addDoc(collection(db, 'messages'), {
        conversationId: id,
        senderId: user?.uid,
        userName: user?.displayName || user?.email || 'User',
        text: messageText.trim(),
        type: 'text',
        createdAt: serverTimestamp()
      });
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to send images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri: string) => {
    if (!id) return;
    
    setUploading(true);
    try {
      const downloadURL = await imageService.uploadMessageImage(id, uri);
      
      await addDoc(collection(db, 'messages'), {
        conversationId: id,
        senderId: user?.uid,
        userName: user?.displayName || user?.email || 'User',
        imageUrl: downloadURL,
        type: 'image',
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to send image');
    } finally {
      setUploading(false);
      setShowAttachmentOptions(false);
    }
  };



  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera permissions.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri);
    }
  };

  const renderMessage = ({ item }) => {
    const isOwnMessage = item.senderId === user?.uid;
    
    return (
      <View style={[styles.messageContainer, isOwnMessage && styles.ownMessage]}>
        {!isOwnMessage && (
          <View style={styles.avatarContainer}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(item.userName || 'U').charAt(0).toUpperCase()}
              </Text>
            </View>
          </View>
        )}
        
        <View style={[styles.messageBubble, isOwnMessage && styles.ownMessageBubble]}>
          {!isOwnMessage && (
            <Text style={styles.messageUser}>{item.userName}</Text>
          )}
          
          {item.type === 'image' ? (
            <TouchableOpacity onPress={() => Alert.alert('Image', 'Full size image view')}>
              <Image source={{ uri: item.imageUrl }} style={styles.messageImage} />
            </TouchableOpacity>
          ) : (
            <Text style={[styles.messageText, isOwnMessage && styles.ownMessageText]}>{item.text}</Text>
          )}
          
          <Text style={[styles.messageTime, isOwnMessage && styles.ownMessageTime]}>
            {item.createdAt?.toDate?.()?.toLocaleTimeString() || 'Sending...'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{otherParticipantName}</Text>
          <Text style={styles.headerSubtitle}>Tap to view profile</Text>
        </View>
        
        <TouchableOpacity style={styles.headerButton}>
          <Ionicons name="call" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
      />

      {showAttachmentOptions && (
        <View style={styles.attachmentOptions}>
          <TouchableOpacity style={styles.attachmentOption} onPress={takePhoto}>
            <Ionicons name="camera" size={24} color="#4facfe" />
            <Text style={styles.attachmentText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachmentOption} onPress={pickImage}>
            <MaterialIcons name="image" size={24} color="#4facfe" />
            <Text style={styles.attachmentText}>Gallery</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.inputContainer}>
        <TouchableOpacity 
          onPress={() => setShowAttachmentOptions(!showAttachmentOptions)} 
          style={styles.attachButton}
          disabled={uploading}
        >
          <MaterialIcons 
            name={showAttachmentOptions ? "close" : "attach-file"} 
            size={24} 
            color={uploading ? "#9ca3af" : "#4facfe"} 
          />
        </TouchableOpacity>
        
        <TextInput
          style={styles.textInput}
          value={messageText}
          onChangeText={setMessageText}
          placeholder="Type a message..."
          placeholderTextColor="#9ca3af"
          multiline
          maxLength={1000}
        />
        
        <TouchableOpacity 
          onPress={sendMessage} 
          style={[styles.sendButton, !messageText.trim() && styles.sendButtonDisabled]}
          disabled={!messageText.trim() || uploading}
        >
          {uploading ? (
            <MaterialIcons name="hourglass-empty" size={20} color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    padding: 16,
    paddingTop: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButton: { 
    padding: 8, 
    marginRight: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  headerButton: { 
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)'
  },
  messagesList: { flex: 1 },
  messagesContent: { padding: 16, paddingBottom: 8 },
  messageContainer: { 
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end'
  },
  ownMessage: { 
    flexDirection: 'row-reverse',
    alignSelf: 'flex-end'
  },
  avatarContainer: { marginRight: 8, marginBottom: 4 },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4facfe',
    alignItems: 'center',
    justifyContent: 'center'
  },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  messageBubble: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 16,
    maxWidth: '75%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  ownMessageBubble: {
    backgroundColor: '#4facfe',
    marginLeft: 8,
    marginRight: 0
  },
  messageUser: { 
    fontSize: 12, 
    fontWeight: '600', 
    marginBottom: 4, 
    color: '#6b7280' 
  },
  messageText: { fontSize: 15, color: '#1f2937', lineHeight: 20 },
  ownMessageText: { color: '#fff' },
  messageTime: { 
    fontSize: 10, 
    color: '#9ca3af', 
    marginTop: 6,
    alignSelf: 'flex-end'
  },
  ownMessageTime: { color: 'rgba(255,255,255,0.8)' },
  messageImage: { 
    width: 200, 
    height: 150, 
    borderRadius: 12, 
    marginVertical: 4 
  },

  attachmentOptions: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    justifyContent: 'space-around'
  },
  attachmentOption: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    minWidth: 80
  },
  attachmentText: {
    fontSize: 12,
    color: '#4facfe',
    marginTop: 4,
    fontWeight: '600'
  },
  inputContainer: { 
    flexDirection: 'row', 
    padding: 16, 
    backgroundColor: '#fff', 
    alignItems: 'flex-end',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
  },
  attachButton: { 
    padding: 12, 
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f8fafc'
  },
  textInput: { 
    flex: 1, 
    borderWidth: 1, 
    borderColor: '#e5e7eb', 
    borderRadius: 20, 
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8, 
    maxHeight: 100,
    fontSize: 15,
    backgroundColor: '#f8fafc'
  },
  sendButton: { 
    backgroundColor: '#4facfe',
    padding: 12, 
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
    minHeight: 44
  },
  sendButtonDisabled: {
    backgroundColor: '#d1d5db'
  }
});