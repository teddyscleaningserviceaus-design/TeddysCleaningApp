import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  getDocs,
  getDoc,
  serverTimestamp,
  limit,
  setDoc
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { firebaseStorageService } from './firebaseStorageService';

export class MessagingService {
  // Get conversations for admin inbox
  async getConversations(userId) {
    try {
      const q = query(
        collection(db, 'conversations'),
        orderBy('lastMessageAt', 'desc')
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        lastMessageAt: doc.data().lastMessageAt?.toDate?.() || new Date()
      }));
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    }
  }

  // Get messages for a conversation
  async getConversationMessages(conversationId) {
    try {
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', conversationId),
        orderBy('createdAt', 'asc'),
        limit(100)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || new Date()
      }));
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      return [];
    }
  }

  // Get employees for messaging (from users collection where userType === 'employee')
  async getMessagingUsers() {
    try {
      const allUsers = [];
      
      // Get employees from users collection with userType filter
      try {
        console.log('Fetching employees from users collection...');
        const usersSnap = await getDocs(collection(db, 'users'));
        console.log('Users collection size:', usersSnap.size);
        
        usersSnap.docs.forEach(doc => {
          const data = doc.data();
          
          // Only include users with userType === 'employee'
          if (data.userType === 'employee') {
            const name = data.name ||
                        data.displayName ||
                        `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
                        data.username || 
                        'Employee';
            
            const user = {
              id: doc.id,
              name: name,
              email: data.email || '',
              role: 'employee',
              profileImage: data.profileImage || data.profilePicture || null
            };
            
            allUsers.push(user);
            console.log('Added employee:', user);
          }
        });
      } catch (error) {
        console.error('Could not fetch from users collection:', error);
      }
      
      console.log('Final employees list:', allUsers.length, 'employees:', allUsers);
      
      // Sort by name
      return allUsers.sort((a, b) => a.name.localeCompare(b.name));
    } catch (error) {
      console.error('Error fetching messaging users:', error);
      throw error;
    }
  }

  // Get user's chats (simplified to avoid index requirements)
  getUserChats(userId, callback) {
    try {
      // Check if user is authenticated
      if (!userId) {
        console.warn('No userId provided for getUserChats');
        callback({ docs: [] });
        return () => {};
      }

      const q = query(
        collection(db, 'conversations'),
        where('participants', 'array-contains', userId)
      );

      return onSnapshot(q, 
        (snapshot) => {
          console.log('Conversations for user', userId, ':', snapshot.docs.length);
          const chats = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data(), isGuest: false }))
            .sort((a, b) => {
              const aTime = a.updatedAt?.toDate?.() || a.lastMessageAt?.toDate?.() || new Date(0);
              const bTime = b.updatedAt?.toDate?.() || b.lastMessageAt?.toDate?.() || new Date(0);
              return bTime - aTime;
            });
          console.log('Found chats for user:', chats.length);
          callback({ docs: chats.map(chat => ({ id: chat.id, data: () => chat })) });
        },
        (error) => {
          console.error('Error in getUserChats:', error);
          callback({ docs: [] });
        }
      );
    } catch (error) {
      console.error('Error setting up getUserChats query:', error);
      callback({ docs: [] });
    }
  }

  // Get messages for a chat
  getChatMessages(chatId, callback) {
    try {
      if (!chatId) {
        console.warn('No chatId provided for getChatMessages');
        callback({ docs: [] });
        return () => {};
      }

      // Simplified query without orderBy to avoid index requirement
      const q = query(
        collection(db, 'messages'),
        where('conversationId', '==', chatId),
        limit(100)
      );

      return onSnapshot(q, 
        (snapshot) => {
          // Sort messages manually by createdAt
          const messages = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => {
              const aTime = a.createdAt?.toDate?.() || new Date(0);
              const bTime = b.createdAt?.toDate?.() || new Date(0);
              return aTime - bTime;
            });
          callback({ docs: messages.map(msg => ({ id: msg.id, data: () => msg })) });
        },
        (error) => {
          console.error('Error in getChatMessages:', error);
          callback({ docs: [] });
        }
      );
    } catch (error) {
      console.error('Error setting up getChatMessages query:', error);
      callback({ docs: [] });
    }
  }

  // Create direct message chat
  async createDirectChat(currentUserId, targetUserId, currentUserName, targetUserName) {
    try {
      // Create deterministic conversation ID based on sorted user IDs
      const participants = [currentUserId, targetUserId].sort();
      const conversationId = participants.join('_');
      
      const chatData = {
        participants: participants,
        participantNames: [currentUserName, targetUserName],
        type: 'admin-employee',
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        unreadCounts: {
          [currentUserId]: 0,
          [targetUserId]: 0
        }
      };

      console.log('Using conversation ID:', conversationId, 'for participants:', participants);
      
      // Use setDoc with deterministic ID instead of addDoc
      await setDoc(doc(db, 'conversations', conversationId), chatData, { merge: true });
      console.log('Created/updated conversation with ID:', conversationId);
      return conversationId;
    } catch (error) {
      console.error('Error creating direct chat:', error);
      throw error;
    }
  }

  // Create group chat
  async createGroupChat(name, createdBy, participants, participantNames) {
    try {
      const chatData = {
        name,
        isGroup: true,
        participants: [createdBy, ...participants],
        participantNames,
        createdBy,
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        lastMessageBy: null
      };

      const chatRef = await addDoc(collection(db, 'chats'), chatData);
      return chatRef.id;
    } catch (error) {
      console.error('Error creating group chat:', error);
      throw error;
    }
  }

  // Send message (supports both authenticated and guest messaging)
  async sendMessage(chatId, userId, userName, text, type = 'text', imageUrl = null, isGuest = false) {
    try {
      let finalImageUrl = imageUrl;
      
      // If sending an image, upload it to Firebase Storage
      if (type === 'image' && imageUrl) {
        try {
          const result = await firebaseStorageService.uploadChatImage(chatId, imageUrl);
          if (result.success) {
            finalImageUrl = result.url;
          }
        } catch (uploadError) {
          console.error('Image upload failed, using local URI:', uploadError);
          // Keep original imageUrl as fallback
        }
      }
      
      const messageData = {
        conversationId: chatId,
        senderId: userId,
        userName: userName,
        text,
        imageUrl: finalImageUrl,
        type: type,
        isGuest: isGuest,
        createdAt: serverTimestamp()
      };

      // Use guest collections for guest messages
      const messagesCollection = isGuest ? 'guest-messages' : 'messages';
      const conversationsCollection = isGuest ? 'guest-conversations' : 'conversations';
      
      await addDoc(collection(db, messagesCollection), messageData);

      const chatRef = doc(db, conversationsCollection, chatId);
      await updateDoc(chatRef, {
        lastMessage: type === 'image' ? '📷 Image' : text,
        updatedAt: serverTimestamp()
      });

    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Create guest conversation with admin
  async createGuestConversation(guestName, guestEmail) {
    try {
      const conversationId = `guest_${Date.now()}`;
      
      const chatData = {
        participants: ['admin-team', conversationId],
        participantNames: ['Admin Team', guestName],
        guestEmail: guestEmail,
        guestName: guestName,
        type: 'guest-admin',
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isGuest: true
      };

      console.log('Creating guest conversation with ID:', conversationId);
      await setDoc(doc(db, 'guest-conversations', conversationId), chatData);
      console.log('Guest conversation created successfully');
      return conversationId;
    } catch (error) {
      console.error('Error creating guest conversation:', error);
      throw error;
    }
  }

  // Get guest messages for a conversation
  getGuestMessages(chatId, callback) {
    const q = query(
      collection(db, 'guest-messages'),
      where('conversationId', '==', chatId),
      limit(100)
    );

    return onSnapshot(q, (snapshot) => {
      const messages = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .sort((a, b) => {
          const aTime = a.createdAt?.toDate?.() || new Date(0);
          const bTime = b.createdAt?.toDate?.() || new Date(0);
          return aTime - bTime;
        });
      callback({ docs: messages.map(msg => ({ id: msg.id, data: () => msg })) });
    });
  }

  // Get client chats for admin
  getClientChats(callback) {
    try {
      const q = query(collection(db, 'chats'));
      return onSnapshot(q, callback, (error) => {
        console.error('Error in client chats listener:', error);
        callback({ docs: [] });
      });
    } catch (error) {
      console.error('Error getting client chats:', error);
      callback({ docs: [] });
    }
  }

  // Get all conversations (regular, guest, and client) for admin
  getAdminConversations(callback) {
    try {
      let regularChats = [];
      let guestChats = [];
      let clientChats = [];
      let regularLoaded = false;
      let guestLoaded = false;
      let clientLoaded = false;
      let userNames = {};

      const combineAndCallback = async () => {
        if (regularLoaded && guestLoaded && clientLoaded) {
          // Enrich regular chats with proper names
          const enrichedRegularChats = await Promise.all(regularChats.map(async (chat) => {
            const enrichedChat = { ...chat, isGuest: false };
            
            // Get proper names for participants
            if (chat.participants && Array.isArray(chat.participants)) {
              const names = await Promise.all(chat.participants.map(async (participantId) => {
                if (userNames[participantId]) {
                  return userNames[participantId];
                }
                
                try {
                  // Fetch from users collection only
                  const userDocRef = doc(db, 'users', participantId);
                  const userDoc = await getDoc(userDocRef);
                  if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const name = userData.name || userData.displayName || userData.username || `${userData.firstName || ''} ${userData.lastName || ''}`.trim() || 'Unknown User';
                    userNames[participantId] = name;
                    
                    // Also store profile image for enrichment
                    if (userData.profileImage) {
                      enrichedChat.profileImage = userData.profileImage;
                    }
                    
                    return name;
                  }
                } catch (error) {
                  console.error('Error fetching user name:', error);
                }
                
                return 'Unknown User';
              }));
              
              // Set the display name (exclude admin from name)
              const nonAdminNames = names.filter(name => name !== 'Admin Team' && name !== 'admin');
              enrichedChat.name = nonAdminNames.length > 0 ? nonAdminNames[0] : names[0] || 'Unknown User';
            }
            
            return enrichedChat;
          }));
          
          // Enrich guest chats with proper display names
          const enrichedGuestChats = guestChats.map(chat => ({
            ...chat,
            name: chat.guestName || 'Guest User',
            isGuest: true
          }));
          
          // Enrich client chats - group by clientId and get latest message
          console.log('Processing client chats:', clientChats.length);
          const clientChatGroups = {};
          clientChats.forEach(chat => {
            const clientId = chat.clientId;
            console.log('Processing client chat:', { clientId, clientName: chat.clientName, message: chat.message });
            if (!clientChatGroups[clientId] || 
                (chat.createdAt?.toDate?.() || new Date(0)) > (clientChatGroups[clientId].createdAt?.toDate?.() || new Date(0))) {
              clientChatGroups[clientId] = chat;
            }
          });
          
          const enrichedClientChats = Object.values(clientChatGroups).map(chat => ({
            ...chat,
            id: chat.clientId, // Use clientId as the chat ID
            name: chat.clientName || 'Client User',
            isClient: true,
            lastMessage: chat.message || 'No messages yet',
            lastMessageAt: chat.createdAt,
            updatedAt: chat.createdAt
          }));
          
          console.log('Enriched client chats:', enrichedClientChats.length, enrichedClientChats.map(c => ({ id: c.id, name: c.name, lastMessage: c.lastMessage })));
          
          const allChats = [...enrichedRegularChats, ...enrichedGuestChats, ...enrichedClientChats].sort((a, b) => {
            const aTime = a.updatedAt?.toDate?.() || a.lastMessageAt?.toDate?.() || new Date(0);
            const bTime = b.updatedAt?.toDate?.() || b.lastMessageAt?.toDate?.() || new Date(0);
            return bTime - aTime;
          });
          
          callback({ docs: allChats.map(chat => ({ id: chat.id, data: () => chat })) });
        }
      };

      // Get regular conversations
      const regularQuery = query(collection(db, 'conversations'));
      const unsubscribeRegular = onSnapshot(regularQuery, (snapshot) => {
        regularChats = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        regularLoaded = true;
        combineAndCallback();
      }, (error) => {
        console.error('Error in regular conversations listener:', error);
        regularLoaded = true;
        combineAndCallback();
      });
      
      // Get guest conversations
      const guestQuery = query(collection(db, 'guest-conversations'));
      const unsubscribeGuest = onSnapshot(guestQuery, (snapshot) => {
        guestChats = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          isGuest: true
        }));
        guestLoaded = true;
        combineAndCallback();
      }, (error) => {
        console.error('Error in guest conversations listener:', error);
        guestLoaded = true;
        combineAndCallback();
      });
      
      // Get client chats
      const clientQuery = query(collection(db, 'chats'));
      const unsubscribeClient = onSnapshot(clientQuery, (snapshot) => {
        console.log('Client chats loaded:', snapshot.docs.length);
        clientChats = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log('Client chat data:', data);
          return {
            id: doc.id,
            ...data,
            isClient: true
          };
        });
        clientLoaded = true;
        combineAndCallback();
      }, (error) => {
        console.error('Error in client chats listener:', error);
        clientLoaded = true;
        combineAndCallback();
      });
      
      // Return cleanup function for all listeners
      return () => {
        unsubscribeRegular();
        unsubscribeGuest();
        unsubscribeClient();
      };
    } catch (error) {
      console.error('Error getting admin conversations:', error);
      callback({ docs: [] });
    }
  }

  // Search users
  searchUsers(users, searchTerm) {
    if (!searchTerm.trim()) return users;
    
    const term = searchTerm.toLowerCase();
    return users.filter(user => 
      (user.name && typeof user.name === 'string' && user.name.toLowerCase().includes(term)) ||
      (user.email && typeof user.email === 'string' && user.email.toLowerCase().includes(term))
    );
  }
}

export const messagingService = new MessagingService();