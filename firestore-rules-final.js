rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null;
    }
    
    // Jobs collection
    match /jobs/{jobId} {
      allow read, write: if request.auth != null;
    }
    
    // Messages and Chats for messaging system
    match /messages/{messageId} {
      allow read, write: if request.auth != null;
    }
    
    match /chats/{chatId} {
      allow read, write: if request.auth != null;
    }
    
    // File attachments
    match /jobAttachments/{attachmentId} {
      allow read, write: if request.auth != null;
    }
    
    // Allow all other authenticated operations
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}