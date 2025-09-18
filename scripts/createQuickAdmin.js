// Quick script to create a working admin account
// Run with: node scripts/createQuickAdmin.js

const admin = require('firebase-admin');

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

async function createQuickAdmin() {
  const adminDetails = {
    username: 'admin',
    email: 'admin@teddyscleaning.com.au',
    password: 'AdminPass123!',
    name: 'System Admin',
    phone: '+61400000000'
  };

  try {
    console.log('🚀 Creating quick admin account...\n');

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: adminDetails.email,
      password: adminDetails.password,
      displayName: adminDetails.name,
      emailVerified: true,
    });

    console.log('✅ Firebase Auth user created:', userRecord.uid);

    // Create users collection entry
    await db.collection('users').doc(userRecord.uid).set({
      username: adminDetails.username,
      email: adminDetails.email,
      displayName: adminDetails.name,
      emailVerified: true,
      userType: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Create admin collection entry
    await db.collection('admins').doc(userRecord.uid).set({
      username: adminDetails.username,
      email: adminDetails.email,
      name: adminDetails.name,
      phone: adminDetails.phone,
      role: 'admin',
      permissions: ['all'],
      emailVerified: true,
      onboardingCompleted: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      platform: 'script-created'
    });

    console.log('✅ Admin account created successfully!');
    console.log('\n📋 Admin Login Details:');
    console.log(`👤 Username: ${adminDetails.username}`);
    console.log(`📧 Email: ${adminDetails.email}`);
    console.log(`🔑 Password: ${adminDetails.password}`);
    console.log(`🆔 UID: ${userRecord.uid}`);
    console.log('\n🎉 You can now login as admin!');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
  }
  
  process.exit(0);
}

createQuickAdmin();