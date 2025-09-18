// Required Firestore Indexes for Messaging and File Storage
// Create these in Firebase Console → Firestore Database → Indexes

// EXISTING INDEXES (Already created):
// ✅ messages: chatId (Ascending), createdAt (Ascending)
// ✅ jobs: assignedTo (Ascending), scheduledDate (Ascending)
// ✅ jobs: assignedTo (Ascending), createdAt (Ascending)
// ✅ guest-bookings: contactEmail (Ascending), createdAt (Ascending)
// ✅ unavailability: employeeId (Ascending), status (Ascending), startDate (Ascending)
// ✅ jobs: assignedTo (Ascending), updatedAt (Ascending)
// ✅ chats: participants (Array), lastMessageAt (Descending)
// ✅ users: userType (Ascending), createdAt (Ascending)

// MISSING INDEXES TO CREATE:

// 1. Jobs collection - for status-based queries
Collection: jobs
Fields: status (Ascending), createdAt (Descending)

// 2. Jobs collection - for scheduled date queries
Collection: jobs
Fields: scheduledDate (Ascending), status (Ascending)

// 3. Messages collection - for timestamp ordering
Collection: messages
Fields: chatId (Ascending), createdAt (Descending)

// 4. Guest bookings - for date-based queries
Collection: guest-bookings
Fields: scheduledDate (Ascending), status (Ascending)

// 5. Unavailability - for date range queries
Collection: unavailability
Fields: employeeId (Ascending), startDate (Ascending), endDate (Ascending)

// Alternative: Use Firebase CLI to create indexes
// Run: firebase deploy --only firestore:indexes