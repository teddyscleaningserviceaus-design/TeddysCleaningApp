// Clean up all incomplete employees and orphaned Auth users
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

async function cleanupAllEmployees() {
  try {
    console.log('🧹 Cleaning up all employees and Auth users...\n');

    // Delete all employees
    const employeesSnapshot = await db.collection('employees').get();
    for (const doc of employeesSnapshot.docs) {
      const data = doc.data();
      const uid = doc.id;
      
      console.log(`Deleting employee: ${data.name || data.email || uid}`);
      
      // Delete from Firestore
      await db.collection('employees').doc(uid).delete();
      await db.collection('users').doc(uid).delete();
      
      // Delete from Auth
      try {
        await auth.deleteUser(uid);
        console.log('✅ Deleted from Auth and Firestore');
      } catch (authError) {
        console.log('✅ Deleted from Firestore (Auth user may not exist)');
      }
    }

    // List remaining Auth users to check for orphans
    console.log('\n📋 Remaining Auth users:');
    const listUsersResult = await auth.listUsers(1000);
    
    for (const userRecord of listUsersResult.users) {
      // Check if user exists in any collection
      const userDoc = await db.collection('users').doc(userRecord.uid).get();
      const adminDoc = await db.collection('admins').doc(userRecord.uid).get();
      const clientDoc = await db.collection('clients').doc(userRecord.uid).get();
      
      if (!userDoc.exists && !adminDoc.exists && !clientDoc.exists) {
        console.log(`🔍 Orphaned Auth user: ${userRecord.email} (${userRecord.uid})`);
        // Uncomment to delete orphaned users:
        // await auth.deleteUser(userRecord.uid);
        // console.log('✅ Deleted orphaned Auth user');
      } else {
        console.log(`✅ Valid user: ${userRecord.email}`);
      }
    }

    console.log('\n🎉 Cleanup complete!');
    console.log('Now you can create employees with any email address.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

cleanupAllEmployees();