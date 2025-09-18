// Firebase initialization check utility
import { getApps } from 'firebase/app';

export interface FirebaseInitStatus {
  isInitialized: boolean;
  error?: string;
  recommendations?: string[];
}

export function checkFirebaseInitialization(): FirebaseInitStatus {
  try {
    const apps = getApps();
    
    if (apps.length === 0) {
      return {
        isInitialized: false,
        error: 'Firebase app not initialized',
        recommendations: [
          'Ensure firebase config is properly set in config/firebase.js',
          'Check that initializeApp() is called before any Firebase services',
          'Verify google-services.json is present in android/app/ directory',
          'For Expo managed workflow, ensure FCM credentials are configured'
        ]
      };
    }

    const app = apps[0];
    if (!app) {
      return {
        isInitialized: false,
        error: 'Firebase app instance is null',
        recommendations: [
          'Check Firebase configuration object',
          'Ensure all required Firebase services are properly imported'
        ]
      };
    }

    // Check if running in React Native environment
    if (typeof window !== 'undefined' && !window.navigator?.userAgent?.includes('ReactNative')) {
      // Web environment - Firebase should work normally
      return { isInitialized: true };
    }

    // React Native environment - additional checks
    return {
      isInitialized: true,
      recommendations: [
        'For push notifications, ensure google-services.json is in android/app/',
        'Verify AndroidManifest.xml has required FCM permissions and services',
        'Check that Firebase SDK versions are compatible with React Native version'
      ]
    };

  } catch (error) {
    return {
      isInitialized: false,
      error: `Firebase initialization check failed: ${error.message}`,
      recommendations: [
        'Check console for detailed Firebase errors',
        'Verify Firebase configuration is correct',
        'Ensure all Firebase dependencies are properly installed'
      ]
    };
  }
}

export function logFirebaseStatus(): void {
  const status = checkFirebaseInitialization();
  const timestamp = new Date().toISOString();
  
  if (status.isInitialized) {
    console.log(`[${timestamp}] ✅ Firebase initialized successfully`);
    if (status.recommendations) {
      console.log(`[${timestamp}] 💡 Recommendations:`, status.recommendations);
    }
  } else {
    console.error(`[${timestamp}] ❌ Firebase initialization failed:`, status.error);
    if (status.recommendations) {
      console.error(`[${timestamp}] 🔧 Fix recommendations:`, status.recommendations);
    }
  }
}

// Auto-check on import in development
if (__DEV__) {
  setTimeout(logFirebaseStatus, 1000);
}