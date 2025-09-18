import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit, getDocs } from 'firebase/firestore';
import { db } from '../../../config/firebase';
import { useAuth } from '../../../contexts/AuthContext';

interface LiveOpsData {
  jobs: any[];
  employees: any[];
  alerts: any[];
  counts: {
    totalJobs: number;
    inProgress: number;
    completed: number;
    pending: number;
  };
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

interface UseListenersOptions {
  search?: string;
  dateRange?: { start?: Date; end?: Date } | null;
  status?: string | null;
  includePast?: boolean;
  pageSize?: number;
}

export function useLiveOpsListeners(options: UseListenersOptions = {}): LiveOpsData {
  const { user, authReady } = useAuth();
  const [allJobs, setAllJobs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transportErrors, setTransportErrors] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  
  const searchTimeoutRef = useRef<NodeJS.Timeout>();
  const pollingTimeoutRef = useRef<NodeJS.Timeout>();
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Stable memoized dateRange to prevent effect loops
  const stableDateRange = useMemo(() => {
    if (!options.dateRange) return null;
    return {
      startTime: options.dateRange.start?.getTime() || null,
      endTime: options.dateRange.end?.getTime() || null
    };
  }, [options.dateRange?.start?.getTime(), options.dateRange?.end?.getTime()]);
  
  // Debounce search with stable deps
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(options.search || '');
    }, 300);
    
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [options.search]);

  // Stable filter function with memoized deps
  const filteredJobs = useMemo(() => {
    let filtered = allJobs;
    
    // Apply search filter
    if (debouncedSearch) {
      const searchLower = debouncedSearch.toLowerCase();
      filtered = filtered.filter(job => 
        job.title?.toLowerCase().includes(searchLower) ||
        job.client?.toLowerCase().includes(searchLower) ||
        job.address?.toLowerCase().includes(searchLower) ||
        job.assignedToName?.toLowerCase().includes(searchLower)
      );
    }

    // Apply date range filter
    if (stableDateRange && (stableDateRange.startTime || stableDateRange.endTime)) {
      filtered = filtered.filter(job => {
        const jobDate = job.scheduledDate?.toDate?.() || job.createdAt?.toDate?.();
        if (!jobDate) return false;
        
        const jobTime = jobDate.getTime();
        if (stableDateRange.startTime && jobTime < stableDateRange.startTime) return false;
        if (stableDateRange.endTime && jobTime > stableDateRange.endTime) return false;
        
        return true;
      });
    }

    // Apply status filter
    if (options.status && options.status !== 'all') {
      filtered = filtered.filter(job => {
        const jobStatus = job.status || 'Pending';
        return jobStatus === options.status;
      });
    }

    // Filter past jobs unless includePast is true
    if (!options.includePast) {
      const now = new Date();
      filtered = filtered.filter(job => {
        if (job.status === 'Completed') {
          const completedDate = job.completedAt?.toDate?.() || job.updatedAt?.toDate?.();
          if (completedDate) {
            const daysSinceCompleted = (now.getTime() - completedDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceCompleted <= 1; // Show completed jobs from last 24 hours
          }
        }
        return true;
      });
    }

    return filtered;
  }, [allJobs, debouncedSearch, stableDateRange, options.status, options.includePast]);

  // Stable counts calculation
  const counts = useMemo(() => ({
    totalJobs: allJobs.length,
    inProgress: allJobs.filter(j => j.status === 'In Progress').length,
    completed: allJobs.filter(j => j.status === 'Completed').length,
    pending: allJobs.filter(j => j.status === 'Pending' || !j.status).length,
  }), [allJobs]);

  // Stable alerts generation
  const alerts = useMemo(() => {
    const alertsList: any[] = [];
    const now = new Date();
    
    allJobs.forEach(job => {
      // SLA breach alerts
      const scheduledDate = job.scheduledDate?.toDate?.();
      if (scheduledDate && scheduledDate < now && job.status !== 'Completed') {
        alertsList.push({
          id: `sla-${job.id}`,
          type: 'sla_breach',
          message: `SLA breach: ${job.title} is overdue`,
          timestamp: now,
          jobId: job.id,
        });
      }
      
      // Long-running job alerts
      if (job.status === 'In Progress') {
        const startTime = job.startedAt?.toDate?.() || job.updatedAt?.toDate?.();
        if (startTime && (now.getTime() - startTime.getTime()) > 4 * 60 * 60 * 1000) {
          alertsList.push({
            id: `long-${job.id}`,
            type: 'long_running',
            message: `Job ${job.title} has been running for over 4 hours`,
            timestamp: now,
            jobId: job.id,
          });
        }
      }
      
      // Missing proof alerts
      if (job.status === 'Completed' && !job.proofPhotos?.length) {
        alertsList.push({
          id: `proof-${job.id}`,
          type: 'missing_proof',
          message: `Missing proof photos for ${job.title}`,
          timestamp: now,
          jobId: job.id,
        });
      }
    });
    
    return alertsList;
  }, [allJobs]);

  // Polling fallback for transport errors
  const pollData = useCallback(async () => {
    if (!user || !authReady) return;
    
    try {
      const pageSize = options.pageSize || 50;
      const jobsQuery = query(
        collection(db, 'jobs'), 
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
      
      const [jobsSnapshot, employeesSnapshot] = await Promise.all([
        getDocs(jobsQuery),
        getDocs(query(collection(db, 'users'), where('userType', '==', 'employee')))
      ]);
      
      const jobs = jobsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const employeesList = employeesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setAllJobs(jobs);
      setEmployees(employeesList);
      setLoading(false);
      
      // Schedule next poll
      if (isPolling) {
        pollingTimeoutRef.current = setTimeout(pollData, 30000); // Poll every 30s
      }
    } catch (error) {
      console.error('Polling error:', error);
      setError(error.code === 'permission-denied' ? null : 'Connection error - using cached data');
    }
  }, [user, authReady, options.pageSize, isPolling]);

  const refresh = useCallback(() => {
    setLoading(true);
    setTransportErrors(0);
    if (isPolling) {
      pollData();
    }
  }, [isPolling, pollData]);

  // Main effect with stable dependencies and error handling
  useEffect(() => {
    if (!authReady) return;
    
    if (!user) {
      setAllJobs([]);
      setEmployees([]);
      setLoading(false);
      setError(null);
      return;
    }

    const unsubscribes: (() => void)[] = [];
    setLoading(true);
    setError(null);
    setIsPolling(false);

    try {
      // Load jobs from both collections
      const pageSize = options.pageSize || 50;
      const jobsQuery = query(
        collection(db, 'jobs'), 
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
      const guestBookingsQuery = query(
        collection(db, 'guest-bookings'),
        orderBy('createdAt', 'desc'),
        limit(pageSize)
      );
      
      let allJobsData = [];
      let jobsLoaded = false;
      let guestBookingsLoaded = false;
      
      const updateAllJobs = () => {
        if (jobsLoaded && guestBookingsLoaded) {
          allJobsData.sort((a, b) => {
            const aDate = a.createdAt?.toDate?.() || new Date(0);
            const bDate = b.createdAt?.toDate?.() || new Date(0);
            return bDate - aDate;
          });
          setAllJobs(allJobsData);
          setLoading(false);
          setTransportErrors(0);
        }
      };
      
      const jobsUnsub = onSnapshot(jobsQuery, 
        (snapshot) => {
          const jobs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          allJobsData = [...jobs, ...allJobsData.filter(j => j.bookingType === 'guest')];
          jobsLoaded = true;
          updateAllJobs();
        },
        (error) => {
          console.error('Jobs listener error:', error);
          if (error.code === 'permission-denied') {
            setError(null);
          } else {
            const newErrorCount = transportErrors + 1;
            setTransportErrors(newErrorCount);
            if (newErrorCount >= 3) {
              setIsPolling(true);
              setError('Connection unstable - using polling mode');
              pollData();
            } else {
              setError(`Connection error (${newErrorCount}/3) - retrying...`);
            }
          }
          jobsLoaded = true;
          updateAllJobs();
        }
      );
      
      const guestBookingsUnsub = onSnapshot(guestBookingsQuery,
        (snapshot) => {
          const guestBookings = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            bookingType: 'guest'
          }));
          allJobsData = [...allJobsData.filter(j => j.bookingType !== 'guest'), ...guestBookings];
          guestBookingsLoaded = true;
          updateAllJobs();
        },
        (error) => {
          console.error('Guest bookings listener error:', error);
          guestBookingsLoaded = true;
          updateAllJobs();
        }
      );

      // Employees listener
      const employeesQuery = query(
        collection(db, 'users'), 
        where('userType', '==', 'employee')
      );
      const employeesUnsub = onSnapshot(employeesQuery,
        (snapshot) => {
          const employeesList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setEmployees(employeesList);
        },
        (error) => {
          console.error('Employees listener error:', {
            code: error.code,
            message: error.message,
            timestamp: new Date().toISOString()
          });
        }
      );

      unsubscribes.push(jobsUnsub, guestBookingsUnsub, employeesUnsub);
    } catch (error) {
      console.error('Listener setup error:', error);
      setError((error as Error).message);
      setLoading(false);
    }

    return () => {
      unsubscribes.forEach(unsub => unsub());
      if (pollingTimeoutRef.current) {
        clearTimeout(pollingTimeoutRef.current);
      }
    };
  }, [authReady, user, options.pageSize, transportErrors, pollData]);

  return {
    jobs: filteredJobs,
    employees,
    alerts,
    counts,
    loading,
    error,
    refresh,
  };
}

export default useLiveOpsListeners;