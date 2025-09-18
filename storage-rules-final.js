rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Chat images
    match /chat-images/{chatId}/{fileName} {
      allow read, write: if request.auth != null;
    }
    
    // Job photos and videos
    match /job-photos/{jobId}/{fileName} {
      allow read, write: if request.auth != null;
    }
    
    match /job-videos/{jobId}/{fileName} {
      allow read, write: if request.auth != null;
    }
    
    // Profile images
    match /profile-images/{fileName} {
      allow read, write: if request.auth != null;
    }
    
    // Equipment photos
    match /equipment-photos/{equipmentId}/{fileName} {
      allow read, write: if request.auth != null;
    }
    
    // General file uploads
    match /{allPaths=**} {
      allow read, write: if request.auth != null && 
        resource.size < 10 * 1024 * 1024; // 10MB limit
    }
  }
}