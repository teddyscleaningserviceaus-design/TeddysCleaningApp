// List all employees with their login credentials
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

async function listEmployees() {
  try {
    console.log('👥 Employee Login Credentials:\n');

    const employeesSnapshot = await db.collection('employees').get();
    
    if (employeesSnapshot.empty) {
      console.log('No employees found.');
      return;
    }

    for (const doc of employeesSnapshot.docs) {
      const data = doc.data();
      
      // Get username from users collection
      const userDoc = await db.collection('users').doc(doc.id).get();
      const username = userDoc.exists ? userDoc.data().username : 'unknown';
      
      console.log(`Name: ${data.name}`);
      console.log(`Username: ${username}`);
      console.log(`Email: ${data.email}`);
      console.log(`Password: ${data.tempPassword || 'Not available'}`);
      console.log('---');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

listEmployees();