// Client-side script to create employee accounts
// This runs in the app itself, no firebase-admin needed

import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export async function createEmployeeAccount(username, email, password, name, phone, role = 'employee') {
  try {
    console.log(`Creating employee: ${name} (${username})`);

    // Create user in Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    console.log('✅ Firebase Auth user created:', user.uid);

    // Create users collection entry (required for new auth system)
    await setDoc(doc(db, 'users', user.uid), {
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      displayName: name,
      emailVerified: true, // Auto-verify employees
      userType: role, // 'employee' or 'admin'
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ Users collection entry created');

    // Create employees collection entry
    await setDoc(doc(db, 'employees', user.uid), {
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      name: name,
      phone: phone,
      role: role,
      status: 'active',
      emailVerified: true,
      onboardingCompleted: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      platform: 'client-created'
    });

    console.log('✅ Employee profile created');

    // If admin role, also create admin collection entry
    if (role === 'admin') {
      await setDoc(doc(db, 'admins', user.uid), {
        username: username.toLowerCase(),
        email: email.toLowerCase(),
        name: name,
        phone: phone,
        role: 'admin',
        permissions: ['all'], // Full permissions
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        platform: 'client-created'
      });
      console.log('✅ Admin profile created');
    }

    console.log(`🎉 Successfully created ${role}: ${name}`);
    return user.uid;
    
  } catch (error) {
    console.error('❌ Error creating employee:', error.message);
    throw error;
  }
}

// Example usage:
// createEmployeeAccount('john_cleaner', 'john@teddyscleaning.com.au', 'TempPass123!', 'John Smith', '+61400000001', 'employee');