// Create admin account with username authentication
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

async function createAdminWithUsername() {
  try {
    console.log('👑 Creating admin account with username authentication...\n');

    const email = 'admin@teddy.com';
    const password = 'Admin123!';
    const username = 'admin';
    const name = 'Admin User';

    // Check if user already exists
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(email);
      console.log(`✅ Admin user already exists: ${userRecord.uid}`);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        // Create Firebase Auth user
        userRecord = await auth.createUser({
          email,
          password,
          emailVerified: true,
          displayName: name
        });
        console.log(`✅ Created Firebase Auth user: ${userRecord.uid}`);
      } else {
        throw error;
      }
    }

    // Create/update users collection entry with username
    await db.collection('users').doc(userRecord.uid).set({
      username,
      email,
      displayName: name,
      emailVerified: true,
      userType: 'admin',
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });

    // Create/update admins collection entry
    await db.collection('admins').doc(userRecord.uid).set({
      name,
      email,
      role: 'admin',
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }, { merge: true });

    console.log('✅ Created/updated admin database entries');
    console.log('\n🎉 Admin account ready for username authentication!');
    console.log('\n📋 Admin Login Credentials:');
    console.log(`Username: ${username}`);
    console.log(`Password: ${password}`);
    console.log(`Email: ${email}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

createAdminWithUsername();