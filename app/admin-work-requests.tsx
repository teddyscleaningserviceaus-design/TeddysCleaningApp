import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { collection, onSnapshot, query, updateDoc, doc } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { db } from "../config/firebase";

export default function AdminWorkRequests() {
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "workRequests"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const requestsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort by createdAt in memory
        requestsList.sort((a, b) => {
          const aDate = a.createdAt?.toDate?.() || new Date(0);
          const bDate = b.createdAt?.toDate?.() || new Date(0);
          return bDate - aDate;
        });
        setRequests(requestsList);
        setLoading(false);
      },
      (error) => {
        console.error("Work requests error:", error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleUpdateStatus = async (requestId, newStatus) => {
    try {
      await updateDoc(doc(db, "workRequests", requestId), {
        status: newStatus,
        updatedAt: new Date(),
      });
      Alert.alert("Success", `Request ${newStatus.toLowerCase()}`);
    } catch (error) {
      Alert.alert("Error", "Failed to update request status");
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "#f59e0b";
      case "Approved": return "#10b981";
      case "Rejected": return "#ef4444";
      case "Converted": return "#8b5cf6";
      default: return "#6b7280";
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case "Urgent": return "#ef4444";
      case "High": return "#f59e0b";
      case "Normal": return "#10b981";
      case "Low": return "#6b7280";
      default: return "#6b7280";
    }
  };

  const renderRequest = ({ item: request }) => (
    <View style={styles.requestCard}>
      <View style={styles.requestHeader}>
        <View style={styles.requestLeft}>
          <Text style={styles.clientName}>{request.clientName}</Text>
          <Text style={styles.requestedBy}>Requested by: {request.requestedByName}</Text>
        </View>
        <View style={styles.requestRight}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(request.status) }]}>
            <Text style={styles.statusText}>{request.status}</Text>
          </View>
          <View style={[styles.urgencyBadge, { backgroundColor: getUrgencyColor(request.urgency) }]}>
            <Text style={styles.urgencyText}>{request.urgency}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.address}>{request.address}</Text>
      <Text style={styles.description}>{request.workDescription}</Text>
      
      {request.estimatedTime && (
        <Text style={styles.estimatedTime}>Estimated: {request.estimatedTime}</Text>
      )}
      
      {request.notes && (
        <Text style={styles.notes}>Notes: {request.notes}</Text>
      )}

      {request.status === "Pending" && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.approveButton}
            onPress={() => handleUpdateStatus(request.id, "Approved")}
          >
            <AntDesign name="check" size={16} color="#fff" />
            <Text style={styles.buttonText}>Approve</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.rejectButton}
            onPress={() => handleUpdateStatus(request.id, "Rejected")}
          >
            <AntDesign name="close" size={16} color="#fff" />
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.convertButton}
            onPress={() => {
              // Navigate to add-job with pre-filled data
              router.push({
                pathname: '/add-job',
                params: {
                  client: request.clientName,
                  address: request.address,
                  notes: `Work Request: ${request.workDescription}`,
                }
              });
              handleUpdateStatus(request.id, "Converted");
            }}
          >
            <AntDesign name="plus" size={16} color="#fff" />
            <Text style={styles.buttonText}>Create Job</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Work Requests</Text>
          <Text style={styles.headerSubtitle}>Review & Approve</Text>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>

      <FlatList
        data={requests}
        renderItem={renderRequest}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <AntDesign name="inbox" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No work requests</Text>
          </View>
        )}
      />
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
    padding: 16,
  },
  requestCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  requestLeft: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  requestedBy: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "500",
  },
  requestRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  urgencyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  urgencyText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  address: {
    fontSize: 14,
    color: "#4b5563",
    marginBottom: 8,
    fontWeight: "500",
  },
  description: {
    fontSize: 16,
    color: "#1e293b",
    marginBottom: 12,
    lineHeight: 22,
  },
  estimatedTime: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
    fontWeight: "500",
  },
  notes: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
    fontStyle: "italic",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  approveButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ef4444",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  convertButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#8b5cf6",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    color: "#6b7280",
    marginTop: 16,
    fontWeight: "600",
  },
});