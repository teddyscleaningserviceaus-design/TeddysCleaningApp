import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Image,
  StatusBar,
  ScrollView
} from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { authService } from '../services/authService';
import { signOut } from 'firebase/auth';
import { auth } from '../config/firebase';

export default function EmailVerification() {
  const { username } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);

  const resendVerificationEmail = async () => {
    setLoading(true);
    try {
      await authService.resendVerificationEmail();
      Alert.alert(
        'Email Sent! 📧',
        'A new verification email has been sent. Please check your inbox and spam folder.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to send verification email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const checkVerificationStatus = async () => {
    setCheckingVerification(true);
    try {
      const isVerified = await authService.checkEmailVerification();
      if (isVerified) {
        Alert.alert(
          'Email Verified! ✅',
          'Your email has been verified successfully. You can now access your account.',
          [
            {
              text: 'Continue',
              onPress: () => router.replace('/')
            }
          ]
        );
      } else {
        Alert.alert(
          'Not Verified Yet',
          'Your email is not verified yet. Please check your email and click the verification link.'
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to check verification status.');
    } finally {
      setCheckingVerification(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <TouchableOpacity onPress={async () => {
          try {
            await signOut(auth);
            router.replace('/');
          } catch (error) {
            console.error('Sign out error:', error);
            router.replace('/');
          }
        }} style={styles.backButton}>
          <AntDesign name="arrowleft" size={24} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.headerCenter}>
          <Image source={require('../assets/teddy-logo.png')} style={styles.logo} />
          <View>
            <Text style={styles.headerTitle}>Email Verification</Text>
            <Text style={styles.headerSubtitle}>Verify your account</Text>
          </View>
        </View>
        
        <View style={styles.headerRight} />
      </LinearGradient>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.iconContainer}>
          <MaterialIcons name="mark-email-unread" size={80} color="#4facfe" />
        </View>

        <Text style={styles.title}>Check Your Email</Text>
        <Text style={styles.subtitle}>
          We've sent a verification link to your email address. Please click the link to verify your account.
        </Text>

        {username && (
          <View style={styles.usernameContainer}>
            <Text style={styles.usernameLabel}>Username:</Text>
            <Text style={styles.usernameValue}>{username}</Text>
          </View>
        )}

        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>What to do next:</Text>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>1.</Text>
            <Text style={styles.instructionText}>Check your email inbox first</Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>2.</Text>
            <Text style={styles.instructionText}>If not found, check your SPAM/JUNK folder</Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>3.</Text>
            <Text style={styles.instructionText}>Look for email from Firebase or Teddy's Cleaning</Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>4.</Text>
            <Text style={styles.instructionText}>Click the verification link in the email</Text>
          </View>
          <View style={styles.instructionItem}>
            <Text style={styles.instructionNumber}>5.</Text>
            <Text style={styles.instructionText}>Return here and check verification status</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.resendButton}
          onPress={resendVerificationEmail}
          disabled={loading}
        >
          <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.resendButtonGradient}>
            <MaterialIcons name="email" size={20} color="#fff" />
            <Text style={styles.resendButtonText}>
              {loading ? 'Sending...' : 'Resend Verification Email'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.checkButton}
          onPress={checkVerificationStatus}
          disabled={checkingVerification}
        >
          <LinearGradient colors={['#10b981', '#059669']} style={styles.checkButtonGradient}>
            <MaterialIcons name="verified" size={20} color="#fff" />
            <Text style={styles.checkButtonText}>
              {checkingVerification ? 'Checking...' : 'I\'ve Verified My Email'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.helpContainer}>
          <Text style={styles.helpTitle}>Need Help?</Text>
          <Text style={styles.helpText}>
            • Check your spam/junk folder{'\n'}
            • Make sure you entered the correct email{'\n'}
            • Contact support if you continue having issues
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    elevation: 8,
  },
  backButton: {
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginLeft: -40,
  },
  logo: {
    width: 36,
    height: 36,
    marginRight: 12,
    borderRadius: 18,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '500',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    alignItems: 'center',
    minHeight: '100%',
  },
  iconContainer: {
    marginTop: 40,
    marginBottom: 32,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2937',
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  usernameContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#4facfe',
  },
  usernameLabel: {
    fontSize: 12,
    color: '#6b7280',
    fontWeight: '500',
  },
  usernameValue: {
    fontSize: 16,
    color: '#1f2937',
    fontWeight: '600',
  },
  instructionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    width: '100%',
    elevation: 2,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  instructionNumber: {
    fontSize: 14,
    fontWeight: '700',
    color: '#4facfe',
    marginRight: 12,
    minWidth: 20,
  },
  instructionText: {
    fontSize: 14,
    color: '#6b7280',
    flex: 1,
    lineHeight: 20,
  },
  checkButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 16,
  },
  checkButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  checkButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  resendButton: {
    borderRadius: 12,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 16,
  },
  resendButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  resendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 8,
  },
  helpContainer: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#92400e',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 12,
    color: '#92400e',
    lineHeight: 18,
  },
});