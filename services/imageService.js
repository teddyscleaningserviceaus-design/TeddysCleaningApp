import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '../config/firebase';

export const imageService = {
  async uploadMessageImage(conversationId, imageUri) {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const filename = `message-images/${conversationId}/${Date.now()}.jpg`;
      const imageRef = ref(storage, filename);
      
      await uploadBytes(imageRef, blob);
      return await getDownloadURL(imageRef);
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  },

  async uploadJobImage(jobId, imageUri) {
    try {
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const filename = `job-images/${jobId}/${Date.now()}.jpg`;
      const imageRef = ref(storage, filename);
      
      await uploadBytes(imageRef, blob);
      return await getDownloadURL(imageRef);
    } catch (error) {
      console.error('Error uploading job image:', error);
      throw error;
    }
  }
};