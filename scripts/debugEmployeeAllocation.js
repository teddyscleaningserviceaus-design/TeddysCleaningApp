// Debug script to check employee data for allocation issues
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

async function debugEmployeeAllocation() {
  try {
    console.log('🔍 Employee Allocation Debug Report\n');

    // Check users collection for employees
    console.log('1️⃣ Users Collection (Employee Data):');
    const usersSnapshot = await db.collection('users').get();
    const employees = usersSnapshot.docs.filter(doc => doc.data().userType === 'employee');
    
    console.log(`   Total users: ${usersSnapshot.docs.length}`);
    console.log(`   Employees found: ${employees.length}\n`);
    
    if (employees.length === 0) {
      console.log('   ❌ NO EMPLOYEES FOUND IN USERS COLLECTION');
      console.log('   This is why no employees show up in allocation!');
    } else {
      console.log('   Employee Details:');
      employees.forEach((doc, index) => {
        const data = doc.data();
        const name = data.displayName || data.name || data.email?.split('@')[0] || 'Unknown';
        const status = data.status || 'no status';
        const hasAddress = !!(data.address || data.location);
        const hasPhone = !!(data.phone || data.phoneNumber || data.contactNumber);
        
        console.log(`   ${index + 1}. ${name}`);
        console.log(`      - Email: ${data.email || 'none'}`);
        console.log(`      - Status: ${status}`);
        console.log(`      - Address: ${hasAddress ? '✅' : '❌'}`);
        console.log(`      - Phone: ${hasPhone ? '✅' : '❌'}`);
        console.log(`      - Role: ${data.role || data.jobTitle || 'none'}`);
        console.log('');
      });
    }

    // Check old employees collection
    console.log('2️⃣ Legacy Employees Collection:');
    const employeesSnapshot = await db.collection('employees').get();
    console.log(`   Records found: ${employeesSnapshot.docs.length}`);
    
    if (employeesSnapshot.docs.length > 0) {
      console.log('   ⚠️  Legacy employee records exist but are not being used by allocation page');
      employeesSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`   ${index + 1}. ${data.name || data.email || doc.id}`);
      });
    }

    // Check active jobs
    console.log('\n3️⃣ Job Status Check:');
    const jobsSnapshot = await db.collection('jobs').get();
    const activeJobs = jobsSnapshot.docs.filter(doc => {
      const status = doc.data().status;
      return status === 'In Progress' || status === 'in-progress';
    });
    
    console.log(`   Total jobs: ${jobsSnapshot.docs.length}`);
    console.log(`   Active jobs: ${activeJobs.length}`);
    
    if (activeJobs.length > 0) {
      console.log('   Active job assignments:');
      activeJobs.forEach(doc => {
        const data = doc.data();
        console.log(`   - ${data.title}: assigned to ${data.assignedToName || data.assignedTo || 'unassigned'}`);
      });
    }

    // Summary and recommendations
    console.log('\n📋 Summary & Recommendations:');
    
    if (employees.length === 0) {
      console.log('   🚨 MAIN ISSUE: No employees in users collection');
      console.log('   💡 SOLUTION: Add employees using the admin panel or run employee creation script');
    } else {
      const activeEmployees = employees.filter(doc => doc.data().status !== 'inactive');
      console.log(`   ✅ Found ${employees.length} employees (${activeEmployees.length} active)`);
      
      if (activeEmployees.length === 0) {
        console.log('   🚨 ISSUE: All employees are inactive');
        console.log('   💡 SOLUTION: Activate employees in admin panel');
      } else {
        console.log('   ✅ Employees should appear in allocation page');
        
        // Check profile completeness
        const incompleteProfiles = activeEmployees.filter(doc => {
          const data = doc.data();
          return !(data.address || data.location) || !(data.phone || data.phoneNumber);
        });
        
        if (incompleteProfiles.length > 0) {
          console.log(`   ⚠️  ${incompleteProfiles.length} employees have incomplete profiles`);
          console.log('   💡 RECOMMENDATION: Complete employee profiles for better allocation');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

debugEmployeeAllocation();