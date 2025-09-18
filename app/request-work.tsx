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
  View
} from "react-native";

import { auth, db } from "../config/firebase";

export default function RequestWorkPage() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(false);
  const [request, setRequest] = useState({
    clientName: "",
    address: "",
    workDescription: "",
    estimatedTime: "",
    urgency: "Normal",
    notes: "",
  });
  const [errors, setErrors] = useState({});

  const handleSubmit = async () => {
    const validationErrors = {};
    
    const clientName = request.clientName || params.client || '';
    const address = request.address || params.address || '';
    
    if (!clientName.trim()) validationErrors.clientName = "Client name is required";
    if (!address.trim()) validationErrors.address = "Address is required";
    if (!request.workDescription.trim()) validationErrors.workDescription = "Work description is required";
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      Alert.alert("Validation Error", "Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "workRequests"), {
        jobId: params.jobId,
        jobTitle: params.jobTitle,
        clientName: (request.clientName || params.client || '').trim(),
        address: (request.address || params.address || '').trim(),
        workDescription: request.workDescription.trim(),
        estimatedTime: request.estimatedTime.trim(),
        urgency: request.urgency,
        notes: request.notes.trim(),
        requestedBy: auth.currentUser?.uid,
        requestedByName: auth.currentUser?.email || "Employee",
        status: "Pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      Alert.alert("Success", "Work request submitted! Admin will review and contact the client.", [
        { text: "OK", onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error("Request error:", error);
      Alert.alert("Error", "Failed to submit request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Request Work</Text>
          <Text style={styles.headerSubtitle}>{params.jobTitle || 'Additional Service'}</Text>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.infoCard}>
          <AntDesign name="infocirlceo" size={24} color="#4facfe" />
          <Text style={styles.infoText}>
            Request additional work for clients. Admin will review, price, and contact the client for approval.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Work Request Details</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Client Name *</Text>
            <View style={styles.inputWrapper}>
              <AntDesign name="user" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.modernInput, errors.clientName && styles.inputError]}
                value={request.clientName || params.client || ''}
                onChangeText={(text) => {
                  setRequest({...request, clientName: text});
                  if (errors.clientName) setErrors({...errors, clientName: null});
                }}
                placeholder="Client or business name"
                placeholderTextColor="#9ca3af"
              />
            </View>
            {errors.clientName && <Text style={styles.errorText}>{errors.clientName}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Address *</Text>
            <View style={styles.inputWrapper}>
              <AntDesign name="home" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.modernInput, errors.address && styles.inputError]}
                value={request.address || params.address || ''}
                onChangeText={(text) => {
                  setRequest({...request, address: text});
                  if (errors.address) setErrors({...errors, address: null});
                }}
                placeholder="Job site address"
                placeholderTextColor="#9ca3af"
                multiline
              />
            </View>
            {errors.address && <Text style={styles.errorText}>{errors.address}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Work Description *</Text>
            <View style={styles.inputWrapper}>
              <AntDesign name="filetext1" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.modernInput, styles.textArea, errors.workDescription && styles.inputError]}
                value={request.workDescription}
                onChangeText={(text) => {
                  setRequest({...request, workDescription: text});
                  if (errors.workDescription) setErrors({...errors, workDescription: null});
                }}
                placeholder="Describe the additional work needed..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
            {errors.workDescription && <Text style={styles.errorText}>{errors.workDescription}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Estimated Time</Text>
            <View style={styles.inputWrapper}>
              <AntDesign name="clockcircleo" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={styles.modernInput}
                value={request.estimatedTime}
                onChangeText={(text) => setRequest({...request, estimatedTime: text})}
                placeholder="e.g., 2 hours, 30 minutes"
                placeholderTextColor="#9ca3af"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Urgency Level</Text>
            <View style={styles.urgencyContainer}>
              {["Low", "Normal", "High", "Urgent"].map((level) => (
                <TouchableOpacity
                  key={level}
                  style={[
                    styles.urgencyButton,
                    request.urgency === level && styles.urgencyButtonActive,
                    level === "Urgent" && request.urgency === level && styles.urgencyButtonUrgent
                  ]}
                  onPress={() => setRequest({...request, urgency: level})}
                >
                  <Text style={[
                    styles.urgencyButtonText,
                    request.urgency === level && styles.urgencyButtonTextActive
                  ]}>
                    {level}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Additional Notes</Text>
            <View style={styles.inputWrapper}>
              <AntDesign name="edit" size={18} color="#6b7280" style={styles.inputIcon} />
              <TextInput
                style={[styles.modernInput, styles.textArea]}
                value={request.notes}
                onChangeText={(text) => setRequest({...request, notes: text})}
                placeholder="Any additional context or special requirements..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.submitButton, loading && styles.submitButtonDisabled]} 
          onPress={handleSubmit}
          disabled={loading}
        >
          <LinearGradient colors={["#f59e0b", "#d97706"]} style={styles.submitButtonGradient}>
            {loading ? (
              <AntDesign name="loading1" size={24} color="#fff" />
            ) : (
              <AntDesign name="right" size={24} color="#fff" />
            )}
            <Text style={styles.submitButtonText}>
              {loading ? "Submitting..." : "Submit Request"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
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

  infoCard: {
    flexDirection: "row",
    backgroundColor: "#eff6ff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    alignItems: "flex-start",
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#1e40af",
    lineHeight: 20,
    fontWeight: "500",
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
    marginBottom: 20,
  },

  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#f8fafc",
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#e2e8f0",
    paddingHorizontal: 16,
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 16,
  },
  modernInput: {
    flex: 1,
    fontSize: 16,
    color: "#1e293b",
    paddingVertical: 16,
    fontWeight: "500",
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  inputError: {
    borderColor: "#ef4444",
    backgroundColor: "#fef2f2",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 13,
    marginTop: 8,
    fontWeight: "600",
    marginLeft: 4,
  },

  urgencyContainer: {
    flexDirection: "row",
    gap: 8,
  },
  urgencyButton: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    backgroundColor: "#f8fafc",
    borderWidth: 2,
    borderColor: "#e2e8f0",
  },
  urgencyButtonActive: {
    backgroundColor: "#4facfe",
    borderColor: "#4facfe",
  },
  urgencyButtonUrgent: {
    backgroundColor: "#ef4444",
    borderColor: "#ef4444",
  },
  urgencyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#64748b",
  },
  urgencyButtonTextActive: {
    color: "#fff",
  },

  submitButton: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#f59e0b",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
    gap: 12,
  },
  submitButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
  },
});