import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

class CleanerLocationSimulator {
  constructor() {
    this.activeSimulations = new Map();
  }

  // Simulate cleaner approaching and arriving at job location
  async simulateCleanerJourney(jobId, clientLocation) {
    if (this.activeSimulations.has(jobId)) {
      console.log('Simulation already running for job:', jobId);
      return;
    }

    console.log('Starting cleaner location simulation for job:', jobId);
    
    // Starting location (5km away from client)
    const startLocation = {
      latitude: clientLocation.latitude + 0.045, // ~5km north
      longitude: clientLocation.longitude + 0.045, // ~5km east
    };

    let currentLocation = { ...startLocation };
    const steps = 20; // Number of location updates
    const intervalMs = 3000; // 3 seconds between updates

    // Calculate step increments
    const latStep = (clientLocation.latitude - startLocation.latitude) / steps;
    const lonStep = (clientLocation.longitude - startLocation.longitude) / steps;

    const simulationInterval = setInterval(async () => {
      try {
        // Update cleaner location
        currentLocation.latitude += latStep;
        currentLocation.longitude += lonStep;

        // Calculate distance to client
        const distance = this.calculateDistance(
          currentLocation.latitude,
          currentLocation.longitude,
          clientLocation.latitude,
          clientLocation.longitude
        );

        console.log(`Cleaner is ${distance.toFixed(2)}km away from client`);

        // Update job with cleaner location
        await updateDoc(doc(db, 'jobs', jobId), {
          cleanerLocation: currentLocation,
          cleanerDistance: distance,
          updatedAt: new Date(),
        });

        // Stop simulation when cleaner arrives (within 50m)
        if (distance <= 0.05) {
          console.log('Cleaner has arrived! Stopping simulation.');
          this.stopSimulation(jobId);
          
          // Mark job as in progress
          await updateDoc(doc(db, 'jobs', jobId), {
            status: 'In Progress',
            actualStartTime: new Date(),
          });
        }
      } catch (error) {
        console.error('Error updating cleaner location:', error);
        this.stopSimulation(jobId);
      }
    }, intervalMs);

    this.activeSimulations.set(jobId, simulationInterval);

    // Auto-stop after 2 minutes if not completed
    setTimeout(() => {
      if (this.activeSimulations.has(jobId)) {
        console.log('Auto-stopping simulation after timeout');
        this.stopSimulation(jobId);
      }
    }, 120000);
  }

  // Stop location simulation for a job
  stopSimulation(jobId) {
    const interval = this.activeSimulations.get(jobId);
    if (interval) {
      clearInterval(interval);
      this.activeSimulations.delete(jobId);
      console.log('Stopped simulation for job:', jobId);
    }
  }

  // Stop all active simulations
  stopAllSimulations() {
    this.activeSimulations.forEach((interval, jobId) => {
      clearInterval(interval);
      console.log('Stopped simulation for job:', jobId);
    });
    this.activeSimulations.clear();
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

  // Quick test function - simulate cleaner for a specific job
  async testNotifications(jobId) {
    try {
      // Default Melbourne location for testing
      const testLocation = {
        latitude: -37.8136,
        longitude: 144.9631,
      };

      console.log('🧪 Starting notification test for job:', jobId);
      await this.simulateCleanerJourney(jobId, testLocation);
    } catch (error) {
      console.error('Error in test simulation:', error);
    }
  }
}

export default new CleanerLocationSimulator();