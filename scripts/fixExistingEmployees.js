// Script to fix existing employees without usernames
// Run with: node scripts/fixExistingEmployees.js

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

async function fixExistingEmployees() {
  try {
    console.log('🔍 Finding employees without usernames...');

    // Get all users with userType 'employee' but no username
    const usersQuery = await db.collection('users')
      .where('userType', '==', 'employee')
      .get();

    const employeesToFix = [];
    
    usersQuery.forEach(doc => {
      const data = doc.data();
      if (!data.username && data.email) {
        employeesToFix.push({
          uid: doc.id,
          email: data.email,
          ...data
        });
      }
    });

    console.log(`📋 Found ${employeesToFix.length} employees to fix`);

    if (employeesToFix.length === 0) {
      console.log('✅ All employees already have usernames!');
      return;
    }

    // Fix each employee
    for (let i = 0; i < employeesToFix.length; i++) {
      const employee = employeesToFix[i];
      console.log(`\n[${i + 1}/${employeesToFix.length}] Processing ${employee.email}...`);
      try {
        // Generate username from email
        const username = employee.email.split('@')[0].toLowerCase();
        
        console.log(`   🔧 Generating username: ${username}`);

        // Check if username already exists
        const existingUser = await db.collection('users')
          .where('username', '==', username)
          .get();

        let finalUsername = username;
        if (!existingUser.empty) {
          // If username exists, append employee ID
          finalUsername = `${username}_${employee.uid.substring(0, 6)}`;
          console.log(`   ⚠️  Username conflict, using: ${finalUsername}`);
        }

        // Update users collection
        await db.collection('users').doc(employee.uid).update({
          username: finalUsername,
          emailVerified: true, // Auto-verify existing employees
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // Update employees collection if it exists
        try {
          const employeeDoc = await db.collection('employees').doc(employee.uid).get();
          if (employeeDoc.exists()) {
            await db.collection('employees').doc(employee.uid).update({
              username: finalUsername,
              emailVerified: true,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            });
          }
        } catch (empError) {
          console.log(`   ℹ️  No employees collection entry for ${employee.email}`);
        }

        console.log(`   ✅ Complete!`);
        
        // Add small delay to avoid rate limiting
        if (i < employeesToFix.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`   ❌ Failed to fix ${employee.email}:`, error.message);
      }
    }

    console.log('\n🎉 Employee fix complete!');
    console.log('\n📝 Employees can now login with:');
    console.log('   - Username: [email prefix] (e.g., john.smith@company.com -> john.smith)');
    console.log('   - Password: [their existing password]');
    console.log('   - Email verification: Auto-completed');

  } catch (error) {
    console.error('❌ Error fixing employees:', error);
  } finally {
    process.exit(0);
  }
}

// Run the fix
fixExistingEmployees();