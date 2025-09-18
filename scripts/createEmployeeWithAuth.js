// Enhanced script to create employee accounts compatible with new auth system
// Run with: node scripts/createEmployeeWithAuth.js

const admin = require('firebase-admin');

// Initialize Firebase Admin (you'll need to add your service account key)
// Download serviceAccountKey.json from Firebase Console > Project Settings > Service Accounts
try {
  const serviceAccount = require('./serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'teddys-cleaning-app'
  });
} catch (error) {
  console.error('Please download serviceAccountKey.json from Firebase Console');
  process.exit(1);
}

const auth = admin.auth();
const db = admin.firestore();

async function createEmployeeWithAuth(username, email, password, name, phone, role = 'employee') {
  try {
    console.log(`Creating employee: ${name} (${username})`);

    // Check if username already exists
    const usernameQuery = await db.collection('users').where('username', '==', username.toLowerCase()).get();
    if (!usernameQuery.empty) {
      throw new Error(`Username '${username}' already exists`);
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name,
      emailVerified: true, // Auto-verify employees
    });

    console.log('✅ Firebase Auth user created:', userRecord.uid);

    // Create users collection entry (required for new auth system)
    await db.collection('users').doc(userRecord.uid).set({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      displayName: name,
      emailVerified: true,
      userType: role, // 'employee' or 'admin'
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Users collection entry created');

    // Create employees collection entry
    await db.collection('employees').doc(userRecord.uid).set({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      name: name,
      phone: phone,
      role: role,
      status: 'active',
      emailVerified: true,
      onboardingCompleted: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      platform: 'admin-created'
    });

    console.log('✅ Employee profile created');

    // If admin role, also create admin collection entry
    if (role === 'admin') {
      await db.collection('admins').doc(userRecord.uid).set({
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        name: name,
        phone: phone,
        role: 'admin',
        permissions: ['all'], // Full permissions
        emailVerified: true,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        platform: 'admin-created'
      });
      console.log('✅ Admin profile created');
    }

    console.log(`🎉 Successfully created ${role}: ${name}`);
    console.log(`📧 Email: ${email}`);
    console.log(`👤 Username: ${username}`);
    console.log(`🔑 Password: ${password}`);
    console.log(`🆔 UID: ${userRecord.uid}`);
    
    return userRecord.uid;
  } catch (error) {
    console.error('❌ Error creating employee:', error.message);
    throw error;
  }
}

// Batch create multiple employees
async function createMultipleEmployees() {
  const employees = [
    {
      username: 'john_cleaner',
      email: 'john@teddyscleaning.com.au',
      password: 'TempPass123!',
      name: 'John Smith',
      phone: '+61400000001',
      role: 'employee'
    },
    {
      username: 'sarah_admin',
      email: 'sarah@teddyscleaning.com.au', 
      password: 'AdminPass123!',
      name: 'Sarah Johnson',
      phone: '+61400000002',
      role: 'admin'
    },
    {
      username: 'mike_cleaner',
      email: 'mike@teddyscleaning.com.au',
      password: 'TempPass123!',
      name: 'Mike Wilson',
      phone: '+61400000003',
      role: 'employee'
    }
  ];

  console.log('🚀 Creating multiple employees...\n');

  for (const emp of employees) {
    try {
      await createEmployeeWithAuth(
        emp.username,
        emp.email,
        emp.password,
        emp.name,
        emp.phone,
        emp.role
      );
      console.log('---\n');
    } catch (error) {
      console.error(`Failed to create ${emp.name}:`, error.message);
      console.log('---\n');
    }
  }

  console.log('✅ Batch creation complete!');
  process.exit(0);
}

// Run the batch creation
createMultipleEmployees();

// Export for individual use
module.exports = { createEmployeeWithAuth };