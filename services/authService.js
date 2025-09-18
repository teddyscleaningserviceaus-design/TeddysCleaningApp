import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from 'firebase/auth';
import { doc, setDoc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebase';

export class AuthService {
  // Check if username exists (allow unauthenticated for signup)
  async checkUsernameExists(username) {
    try {
      const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Error checking username:', error);
      // If we can't check due to permissions, assume it doesn't exist
      return false;
    }
  }

  // Get user by username
  async getUserByUsername(username) {
    try {
      const q = query(collection(db, 'users'), where('username', '==', username.toLowerCase()));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user by username:', error);
      return null;
    }
  }

  // Sign up with username and email (simple version)
  async signUp(email, password, username) {
    // Validation
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }
    
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    }

    // Check if username exists
    const usernameExists = await this.checkUsernameExists(username);
    if (usernameExists) {
      throw new Error('Username is already taken');
    }

    // Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Send verification email
    try {
      await sendEmailVerification(user);
      console.log('Verification email sent successfully to:', email);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue with signup even if email fails
    }

    // Create user document
    await setDoc(doc(db, 'users', user.uid), {
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      displayName: username,
      emailVerified: false,
      userType: 'client', // Default to client
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return user;
  }

  // Sign up with username and email (legacy version with confirm fields)
  async signUpWithConfirm(username, email, confirmEmail, password, confirmPassword) {
    // Validation
    if (!username || username.length < 3) {
      throw new Error('Username must be at least 3 characters long');
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      throw new Error('Username can only contain letters, numbers, and underscores');
    }
    
    if (email !== confirmEmail) {
      throw new Error('Email addresses do not match');
    }
    
    if (password !== confirmPassword) {
      throw new Error('Passwords do not match');
    }
    
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters long');
    }
    
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      throw new Error('Password must contain at least one uppercase letter, one lowercase letter, and one number');
    }

    // Check if username exists
    const usernameExists = await this.checkUsernameExists(username);
    if (usernameExists) {
      throw new Error('Username is already taken');
    }

    // Create Firebase user
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Send verification email
    try {
      await sendEmailVerification(user);
      console.log('Verification email sent successfully to:', email);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Continue with signup even if email fails
    }

    // Create user document
    await setDoc(doc(db, 'users', user.uid), {
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      displayName: username,
      emailVerified: false,
      userType: 'client', // Default to client
      createdAt: new Date(),
      updatedAt: new Date()
    });

    return user;
  }

  // Sign in with username
  async signIn(username, password, rememberMe = false) {
    // Get user by username
    const userData = await this.getUserByUsername(username);
    if (!userData) {
      throw new Error('Invalid username or password');
    }

    // Sign in with email
    const userCredential = await signInWithEmailAndPassword(auth, userData.email, password);
    const user = userCredential.user;

    // Check email verification (reload first to get latest status)
    await user.reload();
    
    // For employees created by admin, check the database verification status
    if (!user.emailVerified) {
      // Check if user is marked as verified in database (for admin-created accounts)
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const isVerifiedInDB = userDoc.exists() && userDoc.data().emailVerified;
      
      if (!isVerifiedInDB) {
        // Send verification email immediately
        try {
          await sendEmailVerification(user);
          console.log('Verification email sent to:', user.email);
        } catch (emailError) {
          console.error('Failed to send verification email:', emailError);
        }
        
        await signOut(auth);
        throw new Error('EMAIL_NOT_VERIFIED');
      }
    }

    // Save credentials if remember me is checked
    if (rememberMe) {
      await AsyncStorage.setItem('rememberedUsername', username);
      await AsyncStorage.setItem('rememberedPassword', password);
      await AsyncStorage.setItem('rememberMe', 'true');
    } else {
      await AsyncStorage.removeItem('rememberedUsername');
      await AsyncStorage.removeItem('rememberedPassword');
      await AsyncStorage.removeItem('rememberMe');
    }

    return user;
  }

  // Get remembered credentials
  async getRememberedCredentials() {
    try {
      const rememberMe = await AsyncStorage.getItem('rememberMe');
      const username = await AsyncStorage.getItem('rememberedUsername');
      const password = await AsyncStorage.getItem('rememberedPassword');
      
      return {
        rememberMe: rememberMe === 'true',
        username: username || '',
        password: password || ''
      };
    } catch (error) {
      return { rememberMe: false, username: '', password: '' };
    }
  }

  // Resend verification email
  async resendVerificationEmail() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('No user logged in');
    }
    
    if (user.emailVerified) {
      throw new Error('Email already verified');
    }
    
    try {
      await sendEmailVerification(user);
      console.log('Verification email resent to:', user.email);
    } catch (error) {
      console.error('Failed to resend verification email:', error);
      throw new Error('Failed to send verification email. Please try again.');
    }
  }

  // Check if email is verified
  async checkEmailVerification() {
    const user = auth.currentUser;
    if (user) {
      await user.reload();
      if (user.emailVerified) {
        // Update user document
        await setDoc(doc(db, 'users', user.uid), {
          emailVerified: true,
          updatedAt: new Date()
        }, { merge: true });
        return true;
      }
    }
    return false;
  }

  // Sign out
  async signOut() {
    await signOut(auth);
    // Only clear credentials if remember me is not enabled
    const credentials = await this.getRememberedCredentials();
    if (!credentials.rememberMe) {
      await AsyncStorage.removeItem('rememberedUsername');
      await AsyncStorage.removeItem('rememberedPassword');
      await AsyncStorage.removeItem('rememberMe');
    }
  }
}

export const authService = new AuthService();