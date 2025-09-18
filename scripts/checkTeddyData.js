// Check Teddy's data across all collections
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

const db = admin.firestore();

async function checkTeddyData() {
  try {
    console.log('🔍 Checking Teddy data across collections...\n');

    // Find user with username 'teddy'
    const usersSnapshot = await db.collection('users').where('username', '==', 'teddy').get();
    
    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      const uid = userDoc.id;
      
      console.log('=== USERS COLLECTION ===');
      console.log(`UID: ${uid}`);
      console.log(`Username: ${userData.username}`);
      console.log(`Email: ${userData.email}`);
      console.log(`UserType: ${userData.userType}`);
      console.log(`DisplayName: ${userData.displayName}`);
      
      // Check employees collection
      const employeeDoc = await db.collection('employees').doc(uid).get();
      if (employeeDoc.exists) {
        const employeeData = employeeDoc.data();
        console.log('\n=== EMPLOYEES COLLECTION ===');
        console.log(`Name: ${employeeData.name}`);
        console.log(`Role: ${employeeData.role}`);
        console.log(`OnboardingCompleted: ${employeeData.onboardingCompleted}`);
      }
      
      // Check admins collection
      const adminDoc = await db.collection('admins').doc(uid).get();
      if (adminDoc.exists) {
        const adminData = adminDoc.data();
        console.log('\n=== ADMINS COLLECTION ===');
        console.log(`Name: ${adminData.name}`);
        console.log(`Role: ${adminData.role}`);
      }
      
      // Check clients collection
      const clientDoc = await db.collection('clients').doc(uid).get();
      if (clientDoc.exists) {
        const clientData = clientDoc.data();
        console.log('\n=== CLIENTS COLLECTION ===');
        console.log(`Name: ${clientData.name}`);
        console.log(`OnboardingCompleted: ${clientData.onboardingCompleted}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkTeddyData();