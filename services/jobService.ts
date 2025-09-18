import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

export interface Job {
  id: string;
  title: string;
  client?: string;
  clientName?: string;
  contactPhone?: string;
  contactNumber?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  status: 'Pending' | 'Accepted' | 'Schedule-Pending' | 'Scheduled' | 'In Progress' | 'Completed';
  progress?: number;
  jobType?: string;
  buildingType?: string;
  scheduledDate?: string;
  startTime?: string;
  priority?: 'Low' | 'Medium' | 'High';
  notes?: string;
  assignedEmployees?: Array<{ id: string; name: string; assignedAt?: any; status?: 'pending' | 'accepted' | 'denied' }>;
  tasks?: Array<any>;
  createdAt?: any;
  updatedAt?: any;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  skills?: string[];
  equipment?: string[];
  availability?: any;
  workload?: number;
}

export const jobService = {
  async getJob(jobId: string): Promise<Job | null> {
    try {
      console.log('JobService.getJob called with jobId:', jobId);
      
      // Handle guest job IDs (prefixed with 'guest_')
      if (jobId.startsWith('guest_')) {
        const originalId = jobId.replace('guest_', '');
        console.log('Getting guest job with originalId:', originalId);
        const jobDoc = await getDoc(doc(db, 'guest-bookings', originalId));
        if (jobDoc.exists()) {
          const jobData = { 
            id: `guest_${jobDoc.id}`, 
            originalId: jobDoc.id,
            ...jobDoc.data(), 
            bookingType: 'guest' 
          } as Job;
          console.log('Found guest job:', jobData.id, 'assignedEmployees:', jobData.assignedEmployees);
          return jobData;
        }
      } else {
        // Try jobs collection first
        console.log('Trying jobs collection for jobId:', jobId);
        const jobDoc = await getDoc(doc(db, 'jobs', jobId));
        if (jobDoc.exists()) {
          const jobData = { id: jobDoc.id, ...jobDoc.data() } as Job;
          console.log('Found regular job:', jobData.id, 'assignedEmployees:', jobData.assignedEmployees);
          return jobData;
        }
        
        // Try guest-bookings collection as fallback
        console.log('Trying guest-bookings collection for jobId:', jobId);
        const guestJobDoc = await getDoc(doc(db, 'guest-bookings', jobId));
        if (guestJobDoc.exists()) {
          const jobData = { 
            id: `guest_${guestJobDoc.id}`, 
            originalId: guestJobDoc.id,
            ...guestJobDoc.data(), 
            bookingType: 'guest' 
          } as Job;
          console.log('Found guest job (fallback):', jobData.id, 'assignedEmployees:', jobData.assignedEmployees);
          return jobData;
        }
      }
      
      console.log('Job not found:', jobId);
      return null;
    } catch (error) {
      console.error('Error getting job:', error);
      throw error;
    }
  },

  async updateJob(jobId: string, updates: Partial<Job>): Promise<void> {
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        ...updates,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating job:', error);
      throw error;
    }
  },

  async assignEmployees(jobId: string, employees: Array<{ id: string; name: string }>): Promise<void> {
    try {
      const assignedEmployees = employees.map(emp => ({
        ...emp,
        assignedAt: new Date(),
        status: 'pending' as const,
      }));

      await updateDoc(doc(db, 'jobs', jobId), {
        assignedEmployees,
        // Update legacy fields for backward compatibility
        assignedTo: assignedEmployees[0]?.id || null,
        assignedToName: assignedEmployees[0]?.name || null,
        status: 'Schedule-Pending',
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error assigning employees:', error);
      throw error;
    }
  },

  async acceptAssignment(jobId: string, employeeId: string): Promise<void> {
    try {
      console.log('AcceptAssignment called - jobId:', jobId, 'employeeId:', employeeId);
      const job = await this.getJob(jobId);
      if (!job) {
        throw new Error(`Job not found: ${jobId}`);
      }
      if (!job.assignedEmployees) {
        throw new Error(`No assigned employees found for job: ${jobId}`);
      }
      console.log('Job found for acceptance:', job.id, 'assignedEmployees:', job.assignedEmployees);

      const updatedEmployees = job.assignedEmployees.map(emp => 
        emp.id === employeeId ? { ...emp, status: 'accepted' as const } : emp
      );

      // Check if all employees have accepted
      const allAccepted = updatedEmployees.every(emp => emp.status === 'accepted');
      
      // Update in correct collection
      const collection_name = job.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
      const docId = job.originalId || jobId.replace('guest_', '') || jobId;
      
      await updateDoc(doc(db, collection_name, docId), {
        assignedEmployees: updatedEmployees,
        status: allAccepted ? 'Scheduled' : 'Schedule-Pending',
        updatedAt: new Date(),
      });
      
      console.log('Job assignment accepted:', jobId, 'All accepted:', allAccepted);
    } catch (error) {
      console.error('Error accepting assignment:', error);
      throw error;
    }
  },

  async denyAssignment(jobId: string, employeeId: string): Promise<void> {
    try {
      const job = await this.getJob(jobId);
      if (!job || !job.assignedEmployees) {
        throw new Error('Job or assigned employees not found');
      }

      const updatedEmployees = job.assignedEmployees.filter(emp => emp.id !== employeeId);
      
      // Update in correct collection
      const collection_name = job.bookingType === 'guest' ? 'guest-bookings' : 'jobs';
      const docId = job.originalId || jobId.replace('guest_', '') || jobId;
      
      await updateDoc(doc(db, collection_name, docId), {
        assignedEmployees: updatedEmployees,
        assignedTo: updatedEmployees[0]?.id || null,
        assignedToName: updatedEmployees[0]?.name || null,
        updatedAt: new Date(),
      });
      
      console.log('Job assignment denied:', jobId, 'Remaining employees:', updatedEmployees.length);
    } catch (error) {
      console.error('Error denying assignment:', error);
      throw error;
    }
  },

  async updateTasks(jobId: string, tasks: Array<any>): Promise<void> {
    try {
      await updateDoc(doc(db, 'jobs', jobId), {
        tasks,
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating tasks:', error);
      throw error;
    }
  },

  async getEmployees(): Promise<Employee[]> {
    try {
      const q = query(collection(db, 'users'), where('userType', '==', 'employee'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Employee[];
    } catch (error) {
      console.error('Error getting employees:', error);
      throw error;
    }
  },

  async updateJobStatus(jobId: string, status: Job['status']): Promise<void> {
    try {
      const progressMap = {
        'Pending': 0,
        'Accepted': 10,
        'Schedule-Pending': 15,
        'Scheduled': 25,
        'In Progress': 50,
        'Completed': 100,
      };

      await updateDoc(doc(db, 'jobs', jobId), {
        status,
        progress: progressMap[status],
        updatedAt: new Date(),
      });
    } catch (error) {
      console.error('Error updating job status:', error);
      throw error;
    }
  },
};