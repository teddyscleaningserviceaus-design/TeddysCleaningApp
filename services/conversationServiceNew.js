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
  serverTimestamp,
  setDoc,
  getDoc,
  increment
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { firebaseStorageService } from './firebaseStorageService';

export class ConversationServiceNew {
  // Ensure admin user exists
  async ensureAdminExists() {
    try {
      const adminQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const adminSnap = await getDocs(adminQuery);
      
      if (adminSnap.empty) {
        const adminId = 'admin-system';
        await setDoc(doc(db, 'users', adminId), {
          uid: adminId,
          email: 'admin@teddyscleaning.com',
          role: 'admin',
          userType: 'admin',
          name: 'Admin Team',
          createdAt: serverTimestamp()
        });
        return adminId;
      }
      
      return adminSnap.docs[0].id;
    } catch (error) {
      console.error('Error ensuring admin exists:', error);
      return 'admin-system';
    }
  }

  // Get or create conversation
  async getOrCreateConversation(participants, type) {
    try {
      const sortedParticipants = [...participants].sort();
      
      // Check if conversation exists
      const q = query(
        collection(db, 'conversations'),
        where('participants', '==', sortedParticipants)
      );
      
      const existingConvs = await getDocs(q);
      
      if (!existingConvs.empty) {
        return existingConvs.docs[0].id;
      }

      // Create new conversation
      const conversationData = {
        participants: sortedParticipants,
        type,
        lastMessage: '',
        unreadCounts: {},
        updatedAt: serverTimestamp()
      };

      // Initialize unread counts
      participants.forEach(uid => {
        conversationData.unreadCounts[uid] = 0;
      });

      const docRef = await addDoc(collection(db, 'conversations'), conversationData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }

  // Get user conversations with participant names
  getUserConversations(userId, callback) {
    const q = query(
      collection(db, 'conversations'),
      where('participants', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );

    return onSnapshot(q, async (snapshot) => {
      const conversations = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const participantNames = await this.getParticipantNames(data.participants);
        
        conversations.push({
          id: doc.id,
          ...data,
          participantNames
        });
      }
      
      callback(conversations);
    });
  }

  // Get conversation messages
  getConversationMessages(conversationId, callback) {
    const q = query(
      collection(db, 'messages'),
      where('conversationId', '==', conversationId),
      orderBy('createdAt', 'asc')
    );

    return onSnapshot(q, callback);
  }

  // Send message
  async sendMessage(conversationId, senderId, text, imageUrl = null) {
    try {
      let finalImageUrl = imageUrl;
      
      // Upload image if provided
      if (imageUrl && imageUrl.startsWith('file://')) {
        try {
          const result = await firebaseStorageService.uploadChatImage(conversationId, imageUrl);
          if (result.success) {
            finalImageUrl = result.url;
          }
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
        }
      }

      // Add message
      const messageData = {
        conversationId,
        senderId,
        text,
        imageUrl: finalImageUrl,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'messages'), messageData);

      // Update conversation
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const data = conversationSnap.data();
        const newUnreadCounts = { ...data.unreadCounts };
        
        // Increment unread count for all participants except sender
        data.participants.forEach(uid => {
          if (uid !== senderId) {
            newUnreadCounts[uid] = (newUnreadCounts[uid] || 0) + 1;
          }
        });

        await updateDoc(conversationRef, {
          lastMessage: text || '📷 Image',
          unreadCounts: newUnreadCounts,
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  // Mark conversation as read
  async markAsRead(conversationId, userId) {
    try {
      const conversationRef = doc(db, 'conversations', conversationId);
      const conversationSnap = await getDoc(conversationRef);
      
      if (conversationSnap.exists()) {
        const data = conversationSnap.data();
        const newUnreadCounts = { ...data.unreadCounts };
        newUnreadCounts[userId] = 0;

        await updateDoc(conversationRef, {
          unreadCounts: newUnreadCounts
        });
      }
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }

  // Get participant names
  async getParticipantNames(participants) {
    try {
      const names = {};
      
      for (const uid of participants) {
        // Try users collection first
        let userDoc = await getDoc(doc(db, 'users', uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          names[uid] = userData.name || userData.displayName || 'Unknown User';
        } else {
          // Try employees collection
          userDoc = await getDoc(doc(db, 'employees', uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            names[uid] = userData.name || `${userData.firstName} ${userData.lastName}` || 'Employee';
          } else {
            // Try admins collection
            userDoc = await getDoc(doc(db, 'admins', uid));
            if (userDoc.exists()) {
              const userData = userDoc.data();
              names[uid] = userData.name || `${userData.firstName} ${userData.lastName}` || 'Admin';
            } else {
              names[uid] = 'Unknown User';
            }
          }
        }
      }
      
      return names;
    } catch (error) {
      console.error('Error getting participant names:', error);
      return {};
    }
  }

  // Start conversation with admin
  async startAdminConversation(userId) {
    const adminId = await this.ensureAdminExists();
    return await this.getOrCreateConversation([userId, adminId], 'admin-employee');
  }

  // Get all users for messaging
  async getMessagingUsers() {
    try {
      const allUsers = [];
      
      // Get users from main users collection
      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.name || data.displayName) {
          allUsers.push({
            id: doc.id,
            name: data.name || data.displayName,
            email: data.email || '',
            role: data.role || data.userType || 'employee'
          });
        }
      });
      
      // Get employees
      const employeesSnap = await getDocs(collection(db, 'employees'));
      employeesSnap.docs.forEach(doc => {
        const data = doc.data();
        if (!allUsers.find(u => u.id === doc.id) && (data.name || data.firstName)) {
          allUsers.push({
            id: doc.id,
            name: data.name || `${data.firstName} ${data.lastName}`,
            email: data.email || '',
            role: 'employee'
          });
        }
      });
      
      // Get admins
      const adminsSnap = await getDocs(collection(db, 'admins'));
      adminsSnap.docs.forEach(doc => {
        const data = doc.data();
        if (!allUsers.find(u => u.id === doc.id) && (data.name || data.firstName)) {
          allUsers.push({
            id: doc.id,
            name: data.name || `${data.firstName} ${data.lastName}`,
            email: data.email || '',
            role: 'admin'
          });
        }
      });

      // Ensure at least one admin exists
      if (!allUsers.find(u => u.role === 'admin')) {
        const adminId = await this.ensureAdminExists();
        allUsers.push({
          id: adminId,
          name: 'Admin Team',
          email: 'admin@teddyscleaning.com',
          role: 'admin'
        });
      }

      return allUsers.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1;
        if (a.role !== 'admin' && b.role === 'admin') return 1;
        return a.name.localeCompare(b.name);
      });
    } catch (error) {
      console.error('Error getting messaging users:', error);
      return [];
    }
  }

  // Check if job is completed (prevent messaging for completed jobs)
  async isJobCompleted(jobId) {
    try {
      const jobDoc = await getDoc(doc(db, 'jobs', jobId));
      if (jobDoc.exists()) {
        const jobData = jobDoc.data();
        return jobData.status === 'Completed' || jobData.status === 'completed';
      }
      return false;
    } catch (error) {
      console.error('Error checking job status:', error);
      return false;
    }
  }

  // Get display name for conversation (excluding current user)
  getConversationDisplayName(conversation, currentUserId) {
    const otherParticipants = conversation.participants.filter(p => p !== currentUserId);
    if (otherParticipants.length === 0) return 'You';
    
    const names = otherParticipants.map(uid => 
      conversation.participantNames[uid] || 'Unknown User'
    );
    
    return names.join(', ');
  }

  // Get unread count for user
  getUnreadCount(conversation, userId) {
    return conversation.unreadCounts?.[userId] || 0;
  }
}

export const conversationServiceNew = new ConversationServiceNew();