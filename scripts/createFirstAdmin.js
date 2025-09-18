// Create first admin account after fresh start
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

async function createFirstAdmin() {
  try {
    console.log('👑 Creating first admin account...\n');

    const email = 'admin@teddy.com';
    const password = 'Admin123!';
    const username = 'admin';
    const name = 'Admin User';

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email,
      password,
      emailVerified: true,
      displayName: name
    });

    console.log(`✅ Created Firebase Auth user: ${userRecord.uid}`);

    // Create users collection entry
    await db.collection('users').doc(userRecord.uid).set({
      username,
      email,
      displayName: name,
      emailVerified: true,
      userType: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create admins collection entry
    await db.collection('admins').doc(userRecord.uid).set({
      name,
      email,
      role: 'admin',
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Created admin database entries');
    console.log('\n🎉 First admin created successfully!');
    console.log('\n📋 Admin Login Credentials:');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`Email: ${email}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

createFirstAdmin();