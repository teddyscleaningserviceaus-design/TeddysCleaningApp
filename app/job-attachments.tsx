import { AntDesign } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import * as ImagePicker from 'expo-image-picker';
import { addDoc, collection, onSnapshot, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { db } from "../config/firebase";
import { firebaseImageService } from "../services/firebaseImageService";

export default function JobAttachments() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!params.jobId) return;
    
    const q = query(
      collection(db, "jobAttachments"), 
      where("jobId", "==", params.jobId)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const attachmentsList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      attachmentsList.sort((a, b) => {
        const aDate = a.createdAt?.toDate?.() || new Date(0);
        const bDate = b.createdAt?.toDate?.() || new Date(0);
        return bDate - aDate;
      });
      setAttachments(attachmentsList);
    });
    
    return () => unsubscribe();
  }, [params.jobId]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera roll permissions are required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      uploadMedia(result.assets[0]);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permissions are required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled) {
      uploadMedia(result.assets[0]);
    }
  };

  const uploadMedia = async (asset) => {
    if (!asset?.uri) {
      Alert.alert("Error", "Invalid media file");
      return;
    }
    
    setUploading(true);
    try {
      console.log('Starting upload for asset:', asset.uri);
      const filename = `job_${params.jobId}_${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`;
      
      // Upload to Firebase Storage with better error handling
      let downloadURL;
      if (asset.type === 'video') {
        downloadURL = await firebaseImageService.uploadJobVideo(params.jobId, asset.uri);
      } else {
        downloadURL = await firebaseImageService.uploadJobPhoto(params.jobId, asset.uri, params.taskId);
      }
      
      console.log('Upload successful, URL:', downloadURL);
      
      // Save metadata to Firestore
      await addDoc(collection(db, "jobAttachments"), {
        jobId: params.jobId,
        jobTitle: params.jobTitle,
        taskId: params.taskId || null,
        url: downloadURL,
        type: asset.type || 'image',
        filename: filename,
        createdAt: new Date(),
        uploadedBy: "Current User"
      });
      
      Alert.alert("Success", `${asset.type === 'video' ? 'Video' : 'Photo'} uploaded successfully!`);
    } catch (error) {
      console.error("Upload error:", error);
      console.error("Error details:", error.code, error.message);
      Alert.alert("Upload Failed", `Error: ${error.message || 'Unknown error occurred'}`);
    } finally {
      setUploading(false);
    }
  };

  const renderAttachment = ({ item }) => (
    <View style={styles.attachmentCard}>
      <View style={styles.attachmentHeader}>
        <View style={styles.attachmentInfo}>
          <Text style={styles.attachmentType}>
            {item.type === 'video' ? '🎥 Video' : '📷 Photo'}
          </Text>
          <Text style={styles.attachmentDate}>
            {item.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}
          </Text>
        </View>
        <TouchableOpacity style={styles.downloadButton}>
          <AntDesign name="download" size={16} color="#4facfe" />
        </TouchableOpacity>
      </View>
      
      {item.type !== 'video' && (
        <Image source={{ uri: item.url }} style={styles.attachmentImage} />
      )}
      
      {item.type === 'video' && (
        <View style={styles.videoPlaceholder}>
          <AntDesign name="playcircleo" size={48} color="#6b7280" />
          <Text style={styles.videoText}>Video File</Text>
        </View>
      )}
      
      <Text style={styles.attachmentFilename}>{item.filename}</Text>
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
          <Text style={styles.headerTitle}>Job Media</Text>
          <Text style={styles.headerSubtitle}>{params.jobTitle}</Text>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>

      <View style={styles.actionButtons}>
        <TouchableOpacity 
          style={[styles.actionButton, uploading && styles.actionButtonDisabled]}
          onPress={takePhoto}
          disabled={uploading}
        >
          <AntDesign name="camera" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Take Photo</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, uploading && styles.actionButtonDisabled]}
          onPress={pickImage}
          disabled={uploading}
        >
          <AntDesign name="picture" size={20} color="#fff" />
          <Text style={styles.actionButtonText}>Choose Media</Text>
        </TouchableOpacity>
      </View>

      {uploading && (
        <View style={styles.uploadingContainer}>
          <AntDesign name="loading1" size={24} color="#4facfe" />
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}

      <FlatList
        data={attachments}
        renderItem={renderAttachment}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        numColumns={2}
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <AntDesign name="picture" size={48} color="#9ca3af" />
            <Text style={styles.emptyText}>No media yet</Text>
            <Text style={styles.emptySubtext}>Add photos or videos for this job</Text>
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
  actionButtons: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4facfe",
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  actionButtonDisabled: {
    backgroundColor: "#d1d5db",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  uploadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  uploadingText: {
    fontSize: 16,
    color: "#4facfe",
    fontWeight: "600",
  },
  content: {
    padding: 16,
  },
  attachmentCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    margin: 6,
    elevation: 2,
  },
  attachmentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  attachmentInfo: {
    flex: 1,
  },
  attachmentType: {
    fontSize: 12,
    fontWeight: "600",
    color: "#4facfe",
  },
  attachmentDate: {
    fontSize: 10,
    color: "#6b7280",
  },
  downloadButton: {
    padding: 4,
  },
  attachmentImage: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    marginBottom: 8,
  },
  videoPlaceholder: {
    width: "100%",
    height: 120,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  videoText: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 4,
  },
  attachmentFilename: {
    fontSize: 11,
    color: "#6b7280",
    textAlign: "center",
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
});