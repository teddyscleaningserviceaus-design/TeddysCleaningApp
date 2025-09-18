// Script to specifically update admin accounts for new auth system
// Run with: node scripts/updateAdmins.js

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

async function updateAdmins() {
  try {
    console.log('🔄 Updating admin accounts for new auth system...\n');

    // Get all existing admins
    const adminsSnapshot = await db.collection('admins').get();
    
    if (adminsSnapshot.empty) {
      console.log('No existing admins found.');
      return;
    }

    for (const doc of adminsSnapshot.docs) {
      const adminData = doc.data();
      const uid = doc.id;
      
      console.log(`Processing admin: ${adminData.name || adminData.email}`);

      try {
        // Get Firebase Auth user
        let userRecord;
        try {
          userRecord = await auth.getUser(uid);
        } catch (authError) {
          console.log(`❌ No Firebase Auth user found for ${uid}, skipping...`);
          continue;
        }
        
        // Generate username from email if not exists
        let username = adminData.username;
        if (!username) {
          username = userRecord.email.split('@')[0].toLowerCase();
          // Ensure username is unique
          let counter = 1;
          let testUsername = username;
          while (true) {
            const existingUser = await db.collection('users').where('username', '==', testUsername).get();
            if (existingUser.empty) {
              username = testUsername;
              break;
            }
            testUsername = `${username}${counter}`;
            counter++;
          }
        }

        // Create/update users collection entry
        await db.collection('users').doc(uid).set({
          username: username.toLowerCase(),
          email: userRecord.email.toLowerCase(),
          displayName: adminData.name || userRecord.displayName || username,
          emailVerified: true, // Auto-verify existing admins
          userType: 'admin', // Set as admin
          createdAt: adminData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Update admin document with missing fields
        await db.collection('admins').doc(uid).update({
          username: username.toLowerCase(),
          emailVerified: true,
          onboardingCompleted: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Mark email as verified in Firebase Auth
        await auth.updateUser(uid, {
          emailVerified: true
        });

        console.log(`✅ Updated admin: ${adminData.name} (username: ${username})`);

      } catch (error) {
        console.error(`❌ Failed to update admin ${uid}:`, error.message);
      }
    }

    console.log('\n🎉 Admin update complete!');
    console.log('\n📋 Admins can now login with:');
    console.log('- Their username (generated from email)');
    console.log('- Their existing password');
    console.log('- Email verification is automatically completed');
    
  } catch (error) {
    console.error('❌ Error updating admins:', error);
  }
  
  process.exit(0);
}

// Run the update
updateAdmins();