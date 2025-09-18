# Admin Setup Instructions

## Firestore Index Fix
The Firestore permission error you encountered is because we need to create a composite index for the query. However, I've fixed this by removing the `orderBy` clause and sorting in memory instead.

## Admin Authentication Setup

### 1. Create Admin User in Firebase Auth
1. Go to Firebase Console → Authentication → Users
2. Click "Add user"
3. Enter admin email (e.g., `admin@teddyscleaning.com`)
4. Enter a secure password
5. Copy the User UID from the created user

### 2. Create Admin Document in Firestore
1. Go to Firebase Console → Firestore Database
2. Create a new collection called `admins`
3. Create a document with the User UID as the document ID
4. Add these fields:
   ```
   email: "admin@teddyscleaning.com"
   name: "Admin User"
   role: "admin"
   createdAt: [current timestamp]
   permissions: ["manage_jobs", "manage_employees", "view_reports"]
   ```

### 3. Admin Login
- Use the `/admin-login` route to access admin portal
- Login with the admin email and password
- System will verify admin status in Firestore

### 4. Admin Features Available
- **Dashboard**: Overview stats and quick actions
- **Create Jobs**: Full job creation (same as current add-job)
- **Work Requests**: Review and approve employee work requests
- **Task Builder**: Create custom task templates

## Employee vs Admin Differences

### Employee Collection Fields:
```
{
  email: "employee@example.com",
  name: "Employee Name",
  role: "employee",
  assignedJobs: [],
  createdAt: timestamp,
  status: "active"
}
```

### Admin Collection Fields:
```
{
  email: "admin@example.com", 
  name: "Admin Name",
  role: "admin",
  permissions: ["manage_jobs", "manage_employees", "view_reports"],
  createdAt: timestamp
}
```

## Security Rules Update Needed
Add these rules to your Firestore security rules:

```javascript
// Allow admins to read/write everything
match /admins/{adminId} {
  allow read, write: if request.auth != null && request.auth.uid == adminId;
}

// Allow admins to manage work requests
match /workRequests/{requestId} {
  allow read, write: if request.auth != null && 
    exists(/databases/$(database)/documents/admins/$(request.auth.uid));
}

// Allow employees to create work requests, admins to manage
match /workRequests/{requestId} {
  allow create: if request.auth != null && 
    exists(/databases/$(database)/documents/employees/$(request.auth.uid));
  allow read, update: if request.auth != null && 
    (resource.data.requestedBy == request.auth.uid || 
     exists(/databases/$(database)/documents/admins/$(request.auth.uid)));
}
```

## Quick Admin Setup (Manual)
1. Create admin user in Firebase Auth
2. Copy the UID
3. In Firestore, create: `admins/{UID}` with the fields above
4. Access admin portal at `/admin-login`

The admin system is now ready to use!