rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload job attachments with size limit
    match /job-attachments/{jobId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 10 * 1024 * 1024; // 10MB limit
    }
    
    // Allow authenticated users to upload job photos
    match /job-photos/{jobId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 5 * 1024 * 1024; // 5MB limit
    }
    
    // Allow authenticated users to upload profile images
    match /profile-images/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.auth.uid == userId
        && request.resource.size < 2 * 1024 * 1024; // 2MB limit
    }
    
    // Allow authenticated users to upload chat images
    match /chat-images/{chatId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 5 * 1024 * 1024; // 5MB limit
    }
    
    // Allow authenticated users to upload equipment photos
    match /equipment-photos/{equipmentId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 5 * 1024 * 1024; // 5MB limit
    }
    
    // Allow authenticated users to upload job videos
    match /job-videos/{jobId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 50 * 1024 * 1024; // 50MB limit for videos
    }
    
    // Fallback for other authenticated uploads
    match /{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null 
        && request.resource.size < 10 * 1024 * 1024; // 10MB limit
    }
  }
}