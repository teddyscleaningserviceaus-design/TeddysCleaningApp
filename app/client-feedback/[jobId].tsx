import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { Ionicons } from '@expo/vector-icons';

export default function ClientFeedback() {
  const router = useRouter();
  const { jobId } = useLocalSearchParams();
  const [job, setJob] = useState<any>(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadJobDetails();
  }, [jobId]);

  const loadJobDetails = async () => {
    try {
      const jobDoc = await getDoc(doc(db, 'jobs', jobId as string));
      if (jobDoc.exists()) {
        const jobData = { id: jobDoc.id, ...jobDoc.data() };
        setJob(jobData);
        
        // Check if feedback already exists
        if (jobData.feedbackSubmitted) {
          Alert.alert('Feedback Already Submitted', 'You have already provided feedback for this job.', [
            { text: 'OK', onPress: () => router.back() }
          ]);
        }
      }
    } catch (error) {
      console.error('Error loading job:', error);
      Alert.alert('Error', 'Failed to load job details.');
    } finally {
      setLoading(false);
    }
  };

  const submitFeedback = async () => {
    if (rating === 0) {
      Alert.alert('Rating Required', 'Please provide a star rating.');
      return;
    }

    setSubmitting(true);
    try {
      const user = auth.currentUser;
      if (!user) return;

      // Update job with feedback data directly
      await updateDoc(doc(db, 'jobs', jobId as string), {
        feedbackSubmitted: true,
        clientRating: rating,
        clientComment: comment.trim(),
        feedbackDate: new Date(),
        feedback: {
          rating: rating,
          comment: comment.trim(),
          submittedAt: new Date(),
          clientId: user.uid,
          employeeId: job.assignedTo,
          employeeName: job.assignedToName
        }
      });

      // Update employee rating if assigned
      if (job.assignedTo) {
        const employeeDoc = await getDoc(doc(db, 'users', job.assignedTo));
        if (employeeDoc.exists()) {
          const employeeData = employeeDoc.data();
          const currentRating = employeeData.averageRating || 0;
          const totalRatings = employeeData.totalRatings || 0;
          
          const newTotalRatings = totalRatings + 1;
          const newAverageRating = ((currentRating * totalRatings) + rating) / newTotalRatings;
          
          await updateDoc(doc(db, 'users', job.assignedTo), {
            averageRating: Math.round(newAverageRating * 10) / 10,
            totalRatings: newTotalRatings,
            lastRatingDate: new Date()
          });
        }
      }

      Alert.alert('Thank You!', 'Your feedback has been submitted successfully.', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Error', 'Failed to submit feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <TouchableOpacity
            key={star}
            onPress={() => setRating(star)}
            style={styles.starButton}
          >
            <Ionicons
              name={star <= rating ? 'star' : 'star-outline'}
              size={40}
              color={star <= rating ? '#ffc107' : '#ddd'}
            />
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" />
      
      <LinearGradient colors={['#4facfe', '#00f2fe']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rate Your Service</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      <ScrollView style={styles.content}>
        <View style={styles.jobCard}>
          <Text style={styles.jobTitle}>{job?.title}</Text>
          <Text style={styles.jobDate}>{job?.scheduledDate} at {job?.startTime}</Text>
          <Text style={styles.employeeName}>Cleaned by: {job?.assignedToName || 'Team'}</Text>
        </View>

        <View style={styles.ratingSection}>
          <Text style={styles.sectionTitle}>How was your cleaning service?</Text>
          {renderStars()}
          <Text style={styles.ratingText}>
            {rating === 0 ? 'Tap to rate' : 
             rating === 1 ? 'Poor' :
             rating === 2 ? 'Fair' :
             rating === 3 ? 'Good' :
             rating === 4 ? 'Very Good' : 'Excellent'}
          </Text>
        </View>

        <View style={styles.commentSection}>
          <Text style={styles.sectionTitle}>Additional Comments (Optional)</Text>
          <TextInput
            style={styles.commentInput}
            value={comment}
            onChangeText={setComment}
            placeholder="Tell us about your experience..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.submitButton, rating === 0 && styles.submitButtonDisabled]}
          onPress={submitFeedback}
          disabled={rating === 0 || submitting}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Submitting...' : 'Submit Feedback'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  backButton: { padding: 8 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  headerSpacer: { width: 40 },
  content: { flex: 1, padding: 20 },
  jobCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  jobTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  jobDate: { fontSize: 14, color: '#666', marginBottom: 4 },
  employeeName: { fontSize: 14, color: '#4facfe', fontWeight: '600' },
  ratingSection: { backgroundColor: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 20, textAlign: 'center' },
  starsContainer: { flexDirection: 'row', marginBottom: 16 },
  starButton: { marginHorizontal: 4 },
  ratingText: { fontSize: 16, color: '#666', fontWeight: '600' },
  commentSection: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  commentInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, minHeight: 100, backgroundColor: '#f9f9f9' },
  submitButton: { backgroundColor: '#4facfe', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#ccc' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});