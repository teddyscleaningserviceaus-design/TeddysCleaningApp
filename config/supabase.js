import { createClient } from '@supabase/supabase-js';

// Replace with your Supabase project URL and anon key
const supabaseUrl = 'https://arqahpzogpkwsvhxxyhq.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFycWFocHpvZ3Brd3N2aHh4eWhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NzE1MzEsImV4cCI6MjA3MjU0NzUzMX0.WXLeIDKC-zZEymE7gbjwgJhN_a37hbPNI1Hc5kxkxs4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper function to upload job photos
export const uploadJobPhoto = async (jobId, imageUri, fileName) => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    const filePath = `job-photos/${jobId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('job-attachments')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('job-attachments')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to upload equipment photos
export const uploadEquipmentPhoto = async (equipmentId, imageUri, fileName) => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    const filePath = `equipment-photos/${equipmentId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('job-attachments')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('job-attachments')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to upload profile images
export const uploadProfileImage = async (userId, imageUri, fileName) => {
  try {
    const response = await fetch(imageUri);
    const blob = await response.blob();
    
    const filePath = `profile-images/${userId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('job-attachments')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('job-attachments')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to upload videos
export const uploadJobVideo = async (jobId, videoUri, fileName) => {
  try {
    const response = await fetch(videoUri);
    const blob = await response.blob();
    
    const filePath = `job-videos/${jobId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('job-attachments')
      .upload(filePath, blob, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('job-attachments')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Generic upload function for any file type
export const uploadFile = async (folder, fileId, fileUri, fileName, contentType = 'image/jpeg') => {
  try {
    const response = await fetch(fileUri);
    const blob = await response.blob();
    
    const filePath = `${folder}/${fileId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('job-attachments')
      .upload(filePath, blob, {
        contentType,
        upsert: true
      });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('job-attachments')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Helper function to upload chat images
export const uploadChatImage = async (chatId, imageUri, fileName) => {
  try {
    const response = await fetch(imageUri);
    if (!response.ok) {
      return { success: false, url: imageUri, error: 'Fetch failed' };
    }
    const blob = await response.blob();
    
    const filePath = `chat-images/${chatId}/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('job-attachments')
      .upload(filePath, blob, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      return { success: false, url: imageUri, error: error.message };
    }

    const { data: urlData } = supabase.storage
      .from('job-attachments')
      .getPublicUrl(filePath);

    return {
      success: true,
      url: urlData.publicUrl,
      path: filePath
    };
  } catch (error) {
    console.error('Chat image upload error:', error);
    return {
      success: false,
      url: imageUri,
      error: error.message
    };
  }
};