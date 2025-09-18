import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, StatusBar, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { collection, query, where, onSnapshot, addDoc, orderBy, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { auth, db, storage } from '../config/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useClient } from '../contexts/ClientContext';

export default function ClientChat() {
  const router = useRouter();
  const { clientData } = useClient();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const scrollViewRef = useRef(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('clientId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      // Sort messages by createdAt in JavaScript
      messagesList.sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return aTime - bTime;
      });
      setMessages(messagesList);
      
      // Mark admin messages as read
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.sender === 'admin' && !data.readByClient) {
          updateDoc(doc.ref, { readByClient: true });
        }
      });
      
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return unsubscribe;
  }, []);

  const sendMessage = async (imageUrl = null) => {
    if (!newMessage.trim() && !imageUrl) return;

    const user = auth.currentUser;
    if (!user) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'chats'), {
        clientId: user.uid,
        clientName: clientData?.firstName || clientData?.name || 'Client',
        message: newMessage.trim(),
        imageUrl: imageUrl,
        sender: 'client',
        readByAdmin: false,
        readByClient: true,
        createdAt: new Date()
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please grant camera roll permissions to send images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });

    if (!result.canceled && result.assets[0]) {
      uploadImage(result.assets[0].uri);
    }
  };

  const uploadImage = async (uri) => {
    const user = auth.currentUser;
    if (!user) return;

    setUploading(true);
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      const filename = `chat-images/${user.uid}/${Date.now()}.jpg`;
      const imageRef = ref(storage, filename);
      
      await uploadBytes(imageRef, blob);
      const downloadURL = await getDownloadURL(imageRef);
      
      await sendMessage(downloadURL);
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload failed', 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const today = new Date();
    const messageDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    if (messageDate.getTime() === todayDate.getTime()) {
      return 'Today';
    } else if (messageDate.getTime() === todayDate.getTime() - 86400000) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderMessage = (message, index) => {
    const isClient = message.sender === 'client';
    const showDate = index === 0 || 
      formatDate(message.createdAt) !== formatDate(messages[index - 1]?.createdAt);

    return (
      <View key={message.id}>
        {showDate && (
          <View style={styles.dateHeader}>
            <Text style={styles.dateText}>{formatDate(message.createdAt)}</Text>
          </View>
        )}
        <View style={[styles.messageContainer, isClient ? styles.clientMessage : styles.adminMessage]}>
          <View style={[styles.messageBubble, isClient ? styles.clientBubble : styles.adminBubble]}>
            {!isClient && (
              <Text style={styles.senderName}>Support Team</Text>
            )}
            {message.imageUrl ? (
              <TouchableOpacity onPress={() => Alert.alert('Image', 'Tap and hold to save image')}>
                <Image source={{ uri: message.imageUrl }} style={styles.messageImage} />
              </TouchableOpacity>
            ) : null}
            {message.message ? (
              <Text style={[styles.messageText, isClient ? styles.clientText : styles.adminText]}>
                {message.message}
              </Text>
            ) : null}
            <Text style={[styles.messageTime, isClient ? styles.clientTime : styles.adminTime]}>
              {formatTime(message.createdAt)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Support Chat</Text>
          <Text style={styles.headerSubtitle}>Live chat with our team</Text>
        </View>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <KeyboardAvoidingView 
        style={styles.chatContainer} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          ref={scrollViewRef}
          style={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        >
          {messages.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="chatbubbles-outline" size={64} color="#ccc" />
              <Text style={styles.emptyTitle}>Start a conversation</Text>
              <Text style={styles.emptyText}>
                Send us a message and we'll get back to you right away!
              </Text>
            </View>
          ) : (
            messages.map((message, index) => renderMessage(message, index))
          )}
        </ScrollView>

        <View style={styles.inputContainer}>
          <TouchableOpacity
            style={styles.imageButton}
            onPress={pickImage}
            disabled={uploading}
          >
            <Ionicons name={uploading ? "hourglass" : "camera"} size={20} color="#4facfe" />
          </TouchableOpacity>
          <TextInput
            style={styles.messageInput}
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type your message..."
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!newMessage.trim() || loading) && styles.sendButtonDisabled]}
            onPress={() => sendMessage()}
            disabled={!newMessage.trim() || loading}
          >
            <Ionicons name="send" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { padding: 8 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  headerSpacer: { width: 40 },
  chatContainer: { flex: 1 },
  messagesContainer: { flex: 1, padding: 16 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 16, marginBottom: 8 },
  emptyText: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  dateHeader: { alignItems: 'center', marginVertical: 16 },
  dateText: { fontSize: 12, color: '#666', backgroundColor: '#e2e8f0', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  messageContainer: { marginBottom: 12 },
  clientMessage: { alignItems: 'flex-end' },
  adminMessage: { alignItems: 'flex-start' },
  messageBubble: { maxWidth: '80%', padding: 12, borderRadius: 16 },
  clientBubble: { backgroundColor: '#4facfe' },
  adminBubble: { backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  senderName: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 },
  messageText: { fontSize: 16, lineHeight: 20 },
  clientText: { color: '#fff' },
  adminText: { color: '#333' },
  messageTime: { fontSize: 11, marginTop: 4 },
  clientTime: { color: 'rgba(255,255,255,0.8)' },
  adminTime: { color: '#999' },
  inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: 16, backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#e2e8f0' },
  imageButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0f8ff', alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  messageInput: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, marginRight: 12, maxHeight: 100, fontSize: 16 },
  sendButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4facfe', alignItems: 'center', justifyContent: 'center' },
  sendButtonDisabled: { backgroundColor: '#ccc' },
  messageImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 4 }
});