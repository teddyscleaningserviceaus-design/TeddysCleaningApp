// Script to update existing employees to work with new auth system
// Run with: node scripts/updateExistingEmployees.js

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

async function updateExistingEmployees() {
  try {
    console.log('🔄 Updating existing employees for new auth system...\n');

    // Get all existing employees
    const employeesSnapshot = await db.collection('employees').get();
    
    if (employeesSnapshot.empty) {
      console.log('No existing employees found.');
      return;
    }

    for (const doc of employeesSnapshot.docs) {
      const employeeData = doc.data();
      const uid = doc.id;
      
      console.log(`Processing employee: ${employeeData.name || employeeData.email}`);

      try {
        // Get Firebase Auth user
        const userRecord = await auth.getUser(uid);
        
        // Generate username from email if not exists
        let username = employeeData.username;
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
          displayName: employeeData.name || userRecord.displayName || username,
          emailVerified: true, // Auto-verify existing employees
          userType: employeeData.role === 'admin' ? 'admin' : 'employee',
          createdAt: employeeData.createdAt || admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        // Update employee document with missing fields
        await db.collection('employees').doc(uid).update({
          username: username.toLowerCase(),
          emailVerified: true,
          onboardingCompleted: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Mark email as verified in Firebase Auth
        await auth.updateUser(uid, {
          emailVerified: true
        });

        console.log(`✅ Updated: ${employeeData.name} (username: ${username})`);

      } catch (error) {
        console.error(`❌ Failed to update employee ${uid}:`, error.message);
      }
    }

    console.log('\n🎉 Employee update complete!');
    console.log('\n📋 Employees can now login with:');
    console.log('- Their username (generated from email)');
    console.log('- Their existing password');
    console.log('- Email verification is automatically completed');
    
  } catch (error) {
    console.error('❌ Error updating employees:', error);
  }
  
  process.exit(0);
}

// Run the update
updateExistingEmployees();