import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { collection, onSnapshot, query, limit, orderBy, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface LiveOpsFilters {
  search?: string;
  dateRange?: { start: Date; end: Date } | null;
  status?: string;
  pageSize?: number;
  pageToken?: string;
}

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

const MAX_RETRY_ATTEMPTS = 3;
const INITIAL_RETRY_DELAY = 1000;
const MAX_RETRY_DELAY = 8000;

export function useLiveOpsListeners(filters: LiveOpsFilters = {}): LiveOpsData {
  const { user, authReady } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isOfflineFallback, setIsOfflineFallback] = useState(false);
  
  const unsubscribesRef = useRef<(() => void)[]>([]);
  const retryTimeoutRef = useRef<NodeJS.Timeout>();
  const debouncedSearchRef = useRef<NodeJS.Timeout>();
  
  // Debounced search term
  const [debouncedSearch, setDebouncedSearch] = useState(filters.search || '');
  
  // Debounce search input
  useEffect(() => {
    if (debouncedSearchRef.current) {
      clearTimeout(debouncedSearchRef.current);
    }
    debouncedSearchRef.current = setTimeout(() => {
      setDebouncedSearch(filters.search || '');
    }, 300);
    
    return () => {
      if (debouncedSearchRef.current) {
        clearTimeout(debouncedSearchRef.current);
      }
    };
  }, [filters.search]);
  
  // Memoized filters to prevent effect loops
  const stableFilters = useMemo(() => ({
    search: debouncedSearch,
    dateRange: filters.dateRange,
    status: filters.status,
    pageSize: filters.pageSize || 50,
    pageToken: filters.pageToken
  }), [debouncedSearch, filters.dateRange, filters.status, filters.pageSize, filters.pageToken]);
  
  // Error handler with exponential backoff
  const handleListenerError = useCallback((error: any, listenerType: string) => {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ${listenerType} listener error:`, {
      code: error.code,
      message: error.message,
      retryCount,
      isOffline: !navigator.onLine
    });
    
    // Don't show error for permission-denied (user likely logged out)
    if (error.code === 'permission-denied') {
      setError(null);
      return;
    }
    
    // Set user-friendly error message
    setError(`Connection issue. Retrying... (${retryCount + 1}/${MAX_RETRY_ATTEMPTS})`);
    
    // Implement exponential backoff retry
    if (retryCount < MAX_RETRY_ATTEMPTS) {
      const delay = Math.min(INITIAL_RETRY_DELAY * Math.pow(2, retryCount), MAX_RETRY_DELAY);
      
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      
      retryTimeoutRef.current = setTimeout(() => {
        setRetryCount(prev => prev + 1);
      }, delay);
    } else {
      // Max retries reached, fallback to polling
      setIsOfflineFallback(true);
      setError('Using offline mode. Some data may be outdated.');
    }
  }, [retryCount]);
  
  // Offline fallback polling
  const pollData = useCallback(async () => {
    if (!user || !isOfflineFallback) return;
    
    try {
      const jobsSnapshot = await getDocs(query(
        collection(db, 'jobs'),
        orderBy('createdAt', 'desc'),
        limit(stableFilters.pageSize)
      ));
      
      const jobsList = jobsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setJobs(jobsList);
      setError('Offline mode - data may be outdated');
    } catch (error) {
      console.error('Polling fallback error:', error);
    }
  }, [user, isOfflineFallback, stableFilters.pageSize]);
  
  // Setup listeners
  useEffect(() => {
    // Clear existing listeners
    unsubscribesRef.current.forEach(unsubscribe => unsubscribe());
    unsubscribesRef.current = [];
    
    if (!authReady) {
      return;
    }
    
    if (!user) {
      setJobs([]);
      setEmployees([]);
      setLoading(false);
      setError(null);
      return;
    }
    
    // Reset error state on new connection attempt
    setError(null);
    setRetryCount(0);
    setIsOfflineFallback(false);
    
    // Jobs listener with scoped query
    let jobsQuery = query(
      collection(db, 'jobs'),
      orderBy('createdAt', 'desc'),
      limit(stableFilters.pageSize)
    );
    
    // Add status filter if specified
    if (stableFilters.status && stableFilters.status !== 'all') {
      jobsQuery = query(
        collection(db, 'jobs'),
        where('status', '==', stableFilters.status),
        orderBy('createdAt', 'desc'),
        limit(stableFilters.pageSize)
      );
    }
    
    const unsubscribeJobs = onSnapshot(
      jobsQuery,
      (snapshot) => {
        const jobsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setJobs(jobsList);
        setLoading(false);
        setError(null);
        setRetryCount(0);
        setIsOfflineFallback(false);
      },
      (error) => handleListenerError(error, 'Jobs')
    );
    
    // Employees listener - only active employees
    const employeesQuery = query(
      collection(db, 'users'),
      where('userType', '==', 'employee')
    );
    
    const unsubscribeEmployees = onSnapshot(
      employeesQuery,
      (snapshot) => {
        const employeesList = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(emp => emp.status !== 'inactive'); // Client-side filter for active employees
        setEmployees(employeesList);
      },
      (error) => handleListenerError(error, 'Employees')
    );
    
    unsubscribesRef.current = [unsubscribeJobs, unsubscribeEmployees];
    
    return () => {
      unsubscribesRef.current.forEach(unsubscribe => unsubscribe());
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [user, authReady, stableFilters, handleListenerError]);
  
  // Offline polling effect
  useEffect(() => {
    if (!isOfflineFallback) return;
    
    const interval = setInterval(pollData, 30000); // Poll every 30 seconds
    pollData(); // Initial poll
    
    return () => clearInterval(interval);
  }, [isOfflineFallback, pollData]);
  
  // Filter jobs based on search and date range
  const filteredJobs = useMemo(() => {
    let filtered = jobs;
    
    // Search filter
    if (stableFilters.search) {
      const searchLower = stableFilters.search.toLowerCase();
      filtered = filtered.filter(job => 
        job.title?.toLowerCase().includes(searchLower) ||
        job.client?.toLowerCase().includes(searchLower) ||
        job.address?.toLowerCase().includes(searchLower) ||
        job.assignedToName?.toLowerCase().includes(searchLower)
      );
    }
    
    // Date range filter
    if (stableFilters.dateRange) {
      const { start, end } = stableFilters.dateRange;
      filtered = filtered.filter(job => {
        const jobDate = job.scheduledDate?.toDate?.() || job.createdAt?.toDate?.() || new Date(job.scheduledDate || job.createdAt);
        return jobDate >= start && jobDate <= end;
      });
    }
    
    return filtered;
  }, [jobs, stableFilters.search, stableFilters.dateRange]);
  
  // Generate alerts from job data
  const alerts = useMemo(() => {
    const alertsList: any[] = [];
    const now = new Date();
    
    filteredJobs.forEach(job => {
      // SLA breach alert
      const scheduledDate = job.scheduledDate?.toDate?.() || new Date(job.scheduledDate);
      if (scheduledDate < now && job.status !== 'Completed') {
        alertsList.push({
          id: `sla-${job.id}`,
          type: 'sla_breach',
          message: `Job "${job.title}" is overdue`,
          jobId: job.id,
          timestamp: now,
          severity: 'high'
        });
      }
      
      // Long-running job alert
      if (job.status === 'In Progress' && job.startedAt) {
        const startedAt = job.startedAt?.toDate?.() || new Date(job.startedAt);
        const hoursRunning = (now.getTime() - startedAt.getTime()) / (1000 * 60 * 60);
        if (hoursRunning > 8) {
          alertsList.push({
            id: `long-running-${job.id}`,
            type: 'long_running',
            message: `Job "${job.title}" has been running for ${Math.floor(hoursRunning)} hours`,
            jobId: job.id,
            timestamp: now,
            severity: 'medium'
          });
        }
      }
      
      // Missing proof alert
      if (job.status === 'Completed' && !job.proofPhotos?.length && job.proofRequested) {
        alertsList.push({
          id: `missing-proof-${job.id}`,
          type: 'missing_proof',
          message: `Job "${job.title}" completed but missing proof photos`,
          jobId: job.id,
          timestamp: now,
          severity: 'medium'
        });
      }
    });
    
    return alertsList.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [filteredJobs]);
  
  // Calculate counts
  const counts = useMemo(() => {
    const totalJobs = filteredJobs.length;
    const inProgress = filteredJobs.filter(job => job.status === 'In Progress').length;
    const completed = filteredJobs.filter(job => job.status === 'Completed').length;
    const pending = filteredJobs.filter(job => !job.status || job.status === 'Pending').length;
    
    return { totalJobs, inProgress, completed, pending };
  }, [filteredJobs]);
  
  // Manual refresh function
  const refresh = useCallback(() => {
    setRetryCount(0);
    setIsOfflineFallback(false);
    setError(null);
    setLoading(true);
  }, []);
  
  return {
    jobs: filteredJobs,
    employees,
    alerts,
    counts,
    loading,
    error,
    refresh
  };
}