import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

class SettingsService {
  // Notification Management (simplified)
  async requestNotificationPermissions() {
    Alert.alert('Notifications', 'Notification permissions would be requested here.');
    return true;
  }

  async scheduleBookingReminder(bookingDate, bookingTime, serviceTitle) {
    const settings = await this.getSettings();
    if (settings?.notifications?.bookingReminders) {
      console.log(`Booking reminder scheduled for ${serviceTitle} on ${bookingDate}`);
    }
  }

  // Location Management (simplified)
  async requestLocationPermission() {
    Alert.alert('Location', 'Location permissions would be requested here.');
    return true;
  }

  async getCurrentLocation() {
    const settings = await this.getSettings();
    if (settings?.privacy?.locationTracking) {
      return { latitude: -37.8136, longitude: 144.9631 }; // Melbourne default
    }
    return null;
  }

  // Auto-Booking Logic
  async checkAutoBooking(userId) {
    try {
      const settings = await this.getSettings();
      if (!settings?.preferences?.autoBooking) return;

      // This would integrate with your booking system
      // For now, we'll just show a notification
      const lastBooking = await AsyncStorage.getItem(`lastBooking_${userId}`);
      if (lastBooking) {
        const lastDate = new Date(lastBooking);
        const daysSince = (new Date() - lastDate) / (1000 * 60 * 60 * 24);
        
        if (daysSince >= 14) { // 2 weeks
          Alert.alert(
            'Auto-Booking Available',
            'Would you like to book your regular cleaning service?',
            [
              { text: 'Not Now', style: 'cancel' },
              { text: 'Book Now', onPress: () => this.triggerAutoBooking() }
            ]
          );
        }
      }
    } catch (error) {
      console.error('Error checking auto-booking:', error);
    }
  }

  async triggerAutoBooking() {
    // This would integrate with your booking flow
    Alert.alert('Auto-Booking', 'This would automatically create a booking based on your preferences.');
  }

  // Eco Mode Filtering
  async filterServicesByEcoMode(services) {
    const settings = await this.getSettings();
    if (!settings?.preferences?.ecoMode) return services;

    // Filter services to show eco-friendly options first
    return services.sort((a, b) => {
      const aEco = this.isEcoFriendly(a);
      const bEco = this.isEcoFriendly(b);
      if (aEco && !bEco) return -1;
      if (!aEco && bEco) return 1;
      return 0;
    });
  }

  isEcoFriendly(service) {
    const ecoServices = ['regular', 'deep']; // These use eco-friendly products
    return ecoServices.includes(service.id);
  }

  // Data Usage Management
  async getImageQuality() {
    const settings = await this.getSettings();
    const dataUsage = settings?.preferences?.dataUsage || 'medium';
    
    switch (dataUsage) {
      case 'low': return 0.3;
      case 'medium': return 0.7;
      case 'high': return 1.0;
      default: return 0.7;
    }
  }

  async shouldPreloadImages() {
    const settings = await this.getSettings();
    return settings?.preferences?.dataUsage !== 'low';
  }

  // Settings Management
  async getSettings() {
    try {
      const settings = await AsyncStorage.getItem('clientSettings');
      return settings ? JSON.parse(settings) : null;
    } catch (error) {
      console.error('Error getting settings:', error);
      return null;
    }
  }

  async updateSetting(category, key, value) {
    try {
      const settings = await this.getSettings() || this.getDefaultSettings();
      settings[category][key] = value;
      
      await AsyncStorage.setItem('clientSettings', JSON.stringify(settings));
      
      // Apply setting immediately
      await this.applySettingChange(category, key, value);
      
      return settings;
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  }

  async applySettingChange(category, key, value) {
    switch (`${category}.${key}`) {
      case 'notifications.bookingReminders':
        console.log('Booking reminders:', value ? 'enabled' : 'disabled');
        break;
        
      case 'privacy.locationTracking':
        if (value) {
          console.log('Location tracking enabled');
        }
        break;
        
      case 'preferences.dataUsage':
        if (value === 'low') {
          await AsyncStorage.removeItem('imageCache');
        }
        console.log('Data usage set to:', value);
        break;
    }
  }

  getDefaultSettings() {
    return {
      notifications: {
        bookingReminders: true,
        promotions: false,
        serviceUpdates: true,
        emergencyAlerts: true,
      },
      preferences: {
        autoBooking: false,
        ecoMode: true,
        dataUsage: 'medium',
        language: 'en',
      },
      privacy: {
        shareData: false,
        locationTracking: true,
        analytics: false,
      },
    };
  }
}

export default new SettingsService();