# Required Firestore Indexes for Messaging System

## Create these composite indexes in Firebase Console:

### 1. Chats Collection
- Collection: `chats`
- Fields: 
  - `participants` (Array)
  - `lastMessageAt` (Descending)

### 2. Messages Collection  
- Collection: `messages`
- Fields:
  - `chatId` (Ascending)
  - `createdAt` (Ascending)

### 3. Direct Chat Query Index
- Collection: `chats`
- Fields:
  - `participants` (Array)
  - `isGroup` (Ascending)

## How to create:
1. Go to Firebase Console > Firestore Database > Indexes
2. Click "Create Index"
3. Add the fields as specified above
4. Click "Create"

## Auto-create links (if available):
The system will provide auto-create links when you first use the messaging features.