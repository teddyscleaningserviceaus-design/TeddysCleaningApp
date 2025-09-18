// Fix Teddy's role assignment
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

async function fixTeddyRole() {
  try {
    console.log('🔧 Fixing Teddy role assignment...\n');

    // Find user with username 'teddy'
    const usersSnapshot = await db.collection('users').where('username', '==', 'teddy').get();
    
    if (!usersSnapshot.empty) {
      const userDoc = usersSnapshot.docs[0];
      const userData = userDoc.data();
      const uid = userDoc.id;
      
      console.log(`Found user: ${userData.displayName} (${userData.email})`);
      
      // Check employee record
      const employeeDoc = await db.collection('employees').doc(uid).get();
      if (employeeDoc.exists) {
        const employeeData = employeeDoc.data();
        console.log(`Current employee role: ${employeeData.role}`);
        
        // Update employee role to 'employee' and users collection to 'employee'
        await db.collection('employees').doc(uid).update({
          role: 'employee',
          updatedAt: new Date()
        });
        
        await db.collection('users').doc(uid).update({
          userType: 'employee',
          updatedAt: new Date()
        });
        
        console.log('✅ Fixed Teddy role: employee → employee dashboard');
      }
    }

    console.log('\n🎉 Role assignment fixed!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

fixTeddyRole();