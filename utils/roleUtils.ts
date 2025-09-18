import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export const getUserRole = async (userId: string, email: string) => {
  try {
    // First check the users collection for role
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.userType || 'client';
    }
    
    // Fallback to old method for existing users
    // Check if user exists in admins collection
    const adminDoc = await getDoc(doc(db, 'admins', userId));
    if (adminDoc.exists()) {
      return 'admin';
    }
    
    // Check if user exists in employees collection
    const employeeDoc = await getDoc(doc(db, 'employees', userId));
    if (employeeDoc.exists()) {
      return 'employee';
    }
    
    // Check if user exists in clients collection
    const clientDoc = await getDoc(doc(db, 'clients', userId));
    if (clientDoc.exists()) {
      return 'client';
    }
    
    // New user - create as client by default
    await setDoc(doc(db, 'clients', userId), {
      email,
      createdAt: new Date(),
      platform: 'app'
    });
    
    return 'client';
  } catch (error) {
    console.error('Error getting user role:', error);
    return 'client';
  }
};

export const createClientProfile = async (userId: string, userData: any) => {
  try {
    await setDoc(doc(db, 'clients', userId), {
      ...userData,
      createdAt: new Date(),
      platform: 'app'
    });
  } catch (error) {
    console.error('Error creating client profile:', error);
  }
};

export const getClientOnboardingStatus = async (userId: string): Promise<boolean> => {
  try {
    const clientDoc = await getDoc(doc(db, 'clients', userId));
    if (clientDoc.exists()) {
      const data = clientDoc.data();
      return data.onboardingCompleted === true;
    }
    return false;
  } catch (error) {
    console.error('Error getting client onboarding status:', error);
    return false;
  }
};

export const getEmployeeOnboardingStatus = async (userId: string): Promise<boolean> => {
  try {
    // Check users collection first
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      console.log('User data for onboarding check:', userData);
      return userData.onboardingCompleted === true || userData.setupCompleted === true;
    }
    
    // Fallback to employees collection
    const employeeDoc = await getDoc(doc(db, 'employees', userId));
    if (employeeDoc.exists()) {
      const data = employeeDoc.data();
      console.log('Employee data:', data);
      return data.onboardingCompleted === true;
    }
    return false;
  } catch (error) {
    console.error('Error getting employee onboarding status:', error);
    return false;
  }
};

export const createEmployeeProfile = async (userId: string, userData: any) => {
  try {
    // Update users collection
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      onboardingCompleted: true,
      setupCompleted: true,
      updatedAt: new Date()
    }, { merge: true });
    
    // Also update employees collection for backward compatibility
    const employeeRef = doc(db, 'employees', userId);
    await setDoc(employeeRef, {
      ...userData,
      onboardingCompleted: true,
      updatedAt: new Date()
    }, { merge: true });
    
    console.log('Employee profile updated successfully');
  } catch (error) {
    console.error('Error updating employee profile:', error);
    throw error;
  }
};