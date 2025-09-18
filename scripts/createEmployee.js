// Script to create employee accounts via Firebase Admin SDK
// Run with: node scripts/createEmployee.js

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to add your service account key)
const serviceAccount = require('./serviceAccountKey.json'); // Download from Firebase Console

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'teddys-cleaning-app'
});

const auth = admin.auth();
const db = admin.firestore();

async function createEmployee(email, password, name, phone) {
  try {
    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name,
    });

    console.log('Successfully created user:', userRecord.uid);

    // Add user to employees collection
    await db.collection('employees').doc(userRecord.uid).set({
      email: email,
      name: name,
      phone: phone,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      platform: 'admin-created'
    });

    console.log('Employee profile created successfully');
    return userRecord.uid;
  } catch (error) {
    console.error('Error creating employee:', error);
  }
}

// Example usage:
// createEmployee('employee@teddyscleaning.com.au', 'tempPassword123', 'John Doe', '+61400000000');

module.exports = { createEmployee };