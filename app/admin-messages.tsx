import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, onSnapshot, orderBy, query, updateDoc, doc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { db } from "../config/firebase";

export default function AdminMessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, "messages"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const messagesList = [];
        querySnapshot.forEach((doc) => {
          messagesList.push({ id: doc.id, ...doc.data() });
        });
        setMessages(messagesList);
        setLoading(false);
      },
      (error) => {
        console.error("Messages query error:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleMarkAsRead = async (messageId) => {
    try {
      await updateDoc(doc(db, "messages", messageId), {
        status: "read",
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Mark as read error:", error);
    }
  };

  const handleCallClient = (phoneNumber) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert("No Phone Number", "Client phone number not available.");
    }
  };

  const handleEmailClient = (email) => {
    if (email) {
      Linking.openURL(`mailto:${email}`);
    } else {
      Alert.alert("No Email", "Client email not available.");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "unread": return "#ef4444";
      case "read": return "#10b981";
      default: return "#6b7280";
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "high": return "#ef4444";
      case "urgent": return "#dc2626";
      case "normal": return "#4facfe";
      default: return "#6b7280";
    }
  };

  const renderMessage = (message) => (
    <TouchableOpacity
      key={message.id}
      style={[styles.messageCard, message.status === "unread" && styles.unreadCard]}
      onPress={() => handleMarkAsRead(message.id)}
    >
      <View style={styles.messageHeader}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{message.clientName}</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(message.status) }]} />
            <Text style={styles.statusText}>{message.status}</Text>
          </View>
        </View>
        <Text style={styles.messageTime}>
          {message.createdAt?.toDate?.()?.toLocaleDateString() || 'Recent'}
        </Text>
      </View>

      <Text style={styles.messageSubject}>{message.subject}</Text>
      {message.type === 'image' && message.imageUrl ? (
        <Image source={{ uri: message.imageUrl }} style={styles.messageImage} />
      ) : (
        <Text style={styles.messagePreview} numberOfLines={2}>
          {message.type === 'image' ? '📷 Image message' : message.message}
        </Text>
      )}

      {message.jobTitle && (
        <View style={styles.jobInfo}>
          <AntDesign name="infocirlceo" size={14} color="#4facfe" />
          <Text style={styles.jobText}>Job: {message.jobTitle}</Text>
        </View>
      )}

      <View style={styles.messageActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleCallClient(message.clientPhone)}
        >
          <AntDesign name="phone" size={16} color="#4facfe" />
          <Text style={styles.actionText}>Call</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => handleEmailClient(message.clientEmail)}
        >
          <AntDesign name="mail" size={16} color="#4facfe" />
          <Text style={styles.actionText}>Email</Text>
        </TouchableOpacity>

        {message.jobId && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push({
              pathname: '/job-details',
              params: { jobId: message.jobId }
            })}
          >
            <AntDesign name="eye" size={16} color="#4facfe" />
            <Text style={styles.actionText}>View Job</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Client Messages</Text>
          <Text style={styles.headerSubtitle}>{messages.length} total messages</Text>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <AntDesign name="loading1" size={32} color="#4facfe" />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : messages.length > 0 ? (
          messages.map(renderMessage)
        ) : (
          <View style={styles.emptyState}>
            <AntDesign name="inbox" size={64} color="#ccc" />
            <Text style={styles.emptyTitle}>No Messages</Text>
            <Text style={styles.emptyDescription}>
              Client messages will appear here when they contact support.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 8,
  },
  backButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  headerCenter: {
    alignItems: "center",
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#6b7280",
    fontWeight: "600",
  },
  messageCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: "#ef4444",
  },
  messageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: "#6b7280",
    fontWeight: "600",
  },
  messageTime: {
    fontSize: 12,
    color: "#9ca3af",
  },
  messageSubject: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  messagePreview: {
    fontSize: 14,
    color: "#6b7280",
    lineHeight: 20,
    marginBottom: 12,
  },
  jobInfo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f8ff",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  jobText: {
    fontSize: 12,
    color: "#4facfe",
    fontWeight: "600",
    marginLeft: 6,
  },
  messageActions: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  actionText: {
    fontSize: 12,
    color: "#4facfe",
    fontWeight: "600",
    marginLeft: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#374151",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
  },
  messageImage: {
    width: '100%',
    height: 150,
    borderRadius: 8,
    marginBottom: 12,
  },
});