// Fix the incomplete employee or delete it
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

async function fixIncompleteEmployee() {
  try {
    console.log('🔧 Fixing incomplete employee...\n');

    const employeesSnapshot = await db.collection('employees').get();
    
    for (const doc of employeesSnapshot.docs) {
      const data = doc.data();
      const uid = doc.id;
      
      if (!data.name || data.email === 'tewedross12@gmail.comt') {
        console.log(`Found incomplete employee: ${uid}`);
        console.log(`Email: ${data.email}`);
        
        // Delete this incomplete employee
        await db.collection('employees').doc(uid).delete();
        await db.collection('users').doc(uid).delete();
        
        try {
          await auth.deleteUser(uid);
          console.log('✅ Deleted incomplete employee from all locations');
        } catch (authError) {
          console.log('✅ Deleted from database (Auth user may not exist)');
        }
      }
    }

    console.log('\n🎉 Cleanup complete!');
    console.log('Now create a new employee with correct details.');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

fixIncompleteEmployee();