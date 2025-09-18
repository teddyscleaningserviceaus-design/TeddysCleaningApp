import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { doc, updateDoc, onSnapshot, collection, query, where } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
    this.jobListeners = new Map(); // Track active job listeners
    this.mainJobListener = null;
  }

  // Initialize notification system
  async initialize() {
    try {
      // Try to register for push notifications (may fail on emulator/dev)
      await this.registerForPushNotifications();
      
      // Always setup listeners and monitoring (works without push tokens)
      this.setupNotificationListeners();
      await this.startJobMonitoring();
      
      console.log('Notification service initialized');
    } catch (error) {
      console.log('Notification service initialized with limited functionality:', error.message);
      // Continue with basic functionality even if push notifications fail
      try {
        this.setupNotificationListeners();
        await this.startJobMonitoring();
      } catch (fallbackError) {
        console.error('Failed to initialize basic notification features:', fallbackError);
      }
    }
  }

  // Register for push notifications
  async registerForPushNotifications() {
    if (!Device.isDevice) {
      console.log('Push notifications only work on physical devices');
      return;
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }

    try {
      // Check if running in Expo Go
      if (Constants.appOwnership === 'expo') {
        console.log('Push notifications not available in Expo Go. Use development build.');
        return null;
      }
      
      // Get FCM token with proper configuration
      const token = await Notifications.getExpoPushTokenAsync({
        projectId: Constants.expoConfig?.extra?.eas?.projectId || '550e8400-e29b-41d4-a716-446655440000',
      });
      
      this.expoPushToken = token.data;
      console.log('Push token obtained:', this.expoPushToken);

      // Save token to user profile
      const user = auth.currentUser;
      if (user) {
        try {
          await updateDoc(doc(db, 'clients', user.uid), {
            pushToken: this.expoPushToken,
            updatedAt: new Date(),
          });
        } catch (firestoreError) {
          console.log('Could not save push token to Firestore:', firestoreError.message);
        }
      }

      return this.expoPushToken;
    } catch (error) {
      console.log('Push notifications not available:', error.message);
      // Continue without push notifications
      return null;
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#4facfe',
      });
    }
  }

  // Setup notification event listeners
  setupNotificationListeners() {
    // Listen for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
    });

    // Listen for user interactions with notifications
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      const { notification } = response;
      const data = notification.request.content.data;
      
      console.log('Notification tapped:', data);
      
      // Handle different notification types
      if (data.type === 'cleaner_arrived') {
        this.handleCleanerArrivedNotification(data);
      } else if (data.type === 'job_update') {
        this.handleJobUpdateNotification(data);
      }
    });
  }

  // Start monitoring user's jobs for cleaner location updates
  async startJobMonitoring() {
    const user = auth.currentUser;
    if (!user) {
      this.cleanup(); // Clean up if no user
      return;
    }

    // Monitor active jobs
    const jobsQuery = query(
      collection(db, 'jobs'),
      where('clientId', '==', user.uid),
      where('status', 'in', ['Scheduled', 'In Progress'])
    );

    const unsubscribe = onSnapshot(jobsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const job = { id: change.doc.id, ...change.doc.data() };
        
        if (change.type === 'added' || change.type === 'modified') {
          this.monitorJobProgress(job);
        }
      });
    }, (error) => {
      if (error.code === 'permission-denied') {
        // User likely logged out, cleanup listeners
        this.cleanup();
      }
    });

    this.mainJobListener = unsubscribe;
    return unsubscribe;
  }

  // Monitor individual job progress and cleaner location
  monitorJobProgress(job) {
    // Stop existing listener for this job
    if (this.jobListeners.has(job.id)) {
      this.jobListeners.get(job.id)();
    }

    // Start new listener
    const unsubscribe = onSnapshot(doc(db, 'jobs', job.id), (doc) => {
      if (doc.exists()) {
        const updatedJob = { id: doc.id, ...doc.data() };
        this.checkForLocationUpdates(updatedJob);
      }
    }, (error) => {
      if (error.code === 'permission-denied') {
        // User likely logged out, cleanup this listener
        if (this.jobListeners.has(job.id)) {
          this.jobListeners.get(job.id)();
          this.jobListeners.delete(job.id);
        }
      }
    });

    this.jobListeners.set(job.id, unsubscribe);
  }

  // Check if cleaner location has changed and send notifications
  async checkForLocationUpdates(job) {
    const { cleanerLocation, status, scheduledDate, startTime } = job;
    
    // Check if cleaner is approaching (within 1km of client address)
    if (cleanerLocation && job.latitude && job.longitude) {
      const distance = this.calculateDistance(
        cleanerLocation.latitude,
        cleanerLocation.longitude,
        job.latitude,
        job.longitude
      );

      // Cleaner arrived (within 100m)
      if (distance <= 0.1 && status === 'In Progress') {
        await this.sendCleanerArrivedNotification(job);
      }
      // Cleaner approaching (within 1km)
      else if (distance <= 1 && status === 'Scheduled') {
        await this.sendCleanerApproachingNotification(job, distance);
      }
    }

    // Job status updates
    if (status === 'In Progress') {
      await this.sendJobStartedNotification(job);
    } else if (status === 'Completed') {
      await this.sendJobCompletedNotification(job);
      // Stop monitoring this job
      if (this.jobListeners.has(job.id)) {
        this.jobListeners.get(job.id)();
        this.jobListeners.delete(job.id);
      }
    }
  }

  // Send cleaner arrived notification
  async sendCleanerArrivedNotification(job) {
    await this.sendNotification({
      title: '🏠 Cleaner Has Arrived!',
      body: `Your cleaner is now at your location for ${job.title}`,
      data: {
        type: 'cleaner_arrived',
        jobId: job.id,
        jobTitle: job.title,
      },
    });
  }

  // Send cleaner approaching notification
  async sendCleanerApproachingNotification(job, distance) {
    const distanceText = distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`;
    
    await this.sendNotification({
      title: '🚗 Cleaner On The Way',
      body: `Your cleaner is ${distanceText} away and will arrive soon`,
      data: {
        type: 'cleaner_approaching',
        jobId: job.id,
        distance: distance,
      },
    });
  }

  // Send job started notification
  async sendJobStartedNotification(job) {
    await this.sendNotification({
      title: '✨ Cleaning Started',
      body: `Your ${job.title} service has begun`,
      data: {
        type: 'job_started',
        jobId: job.id,
      },
    });
  }

  // Send job completed notification
  async sendJobCompletedNotification(job) {
    await this.sendNotification({
      title: '✅ Cleaning Complete!',
      body: `Your ${job.title} has been completed. How did we do?`,
      data: {
        type: 'job_completed',
        jobId: job.id,
      },
    });
  }

  // Send booking reminder notification
  async sendBookingReminder(job) {
    const reminderTime = new Date(job.scheduledDate);
    reminderTime.setHours(reminderTime.getHours() - 2); // 2 hours before

    if (reminderTime > new Date()) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '⏰ Upcoming Cleaning',
          body: `Your ${job.title} is scheduled in 2 hours at ${job.startTime}`,
          data: {
            type: 'booking_reminder',
            jobId: job.id,
          },
        },
        trigger: reminderTime,
      });
    }
  }

  // Generic notification sender
  async sendNotification({ title, body, data = {} }) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Send immediately
      });
      
      console.log('Notification sent:', title);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }

  // Handle notification tap actions
  handleCleanerArrivedNotification(data) {
    // Navigate to job details or show welcome message
    console.log('Cleaner arrived notification tapped:', data);
  }

  handleJobUpdateNotification(data) {
    // Navigate to bookings page
    console.log('Job update notification tapped:', data);
  }

  // Calculate distance between two coordinates (in km)
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  // Cleanup listeners
  cleanup() {
    console.log('Cleaning up notification service...');
    
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }
    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
    
    // Stop main job listener
    if (this.mainJobListener) {
      try {
        this.mainJobListener();
        this.mainJobListener = null;
      } catch (error) {
        console.log('Error stopping main job listener:', error);
      }
    }
    
    // Stop all job listeners
    this.jobListeners.forEach((unsubscribe, jobId) => {
      try {
        unsubscribe();
        console.log('Stopped listener for job:', jobId);
      } catch (error) {
        console.log('Error stopping listener for job:', jobId);
      }
    });
    this.jobListeners.clear();
    
    // Reset token
    this.expoPushToken = null;
    
    console.log('Notification service cleanup complete');
  }
}

export default new NotificationService();