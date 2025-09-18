// Delete all Firestore collections for fresh start
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

async function deleteCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  const snapshot = await collectionRef.get();
  
  if (snapshot.empty) {
    console.log(`Collection '${collectionName}' is already empty`);
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
  });
  
  await batch.commit();
  console.log(`✅ Deleted ${snapshot.size} documents from '${collectionName}'`);
}

async function deleteAllCollections() {
  try {
    console.log('🗑️ Deleting all Firestore collections...\n');

    const collections = [
      'users',
      'employees', 
      'admins',
      'clients',
      'messages',
      'news',
      'tasks',
      'notifications'
    ];

    for (const collection of collections) {
      await deleteCollection(collection);
    }

    console.log('\n🎉 All collections deleted!');
    console.log('\n📋 Next steps:');
    console.log('1. Create new client account via app signup');
    console.log('2. Run createFirstAdmin.js script');
    console.log('3. Login as admin and create employees');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
  
  process.exit(0);
}

deleteAllCollections();