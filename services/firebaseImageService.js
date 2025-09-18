import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export class FirebaseImageService {
  async uploadProfileImage(userId, imageUri) {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const fileName = `${userId}-${Date.now()}.jpg`;
      const storageRef = ref(storage, `profile-images/${fileName}`);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Firebase upload error:', error);
      throw error;
    }
  }

  async uploadChatImage(chatId, imageUri) {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const fileName = `${Date.now()}.jpg`;
      const storageRef = ref(storage, `chat-images/${chatId}/${fileName}`);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Firebase chat image upload error:', error);
      throw error;
    }
  }

  async uploadJobPhoto(jobId, imageUri, taskId = null) {
    try {
      if (!imageUri) {
        throw new Error('Image URI is required');
      }
      
      console.log('Fetching image from URI:', imageUri);
      const response = await fetch(imageUri);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      
      const blob = await response.blob();
      console.log('Image blob created, size:', blob.size);
      
      const fileName = `${taskId ? `task-${taskId}-` : ''}${Date.now()}.jpg`;
      const storageRef = ref(storage, `job-photos/${jobId}/${fileName}`);
      
      console.log('Uploading to Firebase Storage:', fileName);
      await uploadBytes(storageRef, blob);
      
      console.log('Getting download URL...');
      const downloadURL = await getDownloadURL(storageRef);
      
      console.log('Upload complete, URL:', downloadURL);
      return downloadURL;
    } catch (error) {
      console.error('Firebase job photo upload error:', error);
      throw new Error(`Upload failed: ${error.message}`);
    }
  }

  async uploadTaskPhoto(jobId, taskId, imageUri) {
    return this.uploadJobPhoto(jobId, imageUri, taskId);
  }

  async uploadEquipmentPhoto(equipmentId, imageUri) {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      
      const fileName = `${Date.now()}.jpg`;
      const storageRef = ref(storage, `equipment-photos/${equipmentId}/${fileName}`);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Firebase equipment photo upload error:', error);
      throw error;
    }
  }

  async uploadJobVideo(jobId, videoUri) {
    try {
      const response = await fetch(videoUri);
      const blob = await response.blob();
      
      const fileName = `${Date.now()}.mp4`;
      const storageRef = ref(storage, `job-videos/${jobId}/${fileName}`);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Firebase job video upload error:', error);
      throw error;
    }
  }

  async uploadFile(folder, fileId, fileUri, fileName = null, isVideo = false) {
    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      const finalFileName = fileName || `${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`;
      const storageRef = ref(storage, `${folder}/${fileId}/${finalFileName}`);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return downloadURL;
    } catch (error) {
      console.error('Firebase file upload error:', error);
      throw error;
    }
  }

  async deleteFile(fileUrl) {
    try {
      const fileRef = ref(storage, fileUrl);
      await deleteObject(fileRef);
    } catch (error) {
      console.error('Firebase delete error:', error);
    }
  }

  async deleteImage(imageUrl) {
    return this.deleteFile(imageUrl);
  }
}

export const firebaseImageService = new FirebaseImageService();