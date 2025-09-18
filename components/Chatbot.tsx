import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

interface ChatMessage {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

interface ChatbotProps {
  userType?: 'client' | 'admin' | 'employee' | 'guest';
  userName?: string;
}

const { width, height } = Dimensions.get('window');

export default function Chatbot({ userType = 'client', userName = 'User' }: ChatbotProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const slideAnim = useRef(new Animated.Value(height)).current;

  useEffect(() => {
    loadChatHistory();
  }, []);

  useEffect(() => {
    if (isVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.spring(slideAnim, {
        toValue: height,
        useNativeDriver: true,
      }).start();
    }
  }, [isVisible]);

  const loadChatHistory = async () => {
    try {
      const history = await AsyncStorage.getItem('chatbot_history');
      if (history) {
        const parsedHistory = JSON.parse(history).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(parsedHistory);
      } else {
        // Welcome message
        const welcomeMessage: ChatMessage = {
          id: Date.now().toString(),
          text: `Hi ${userName}! 👋 I'm Teddy, your AI assistant. How can I help you today?`,
          isBot: true,
          timestamp: new Date()
        };
        setMessages([welcomeMessage]);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  };

  const saveChatHistory = async (newMessages: ChatMessage[]) => {
    try {
      await AsyncStorage.setItem('chatbot_history', JSON.stringify(newMessages));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  };

  const getBotResponse = (userMessage: string): string => {
    const message = userMessage.toLowerCase();
    
    // Service-related queries
    if (message.includes('book') || message.includes('schedule') || message.includes('appointment')) {
      return "I can help you book a cleaning service! You can choose from regular cleaning, deep cleaning, or end-of-lease cleaning. Would you like me to guide you through the booking process?";
    }
    
    if (message.includes('price') || message.includes('cost') || message.includes('how much')) {
      return "Our pricing varies by service type:\n• Regular Clean: From $120\n• Deep Clean: From $280\n• End of Lease: From $350\n• Office Clean: Custom quote\n\nPrices depend on property size and specific requirements. Would you like a detailed quote?";
    }
    
    if (message.includes('cancel') || message.includes('reschedule')) {
      return "I understand you need to make changes to your booking. You can cancel or reschedule up to 24 hours before your appointment. Would you like me to help you with this?";
    }
    
    if (message.includes('clean') || message.includes('service')) {
      return "We offer comprehensive cleaning services using eco-friendly products and science-based methods. Our services include regular maintenance, deep cleaning, and specialized cleaning for move-outs. What specific cleaning service interests you?";
    }
    
    if (message.includes('time') || message.includes('when') || message.includes('available')) {
      return "We're available 7 days a week from 7 AM to 7 PM. Most cleaning sessions take 2-4 hours depending on the service type and property size. When would be convenient for you?";
    }
    
    if (message.includes('eco') || message.includes('green') || message.includes('safe')) {
      return "Yes! We use 100% biodegradable, eco-friendly cleaning products that are safe for your family and pets. Our methods reduce water usage by 50% and contain zero harsh chemicals. 🌱";
    }
    
    if (message.includes('employee') || message.includes('staff') || message.includes('cleaner')) {
      return "All our cleaning professionals are thoroughly vetted, trained, and insured. They follow our science-based cleaning protocols and use professional-grade equipment. You'll receive notifications when they're on their way!";
    }
    
    // User type specific responses
    if (userType === 'admin') {
      if (message.includes('dashboard') || message.includes('manage')) {
        return "As an admin, you can manage jobs, employees, and view analytics from your dashboard. You can also create new jobs, review work requests, and monitor team performance. Need help with any specific admin task?";
      }
    }
    
    if (userType === 'employee') {
      if (message.includes('job') || message.includes('task') || message.includes('schedule')) {
        return "You can view your assigned jobs, update job progress, and communicate with the team through your employee dashboard. Don't forget to mark tasks as complete and upload any required photos!";
      }
    }
    
    if (userType === 'guest') {
      if (message.includes('account') || message.includes('sign up')) {
        return "As a guest, you can book services without creating an account. However, creating an account gives you access to booking history, loyalty rewards, and easier rebooking. Would you like to create an account?";
      }
    }
    
    // General queries
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      return `Hello ${userName}! 😊 I'm here to help with any questions about our cleaning services. What can I assist you with today?`;
    }
    
    if (message.includes('help') || message.includes('support')) {
      return "I'm here to help! I can assist with:\n• Booking services\n• Pricing information\n• Service details\n• Scheduling questions\n• Account support\n\nWhat would you like to know more about?";
    }
    
    if (message.includes('contact') || message.includes('phone') || message.includes('email')) {
      return "You can reach us at:\n📞 (03) 1234 5678\n📧 hello@teddyscleaning.com\n\nOr continue chatting with me for immediate assistance! I'm available 24/7.";
    }
    
    if (message.includes('location') || message.includes('area') || message.includes('where')) {
      return "We service the greater Melbourne area and surrounding suburbs. If you're unsure whether we service your area, just let me know your postcode and I'll check for you!";
    }
    
    // Default response
    return "I'd be happy to help! I can assist with booking services, pricing, scheduling, and general questions about Teddy's Cleaning. Could you please be more specific about what you'd like to know?";
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isBot: false,
      timestamp: new Date()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsTyping(true);

    // Simulate bot typing delay
    setTimeout(() => {
      const botResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: getBotResponse(inputText.trim()),
        isBot: true,
        timestamp: new Date()
      };

      const finalMessages = [...newMessages, botResponse];
      setMessages(finalMessages);
      saveChatHistory(finalMessages);
      setIsTyping(false);
      
      // Auto scroll to bottom
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }, 1000 + Math.random() * 1000);

    // Auto scroll to bottom for user message
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem('chatbot_history');
      const welcomeMessage: ChatMessage = {
        id: Date.now().toString(),
        text: `Hi ${userName}! 👋 I'm Teddy, your AI assistant. How can I help you today?`,
        isBot: true,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error clearing chat history:', error);
    }
  };

  const renderMessage = (message: ChatMessage) => (
    <View key={message.id} style={[
      styles.messageContainer,
      message.isBot ? styles.botMessage : styles.userMessage
    ]}>
      {message.isBot && (
        <View style={styles.botAvatar}>
          <Text style={styles.botAvatarText}>🧸</Text>
        </View>
      )}
      <View style={[
        styles.messageBubble,
        message.isBot ? styles.botBubble : styles.userBubble
      ]}>
        <Text style={[
          styles.messageText,
          message.isBot ? styles.botText : styles.userText
        ]}>
          {message.text}
        </Text>
        <Text style={styles.timestamp}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </View>
  );

  return (
    <>
      {/* Floating Chat Button */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => setIsVisible(true)}
      >
        <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.floatingButtonGradient}>
          <Ionicons name="chatbubble" size={24} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      {/* Chat Modal */}
      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Animated.View style={[
            styles.chatContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}>
            {/* Header */}
            <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
              <View style={styles.headerContent}>
                <View style={styles.headerLeft}>
                  <View style={styles.teddyAvatar}>
                    <Text style={styles.teddyAvatarText}>🧸</Text>
                  </View>
                  <View>
                    <Text style={styles.headerTitle}>Teddy AI</Text>
                    <Text style={styles.headerSubtitle}>Always here to help</Text>
                  </View>
                </View>
                <View style={styles.headerActions}>
                  <TouchableOpacity onPress={clearHistory} style={styles.headerButton}>
                    <Ionicons name="refresh" size={20} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsVisible(false)} style={styles.headerButton}>
                    <Ionicons name="close" size={20} color="#fff" />
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>

            {/* Messages */}
            <ScrollView
              ref={scrollViewRef}
              style={styles.messagesContainer}
              contentContainerStyle={styles.messagesContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map(renderMessage)}
              
              {isTyping && (
                <View style={[styles.messageContainer, styles.botMessage]}>
                  <View style={styles.botAvatar}>
                    <Text style={styles.botAvatarText}>🧸</Text>
                  </View>
                  <View style={[styles.messageBubble, styles.botBubble]}>
                    <View style={styles.typingIndicator}>
                      <View style={styles.typingDot} />
                      <View style={styles.typingDot} />
                      <View style={styles.typingDot} />
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Input */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.textInput}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Ask me anything..."
                multiline
                maxLength={500}
                onSubmitEditing={sendMessage}
              />
              <TouchableOpacity
                onPress={sendMessage}
                style={[styles.sendButton, inputText.trim() ? styles.sendButtonActive : null]}
                disabled={!inputText.trim()}
              >
                <Ionicons name="send" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    zIndex: 1000,
  },
  floatingButtonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  chatContainer: {
    height: height * 0.8,
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  teddyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  teddyAvatarText: {
    fontSize: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  messagesContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  messagesContent: {
    padding: 16,
  },
  messageContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  botMessage: {
    justifyContent: 'flex-start',
  },
  userMessage: {
    justifyContent: 'flex-end',
  },
  botAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4facfe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  botAvatarText: {
    fontSize: 16,
  },
  messageBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  botBubble: {
    backgroundColor: '#fff',
    borderBottomLeftRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: '#4facfe',
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    lineHeight: 20,
  },
  botText: {
    color: '#333',
  },
  userText: {
    color: '#fff',
  },
  timestamp: {
    fontSize: 11,
    marginTop: 4,
    opacity: 0.7,
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ccc',
    marginRight: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    maxHeight: 100,
    fontSize: 15,
    marginRight: 12,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ccc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: '#4facfe',
  },
});