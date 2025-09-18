import { useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Custom hook to manage Firestore listeners with proper cleanup on logout
 * @param setupListeners - Function that sets up listeners and returns unsubscribe functions
 * @param dependencies - Dependencies array for useEffect
 */
export const useFirestoreListener = (
  setupListeners: () => (() => void)[] | (() => void) | void,
  dependencies: any[] = []
) => {
  const { user } = useAuth();
  const unsubscribeRefs = useRef<(() => void)[]>([]);

  useEffect(() => {
    // Clear any existing listeners
    unsubscribeRefs.current.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    unsubscribeRefs.current = [];

    // Only set up listeners if user is authenticated
    if (!user) {
      return () => {}; // Return empty cleanup function when no user
    }

    // Set up new listeners
    const result = setupListeners();
    
    if (result) {
      // Handle both single unsubscribe function and array of functions
      const unsubscribeFunctions = Array.isArray(result) ? result : [result];
      unsubscribeRefs.current = unsubscribeFunctions.filter(fn => typeof fn === 'function');
    }

    // Cleanup function
    return () => {
      unsubscribeRefs.current.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
      unsubscribeRefs.current = [];
    };
  }, [user, ...dependencies]);

  // Return cleanup function for manual cleanup if needed
  return () => {
    unsubscribeRefs.current.forEach(unsubscribe => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    unsubscribeRefs.current = [];
  };
};