import { supabase } from '../config/supabase';

export const testStorageConnection = async () => {
  try {
    console.log('Testing Supabase Storage connection...');
    
    // List buckets to verify connection
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Buckets error:', bucketsError);
      return { success: false, error: bucketsError.message };
    }
    
    console.log('Available buckets:', buckets);
    
    // Check if job-attachments bucket exists
    const jobAttachmentsBucket = buckets.find(bucket => bucket.name === 'job-attachments');
    
    if (!jobAttachmentsBucket) {
      console.error('job-attachments bucket not found');
      return { success: false, error: 'job-attachments bucket not found' };
    }
    
    // Test listing files in the bucket
    const { data: files, error: filesError } = await supabase.storage
      .from('job-attachments')
      .list('', { limit: 1 });
    
    if (filesError) {
      console.error('Files list error:', filesError);
      return { success: false, error: filesError.message };
    }
    
    console.log('Storage test successful!');
    return { success: true, buckets, files };
    
  } catch (error) {
    console.error('Storage test failed:', error);
    return { success: false, error: error.message };
  }
};

export const createStorageBucket = async () => {
  try {
    const { data, error } = await supabase.storage.createBucket('job-attachments', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'video/mp4'],
      fileSizeLimit: 10485760 // 10MB
    });
    
    if (error) {
      console.error('Bucket creation error:', error);
      return { success: false, error: error.message };
    }
    
    console.log('Bucket created successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Bucket creation failed:', error);
    return { success: false, error: error.message };
  }
};