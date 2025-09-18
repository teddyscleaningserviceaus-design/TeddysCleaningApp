// Quick fix for existing admin/employee login issues
const admin = require('firebase-admin');

// Initialize Firebase Admin
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

async function fixExistingAccounts() {
  try {
    console.log('🔧 Fixing existing admin/employee accounts...\n');

    // Fix employees
    const employeesSnapshot = await db.collection('employees').get();
    for (const doc of employeesSnapshot.docs) {
      const data = doc.data();
      const uid = doc.id;
      
      try {
        const userRecord = await auth.getUser(uid);
        const username = userRecord.email.split('@')[0].toLowerCase();
        
        // Create users collection entry
        await db.collection('users').doc(uid).set({
          username,
          email: userRecord.email.toLowerCase(),
          displayName: data.name || username,
          emailVerified: true,
          userType: data.role === 'admin' ? 'admin' : 'employee',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Mark email as verified
        await auth.updateUser(uid, { emailVerified: true });
        
        console.log(`✅ Fixed employee: ${data.name} (username: ${username})`);
      } catch (error) {
        console.log(`❌ Failed to fix ${data.name}: ${error.message}`);
      }
    }

    // Fix admins
    const adminsSnapshot = await db.collection('admins').get();
    for (const doc of adminsSnapshot.docs) {
      const data = doc.data();
      const uid = doc.id;
      
      try {
        const userRecord = await auth.getUser(uid);
        const username = userRecord.email.split('@')[0].toLowerCase();
        
        // Create users collection entry
        await db.collection('users').doc(uid).set({
          username,
          email: userRecord.email.toLowerCase(),
          displayName: data.name || username,
          emailVerified: true,
          userType: 'admin',
          createdAt: new Date(),
          updatedAt: new Date()
        });

        // Mark email as verified
        await auth.updateUser(uid, { emailVerified: true });
        
        console.log(`✅ Fixed admin: ${data.name} (username: ${username})`);
      } catch (error) {
        console.log(`❌ Failed to fix ${data.name}: ${error.message}`);
      }
    }

    console.log('\n🎉 All accounts fixed!');
    console.log('\n📋 Login instructions:');
    console.log('- Use your EMAIL PREFIX as username (part before @)');
    console.log('- Use your existing password');
    console.log('- Example: admin@teddy.com → username: "admin"');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

fixExistingAccounts();