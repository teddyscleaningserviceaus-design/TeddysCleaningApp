// Create a test employee directly
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

async function createTestEmployee() {
  try {
    console.log('👤 Creating test employee...\n');

    const employeeData = {
      name: 'Test Employee',
      username: 'testemployee',
      email: 'employee@test.com',
      password: 'Employee123!',
      phone: '+61400000000',
      role: 'employee'
    };

    // Create Firebase Auth user
    const userRecord = await auth.createUser({
      email: employeeData.email,
      password: employeeData.password,
      emailVerified: true,
      displayName: employeeData.name
    });

    console.log(`✅ Created Auth user: ${userRecord.uid}`);

    // Create users collection entry
    await db.collection('users').doc(userRecord.uid).set({
      username: employeeData.username,
      email: employeeData.email,
      displayName: employeeData.name,
      emailVerified: true,
      userType: 'employee',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Create employees collection entry
    await db.collection('employees').doc(userRecord.uid).set({
      username: employeeData.username,
      email: employeeData.email,
      name: employeeData.name,
      phone: employeeData.phone,
      role: employeeData.role,
      status: 'active',
      emailVerified: true,
      onboardingCompleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      platform: 'script-created'
    });

    console.log('✅ Created database entries');
    console.log('\n🎉 Employee created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log(`Username: ${employeeData.username}`);
    console.log(`Password: ${employeeData.password}`);
    console.log(`Email: ${employeeData.email}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

createTestEmployee();