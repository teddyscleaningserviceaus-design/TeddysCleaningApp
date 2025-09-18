import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { getUserRole, getClientOnboardingStatus, getEmployeeOnboardingStatus } from '../utils/roleUtils';
import LoginScreen from './(tabs)/index';
import IntroAnimation from '../components/IntroAnimation';

export default function RootIndex() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(true);
  const [isRouting, setIsRouting] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);







  const determineUserRoleAndRoute = async () => {
    if (!user?.email || isRouting || hasCheckedAuth) return;
    
    setIsRouting(true);
    setHasCheckedAuth(true);
    
    try {
      // Check email verification first
      await user.reload(); // Refresh user data
      if (!user.emailVerified) {
        console.log('Email not verified, redirecting to verification');
        router.replace('/email-verification');
        setIsRouting(false);
        return;
      }
      
      console.log('Determining role for user:', user.uid);
      const role = await getUserRole(user.uid, user.email);
      console.log('User role:', role);
      
      // Route based on role without timeout to prevent navigation issues
      switch (role) {
        case 'admin':
          router.replace('/(admin-tabs)/dashboard');
          break;
        case 'employee':
          // Check employee onboarding status
          const employeeOnboardingCompleted = await getEmployeeOnboardingStatus(user.uid);
          if (employeeOnboardingCompleted) {
            router.replace('/(employee-tabs)/dashboard');
          } else {
            router.replace('/employee-setup-new');
          }
          break;
        case 'client':
        default:
          // Only check onboarding if email is verified
          if (user.emailVerified) {
            const onboardingCompleted = await getClientOnboardingStatus(user.uid);
            if (onboardingCompleted) {
              router.replace('/(client-tabs)/dashboard');
            } else {
              router.replace('/client-onboarding');
            }
          } else {
            router.replace('/email-verification');
          }
          break;
      }
    } catch (error) {
      console.error('Error determining user role:', error);
      // Fallback routing
      router.replace('/(employee-tabs)/dashboard');
    } finally {
      setIsRouting(false);
    }
  };

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  // Handle routing when user is authenticated and intro is complete
  useEffect(() => {
    if (user && !showIntro && !loading && !hasCheckedAuth) {
      determineUserRoleAndRoute();
    }
  }, [user, showIntro, loading, hasCheckedAuth]);



  // Reset auth check when user changes
  useEffect(() => {
    if (!user) {
      setHasCheckedAuth(false);
      setIsRouting(false);
    }
  }, [user]);



  // Clear routing state when component unmounts or user logs out
  useEffect(() => {
    return () => {
      setIsRouting(false);
      setHasCheckedAuth(false);
    };
  }, []);



  if (showIntro) {
    return <IntroAnimation onComplete={handleIntroComplete} />;
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4facfe" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  // User is authenticated, show loading while routing
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#4facfe" />
      <Text style={styles.loadingText}>Setting up your account...</Text>
      <TouchableOpacity 
        style={styles.skipButton}
        onPress={() => router.replace('/(employee-tabs)/dashboard')}
      >
        <Text style={styles.skipButtonText}>Skip to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  skipButton: {
    marginTop: 30,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4facfe',
    borderRadius: 8,
  },
  skipButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});