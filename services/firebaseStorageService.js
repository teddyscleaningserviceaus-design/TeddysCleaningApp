import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';

export class FirebaseStorageService {
  // Generic file upload
  async uploadFile(folder, fileId, fileUri, fileName = null, contentType = 'image/jpeg') {
    try {
      const response = await fetch(fileUri);
      const blob = await response.blob();
      
      const finalFileName = fileName || `${Date.now()}.${contentType.includes('video') ? 'mp4' : 'jpg'}`;
      const storageRef = ref(storage, `${folder}/${fileId}/${finalFileName}`);
      
      await uploadBytes(storageRef, blob);
      const downloadURL = await getDownloadURL(storageRef);
      
      return {
        success: true,
        url: downloadURL,
        path: `${folder}/${fileId}/${finalFileName}`,
        fileName: finalFileName
      };
    } catch (error) {
      console.error('Firebase upload error:', error);
      return {
        success: false,
        error: error.message,
        url: null
      };
    }
  }

  // Profile images
  async uploadProfileImage(userId, imageUri) {
    const fileName = `${userId}-${Date.now()}.jpg`;
    return this.uploadFile('profile-images', userId, imageUri, fileName);
  }

  // Chat images
  async uploadChatImage(chatId, imageUri) {
    const fileName = `${Date.now()}.jpg`;
    return this.uploadFile('chat-images', chatId, imageUri, fileName);
  }

  // Job photos
  async uploadJobPhoto(jobId, imageUri, taskId = null) {
    const fileName = `${taskId ? `task-${taskId}-` : ''}${Date.now()}.jpg`;
    return this.uploadFile('job-photos', jobId, imageUri, fileName);
  }

  // Task photos (specific to tasks)
  async uploadTaskPhoto(jobId, taskId, imageUri) {
    return this.uploadJobPhoto(jobId, imageUri, taskId);
  }

  // Equipment photos
  async uploadEquipmentPhoto(equipmentId, imageUri) {
    const fileName = `${Date.now()}.jpg`;
    return this.uploadFile('equipment-photos', equipmentId, imageUri, fileName);
  }

  // Job videos
  async uploadJobVideo(jobId, videoUri) {
    const fileName = `${Date.now()}.mp4`;
    return this.uploadFile('job-videos', jobId, videoUri, fileName, 'video/mp4');
  }

  // Get all files in a folder
  async getFiles(folder, fileId) {
    try {
      const folderRef = ref(storage, `${folder}/${fileId}`);
      const result = await listAll(folderRef);
      
      const files = await Promise.all(
        result.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef);
          return {
            name: itemRef.name,
            url: url,
            path: itemRef.fullPath
          };
        })
      );
      
      return {
        success: true,
        files: files
      };
    } catch (error) {
      console.error('Firebase list files error:', error);
      return {
        success: false,
        error: error.message,
        files: []
      };
    }
  }

  // Get job photos
  async getJobPhotos(jobId) {
    return this.getFiles('job-photos', jobId);
  }

  // Get task photos
  async getTaskPhotos(jobId, taskId) {
    const result = await this.getJobPhotos(jobId);
    if (result.success) {
      // Filter photos that belong to this task
      const taskPhotos = result.files.filter(file => 
        file.name.includes(`task-${taskId}-`)
      );
      return {
        success: true,
        files: taskPhotos
      };
    }
    return result;
  }

  // Get chat images
  async getChatImages(chatId) {
    return this.getFiles('chat-images', chatId);
  }

  // Delete file
  async deleteFile(filePath) {
    try {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      return {
        success: true
      };
    } catch (error) {
      console.error('Firebase delete error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Delete by URL (extract path from URL)
  async deleteFileByUrl(fileUrl) {
    try {
      // Extract path from Firebase Storage URL
      const url = new URL(fileUrl);
      const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
      if (pathMatch) {
        const filePath = decodeURIComponent(pathMatch[1]);
        return this.deleteFile(filePath);
      }
      throw new Error('Invalid Firebase Storage URL');
    } catch (error) {
      console.error('Firebase delete by URL error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Batch upload multiple files
  async uploadMultipleFiles(folder, fileId, fileUris, fileNames = null) {
    try {
      const uploads = fileUris.map((uri, index) => {
        const fileName = fileNames?.[index] || `${Date.now()}-${index}.jpg`;
        return this.uploadFile(folder, fileId, uri, fileName);
      });

      const results = await Promise.all(uploads);
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      return {
        success: failed.length === 0,
        successful: successful,
        failed: failed,
        totalUploaded: successful.length,
        totalFailed: failed.length
      };
    } catch (error) {
      console.error('Firebase batch upload error:', error);
      return {
        success: false,
        error: error.message,
        successful: [],
        failed: fileUris.map(uri => ({ uri, error: error.message }))
      };
    }
  }
}

export const firebaseStorageService = new FirebaseStorageService();