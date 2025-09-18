import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../config/firebase';
import { authService } from '../services/authService';
import notificationService from '../services/notificationService';

export type UserRole = 'admin' | 'employee' | 'client';

interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
  phone?: string;
  createdAt: Date;
  userType: UserRole;
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authReady: boolean;
  userType: UserRole | null;
  setUserRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  loading: true,
  authReady: false,
  userType: null,
  setUserRole: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authReady, setAuthReady] = useState(false);

  const setUserRole = async (role: UserRole) => {
    if (!user) return;
    
    const profile: UserProfile = {
      uid: user.uid,
      email: user.email!,
      role,
      userType: role,
      name: user.displayName || '',
      phone: '',
      createdAt: new Date(),
    };

    await setDoc(doc(db, 'users', user.uid), profile);
    setUserProfile(profile);
  };

  const logout = async () => {
    try {
      // Cleanup notification service listeners first
      notificationService.cleanup();
      
      // Then attempt Firebase signout
      await authService.signOut();
      
      // Clear local state after successful signout
      // Use setTimeout to avoid useInsertionEffect warnings
      setTimeout(() => {
        setUser(null);
        setUserProfile(null);
      }, 0);
    } catch (error) {
      console.error('Logout error:', error);
      // Clear state even if signout fails
      setTimeout(() => {
        setUser(null);
        setUserProfile(null);
      }, 0);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (firebaseUser) {
        // Get user profile from Firestore
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
        
        if (userDoc.exists()) {
          const profile = userDoc.data() as UserProfile;
          setUserProfile(profile);
          console.debug('AuthContext: userProfile loaded', profile.uid);
        } else {
          // Admin check for tewedross12@gmail.com
          const defaultRole: UserRole = firebaseUser.email === 'tewedross12@gmail.com' ? 'admin' : 'employee';
          await setUserRole(defaultRole);
        }
      } else {
        setUserProfile(null);
        console.debug('AuthContext: userProfile cleared');
      }
      
      setLoading(false);
      setAuthReady(true);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, loading, authReady, userType: userProfile?.userType || null, setUserRole, logout }}>
      {children}
    </AuthContext.Provider>
  );
};