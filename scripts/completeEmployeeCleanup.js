// Complete cleanup of all employee data from all collections
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

async function completeEmployeeCleanup() {
  try {
    console.log('🧹 Complete Employee Data Cleanup\n');

    let deletedCount = 0;

    // 1. Clean up from users collection (employees)
    console.log('1️⃣ Cleaning users collection...');
    const usersSnapshot = await db.collection('users').where('userType', '==', 'employee').get();
    
    for (const doc of usersSnapshot.docs) {
      const data = doc.data();
      const uid = doc.id;
      
      console.log(`   Deleting employee: ${data.displayName || data.name || data.email || uid}`);
      
      // Delete from users collection
      await db.collection('users').doc(uid).delete();
      
      // Delete from Auth
      try {
        await auth.deleteUser(uid);
        console.log('   ✅ Deleted from Auth and users collection');
      } catch (authError) {
        console.log('   ✅ Deleted from users collection (Auth user may not exist)');
      }
      
      deletedCount++;
    }

    // 2. Clean up from employees collection (if it exists)
    console.log('\n2️⃣ Cleaning employees collection...');
    const employeesSnapshot = await db.collection('employees').get();
    
    for (const doc of employeesSnapshot.docs) {
      const data = doc.data();
      const uid = doc.id;
      
      console.log(`   Deleting employee: ${data.name || data.email || uid}`);
      
      // Delete from employees collection
      await db.collection('employees').doc(uid).delete();
      
      // Delete from Auth if not already deleted
      try {
        await auth.deleteUser(uid);
        console.log('   ✅ Deleted from Auth and employees collection');
      } catch (authError) {
        console.log('   ✅ Deleted from employees collection (Auth user may not exist)');
      }
      
      deletedCount++;
    }

    // 3. Clean up any jobs assigned to deleted employees
    console.log('\n3️⃣ Cleaning up job assignments...');
    const jobsSnapshot = await db.collection('jobs').get();
    let jobsUpdated = 0;
    
    for (const doc of jobsSnapshot.docs) {
      const jobData = doc.data();
      
      if (jobData.assignedTo) {
        // Check if assigned employee still exists
        const employeeExists = await db.collection('users').doc(jobData.assignedTo).get();
        
        if (!employeeExists.exists) {
          console.log(`   Unassigning job: ${jobData.title || doc.id}`);
          await db.collection('jobs').doc(doc.id).update({
            assignedTo: null,
            status: 'Pending',
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          jobsUpdated++;
        }
      }
    }

    // 4. List remaining users to verify cleanup
    console.log('\n4️⃣ Verifying cleanup...');
    const remainingUsers = await db.collection('users').get();
    const employees = remainingUsers.docs.filter(doc => doc.data().userType === 'employee');
    
    console.log(`\n📊 Cleanup Summary:`);
    console.log(`   • Employees deleted: ${deletedCount}`);
    console.log(`   • Jobs unassigned: ${jobsUpdated}`);
    console.log(`   • Remaining employees: ${employees.length}`);
    
    if (employees.length > 0) {
      console.log('\n⚠️  Remaining employees:');
      employees.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.displayName || data.name || data.email || doc.id}`);
      });
    } else {
      console.log('\n🎉 All employee data successfully cleaned up!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

completeEmployeeCleanup();