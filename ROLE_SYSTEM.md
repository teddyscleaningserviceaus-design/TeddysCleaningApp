# Firebase Role System - Teddy's Cleaning App

## Overview
The app now uses Firebase collections to separate client and employee data, with role-based access control.

## Firebase Structure

### Collections:
```
clients/
├── {userId}/
│   ├── email: string
│   ├── name: string
│   ├── phone: string
│   ├── createdAt: timestamp
│   └── platform: 'app' | 'website'

employees/
├── {userId}/
│   ├── email: string
│   ├── name: string
│   ├── phone: string
│   ├── createdAt: timestamp
│   └── platform: 'admin-created'

bookings/
├── {bookingId}/
│   ├── clientId: string (for client bookings)
│   ├── employeeId: string (for employee assignments)
│   ├── ...other booking data
```

## User Registration Flow

### Clients (Public Registration):
1. User registers via app/website
2. Automatically added to `clients` collection
3. Routes to client dashboard

### Employees (Admin-Only Creation):
1. Admin creates employee via Firebase Console or script
2. Employee added to `employees` collection
3. Employee can login and routes to employee dashboard

## Role Detection Logic

```typescript
// Check employees collection first
const employeeDoc = await getDoc(doc(db, 'employees', userId));
if (employeeDoc.exists()) return 'employee';

// Check clients collection
const clientDoc = await getDoc(doc(db, 'clients', userId));
if (clientDoc.exists()) return 'client';

// New user - create as client
await setDoc(doc(db, 'clients', userId), userData);
return 'client';
```

## Creating Employee Accounts

### Method 1: Firebase Console
1. Go to Firebase Console > Authentication
2. Add user with email/password
3. Go to Firestore > employees collection
4. Add document with userId as document ID

### Method 2: Admin Script (Recommended)
```bash
# Install Firebase Admin SDK
npm install firebase-admin

# Download service account key from Firebase Console
# Place in scripts/serviceAccountKey.json

# Run script
node scripts/createEmployee.js
```

### Method 3: Web Admin Panel
Create a web interface for admins to add employees (future enhancement).

## Security Rules

Update Firestore security rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Clients can only access their own data
    match /clients/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Employees can read their own data
    match /employees/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false; // Only admin can modify
    }
    
    // Bookings access based on role
    match /bookings/{bookingId} {
      allow read, write: if request.auth != null && 
        (request.auth.uid == resource.data.clientId || 
         request.auth.uid == resource.data.employeeId);
    }
  }
}
```

## App Routing

### Client Flow:
- Login → Client Dashboard (`/(client-tabs)/bookings`)
- Can create bookings, view history

### Employee Flow:
- Login → Employee Dashboard (`/(tabs)/dashboard`)
- Can view assigned jobs, update status

## Benefits

1. **Data Separation**: Client and employee data in separate collections
2. **Security**: Role-based access control
3. **Scalability**: Easy to add more roles/permissions
4. **Admin Control**: Only admins can create employee accounts
5. **Flexibility**: Different dashboards for different user types