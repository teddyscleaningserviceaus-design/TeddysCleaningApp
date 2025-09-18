import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { addDoc, collection, deleteDoc, doc, onSnapshot, query } from "firebase/firestore";
import React, { useEffect, useState, useRef } from "react";
import {
  Alert,
  FlatList,
  Modal,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { db } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminNews() {
  const router = useRouter();
  const { user } = useAuth();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newArticle, setNewArticle] = useState({
    title: '',
    content: '',
    priority: 'Normal'
  });
  const unsubscribeRefs = useRef([]);

  useEffect(() => {
    // Clear any existing listeners
    unsubscribeRefs.current.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    unsubscribeRefs.current = [];

    // Only set up listeners if user is authenticated
    if (!user) {
      setNews([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "news"));
    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const newsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        newsList.sort((a, b) => {
          const aDate = a.createdAt?.toDate?.() || new Date(0);
          const bDate = b.createdAt?.toDate?.() || new Date(0);
          return bDate - aDate;
        });
        setNews(newsList);
        setLoading(false);
      },
      (error) => {
        console.error("News query error:", error);
        setLoading(false);
      }
    );
    
    // Store unsubscribe function
    unsubscribeRefs.current = [unsubscribe];
    
    return () => {
      unsubscribeRefs.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      unsubscribeRefs.current = [];
    };
  }, [user]);

  const handleAddNews = async () => {
    if (!newArticle.title.trim() || !newArticle.content.trim()) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    try {
      await addDoc(collection(db, "news"), {
        title: newArticle.title.trim(),
        content: newArticle.content.trim(),
        priority: newArticle.priority,
        createdAt: new Date(),
        author: "Admin",
        published: true,
      });
      
      setNewArticle({ title: '', content: '', priority: 'Normal' });
      setShowAddModal(false);
      Alert.alert("Success", "News article published!");
    } catch (error) {
      Alert.alert("Error", "Failed to publish article");
    }
  };

  const handleDeleteNews = async (newsId) => {
    Alert.alert(
      "Delete Article",
      "Are you sure you want to delete this news article?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteDoc(doc(db, "news", newsId));
              Alert.alert("Success", "Article deleted");
            } catch (error) {
              Alert.alert("Error", "Failed to delete article");
            }
          },
        },
      ]
    );
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case "High": return "#ef4444";
      case "Medium": return "#f59e0b";
      case "Low": return "#10b981";
      default: return "#6b7280";
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const renderNewsItem = ({ item }) => (
    <View style={styles.newsCard}>
      <View style={styles.newsHeader}>
        <View style={styles.newsLeft}>
          <Text style={styles.newsTitle}>{item.title}</Text>
          <Text style={styles.newsAuthor}>By {item.author} • {formatDate(item.createdAt)}</Text>
        </View>
        <View style={styles.newsRight}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
            <Text style={styles.priorityText}>{item.priority}</Text>
          </View>
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={() => handleDeleteNews(item.id)}
          >
            <AntDesign name="delete" size={16} color="#ef4444" />
          </TouchableOpacity>
        </View>
      </View>
      
      <Text style={styles.newsContent} numberOfLines={3}>
        {item.content}
      </Text>
      
      <View style={styles.newsActions}>
        <TouchableOpacity style={styles.actionButton}>
          <AntDesign name="edit" size={14} color="#4facfe" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <AntDesign name="eye" size={14} color="#10b981" />
          <Text style={styles.actionText}>View</Text>
        </TouchableOpacity>
        <View style={styles.statusIndicator}>
          <View style={[styles.statusDot, { backgroundColor: item.published ? '#10b981' : '#f59e0b' }]} />
          <Text style={styles.statusText}>{item.published ? 'Published' : 'Draft'}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Company News</Text>
          <Text style={styles.headerSubtitle}>Manage announcements</Text>
        </View>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <AntDesign name="plus" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{news.length}</Text>
          <Text style={styles.statLabel}>Total Articles</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{(news || []).filter(n => n.published).length}</Text>
          <Text style={styles.statLabel}>Published</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{(news || []).filter(n => n.priority === 'High').length}</Text>
          <Text style={styles.statLabel}>High Priority</Text>
        </View>
      </View>

      <FlatList
        data={news}
        renderItem={renderNewsItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <AntDesign name="filetext1" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No news articles</Text>
            <Text style={styles.emptySubtext}>Create your first announcement</Text>
          </View>
        )}
      />

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <LinearGradient colors={["#4facfe", "#00f2fe"]} style={styles.modalHeader}>
            <TouchableOpacity 
              onPress={() => setShowAddModal(false)}
              style={styles.modalCloseButton}
            >
              <AntDesign name="close" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Article</Text>
            <View style={styles.modalHeaderRight} />
          </LinearGradient>

          <View style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Title</Text>
              <TextInput
                style={styles.input}
                value={newArticle.title}
                onChangeText={(text) => setNewArticle({...newArticle, title: text})}
                placeholder="Article title..."
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Priority</Text>
              <View style={styles.priorityContainer}>
                {['Low', 'Normal', 'Medium', 'High'].map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityOption,
                      newArticle.priority === priority && styles.priorityOptionActive
                    ]}
                    onPress={() => setNewArticle({...newArticle, priority})}
                  >
                    <Text style={[
                      styles.priorityOptionText,
                      newArticle.priority === priority && styles.priorityOptionTextActive
                    ]}>
                      {priority}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Content</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newArticle.content}
                onChangeText={(text) => setNewArticle({...newArticle, content: text})}
                placeholder="Write your announcement..."
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={8}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity style={styles.publishButton} onPress={handleAddNews}>
              <LinearGradient colors={["#10b981", "#059669"]} style={styles.publishButtonGradient}>
                <AntDesign name="check" size={20} color="#fff" />
                <Text style={styles.publishButtonText}>Publish Article</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "600",
  },
  addButton: {
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  statsContainer: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "800",
    color: "#4facfe",
  },
  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    backgroundColor: "#e5e7eb",
    marginHorizontal: 16,
  },
  content: {
    padding: 16,
  },
  newsCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  newsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  newsLeft: {
    flex: 1,
  },
  newsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 4,
  },
  newsAuthor: {
    fontSize: 12,
    color: "#6b7280",
  },
  newsRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "600",
  },
  deleteButton: {
    padding: 4,
  },
  newsContent: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 12,
  },
  newsActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  actionText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4b5563",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: "auto",
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    color: "#6b7280",
    fontWeight: "500",
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
  emptySubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 8,
  },
  modalCloseButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
  },
  modalHeaderRight: {
    width: 40,
  },
  modalContent: {
    flex: 1,
    padding: 20,
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
  input: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: "#1e293b",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  textArea: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  priorityContainer: {
    flexDirection: "row",
    gap: 8,
  },
  priorityOption: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  priorityOptionActive: {
    backgroundColor: "#4facfe",
    borderColor: "#4facfe",
  },
  priorityOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
  },
  priorityOptionTextActive: {
    color: "#fff",
  },
  publishButton: {
    borderRadius: 12,
    overflow: "hidden",
    marginTop: 20,
  },
  publishButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  publishButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
});