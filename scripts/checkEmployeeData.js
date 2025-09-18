// Check current employee data across all collections
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

async function checkEmployeeData() {
  try {
    console.log('🔍 Employee Data Status Check\n');

    // Check users collection
    console.log('1️⃣ Users Collection:');
    const usersSnapshot = await db.collection('users').get();
    const employees = usersSnapshot.docs.filter(doc => doc.data().userType === 'employee');
    
    console.log(`   Total users: ${usersSnapshot.docs.length}`);
    console.log(`   Employees: ${employees.length}`);
    
    if (employees.length > 0) {
      console.log('   Employee details:');
      employees.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.displayName || data.name || data.email || doc.id} (${data.status || 'no status'})`);
      });
    }

    // Check employees collection
    console.log('\n2️⃣ Employees Collection:');
    const employeesSnapshot = await db.collection('employees').get();
    console.log(`   Employee records: ${employeesSnapshot.docs.length}`);
    
    if (employeesSnapshot.docs.length > 0) {
      console.log('   Employee details:');
      employeesSnapshot.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.name || data.email || doc.id} (${data.status || 'no status'})`);
      });
    }

    // Check job assignments
    console.log('\n3️⃣ Job Assignments:');
    const jobsSnapshot = await db.collection('jobs').get();
    const assignedJobs = jobsSnapshot.docs.filter(doc => doc.data().assignedTo);
    
    console.log(`   Total jobs: ${jobsSnapshot.docs.length}`);
    console.log(`   Assigned jobs: ${assignedJobs.length}`);
    
    if (assignedJobs.length > 0) {
      console.log('   Job assignments:');
      for (const doc of assignedJobs.slice(0, 5)) { // Show first 5
        const data = doc.data();
        const employeeDoc = await db.collection('users').doc(data.assignedTo).get();
        const employeeName = employeeDoc.exists ? 
          (employeeDoc.data().displayName || employeeDoc.data().name || employeeDoc.data().email) : 
          'Unknown Employee';
        console.log(`   - ${data.title || doc.id} → ${employeeName} (${data.status})`);
      }
      if (assignedJobs.length > 5) {
        console.log(`   ... and ${assignedJobs.length - 5} more`);
      }
    }

    // Summary
    console.log('\n📊 Summary:');
    if (employees.length === 0 && employeesSnapshot.docs.length === 0) {
      console.log('   ✅ No employee data found - cleanup complete!');
    } else {
      console.log('   ⚠️  Employee data still exists:');
      if (employees.length > 0) {
        console.log(`      - ${employees.length} employees in users collection`);
      }
      if (employeesSnapshot.docs.length > 0) {
        console.log(`      - ${employeesSnapshot.docs.length} employees in employees collection`);
      }
      console.log('   💡 Run completeEmployeeCleanup.js to clean up');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

checkEmployeeData();