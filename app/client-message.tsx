import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { addDoc, collection } from "firebase/firestore";
import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { auth, db } from "../config/firebase";
import { useClient } from "../contexts/ClientContext";

export default function ClientMessagePage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { clientData } = useClient();
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState(params.subject || "");
  const [loading, setLoading] = useState(false);

  const quickMessages = [
    "When will my cleaner arrive?",
    "Can I reschedule my appointment?",
    "I need to add special instructions",
    "Issue with my booking",
    "Request additional services",
    "Emergency cancellation needed",
    "Change cleaning time",
    "Update contact details"
  ];

  const handleSendMessage = async () => {
    if (!message.trim() || !subject.trim()) {
      Alert.alert("Missing Information", "Please enter both subject and message.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "messages"), {
        subject: subject.trim(),
        message: message.trim(),
        jobId: params.jobId || null,
        jobTitle: params.jobTitle || null,
        clientId: auth.currentUser?.uid,
        clientName: clientData?.name || auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Client',
        clientEmail: clientData?.email || auth.currentUser?.email,
        clientPhone: clientData?.phone || null,
        type: "client-to-admin",
        status: "unread",
        priority: "normal",
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      Alert.alert(
        "Message Sent! 📨",
        "Your message has been sent to our support team. We'll respond within 2 hours during business hours.",
        [{ text: "OK", onPress: () => router.back() }]
      );
    } catch (error) {
      console.error("Send message error:", error);
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickMessage = (quickMsg) => {
    setSubject(quickMsg);
    if (params.jobId) {
      setMessage(`Hi, I have a request regarding my booking (${params.jobTitle}): ${quickMsg}\n\nJob ID: ${params.jobId}\n\n`);
    } else {
      setMessage(`Hi, I have a question about my booking: ${quickMsg}\n\n`);
    }
  };

  // Auto-fill message for reschedule/cancel requests
  React.useEffect(() => {
    if (params.subject && params.jobId && !message) {
      if (params.subject === 'Reschedule Request') {
        setMessage(`Hi, I would like to reschedule my booking:\n\nJob: ${params.jobTitle}\nJob ID: ${params.jobId}\n\nPreferred new date/time: [Please specify]\nReason for rescheduling: [Please specify]\n\nThank you!`);
      } else if (params.subject === 'Cancellation Request') {
        setMessage(`Hi, I need to cancel my booking:\n\nJob: ${params.jobTitle}\nJob ID: ${params.jobId}\n\nReason for cancellation: [Please specify]\n\nI understand the cancellation policy. Please confirm the cancellation and any applicable fees.\n\nThank you!`);
      }
    }
  }, [params.subject, params.jobId, params.jobTitle, message]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Contact Support</Text>
          <Text style={styles.headerSubtitle}>We're here to help!</Text>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {params.jobTitle && (
          <View style={styles.jobCard}>
            <AntDesign name="infocirlceo" size={20} color="#4facfe" />
            <View style={styles.jobInfo}>
              <Text style={styles.jobTitle}>Regarding: {params.jobTitle}</Text>
              <Text style={styles.jobId}>Job ID: {params.jobId}</Text>
            </View>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Questions</Text>
          <Text style={styles.cardSubtitle}>Tap a common question to get started</Text>
          
          <View style={styles.quickMessages}>
            {quickMessages.map((quickMsg, index) => (
              <TouchableOpacity
                key={index}
                style={styles.quickMessageButton}
                onPress={() => handleQuickMessage(quickMsg)}
              >
                <Text style={styles.quickMessageText}>{quickMsg}</Text>
                <AntDesign name="right" size={14} color="#4facfe" />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Send Custom Message</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Subject</Text>
            <TextInput
              style={styles.subjectInput}
              value={subject}
              onChangeText={setSubject}
              placeholder="What's this about?"
              placeholderTextColor="#9ca3af"
            />
          </View>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Message</Text>
            <TextInput
              style={styles.messageInput}
              value={message}
              onChangeText={setMessage}
              placeholder="Tell us how we can help you..."
              placeholderTextColor="#9ca3af"
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>
          
          <TouchableOpacity
            style={styles.sendButton}
            onPress={handleSendMessage}
            disabled={loading}
          >
            <LinearGradient colors={["#10b981", "#059669"]} style={styles.sendButtonGradient}>
              <AntDesign name="mail" size={20} color="#fff" />
              <Text style={styles.sendButtonText}>
                {loading ? "Sending..." : "Send Message"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        <View style={styles.supportCard}>
          <AntDesign name="customerservice" size={32} color="#4facfe" />
          <Text style={styles.supportTitle}>24/7 Support</Text>
          <Text style={styles.supportText}>
            Our support team typically responds within 2 hours during business hours (8 AM - 6 PM).
            For urgent matters, please call us directly.
          </Text>
          
          <View style={styles.contactInfo}>
            <View style={styles.contactRow}>
              <AntDesign name="phone" size={16} color="#6b7280" />
              <Text style={styles.contactText}>1800 TEDDY CLEAN</Text>
            </View>
            <View style={styles.contactRow}>
              <AntDesign name="mail" size={16} color="#6b7280" />
              <Text style={styles.contactText}>support@teddysclean.com</Text>
            </View>
          </View>
        </View>
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
  jobCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0f8ff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#4facfe",
  },
  jobInfo: {
    marginLeft: 12,
    flex: 1,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1e293b",
  },
  jobId: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },
  quickMessages: {
    gap: 8,
  },
  quickMessageButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#f8fafc",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  quickMessageText: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  subjectInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  messageInput: {
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    borderWidth: 2,
    borderColor: "#e2e8f0",
    minHeight: 120,
  },
  sendButton: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 4,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  sendButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
  },
  supportCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  supportTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1e293b",
    marginTop: 12,
    marginBottom: 8,
  },
  supportText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  contactInfo: {
    gap: 12,
    alignSelf: "stretch",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  contactText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
});