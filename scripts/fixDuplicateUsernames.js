// Fix duplicate username issue
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

async function fixDuplicateUsernames() {
  try {
    console.log('🔧 Fixing duplicate usernames...\n');

    // Get all users and check for duplicates
    const usersSnapshot = await db.collection('users').get();
    const usernames = new Map();
    
    // Find duplicates
    usersSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const username = data.username;
      if (usernames.has(username)) {
        usernames.get(username).push({ id: doc.id, ...data });
      } else {
        usernames.set(username, [{ id: doc.id, ...data }]);
      }
    });

    // Fix duplicates
    for (const [username, users] of usernames) {
      if (users.length > 1) {
        console.log(`Found duplicate username: ${username}`);
        
        // Keep the first one as is, rename others
        for (let i = 1; i < users.length; i++) {
          const user = users[i];
          const newUsername = `${username}_${user.userType}`;
          
          await db.collection('users').doc(user.id).update({
            username: newUsername,
            updatedAt: new Date()
          });
          
          console.log(`✅ Renamed ${user.displayName} to username: ${newUsername}`);
        }
      }
    }

    console.log('\n🎉 Username conflicts resolved!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

fixDuplicateUsernames();