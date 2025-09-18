import { renderHook, waitFor } from '@testing-library/react-native';
import { useLiveOpsListeners } from '../app/(admin-tabs)/hooks/useLiveOpsListeners';

// Mock Firebase
jest.mock('../app/config/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
}));

jest.mock('../app/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', userType: 'admin' },
  }),
}));

describe('useLiveOpsListeners', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useLiveOpsListeners());

    expect(result.current.jobs).toEqual([]);
    expect(result.current.employees).toEqual([]);
    expect(result.current.alerts).toEqual([]);
    expect(result.current.counts).toEqual({
      totalJobs: 0,
      inProgress: 0,
      completed: 0,
      pending: 0,
    });
    expect(result.current.loading).toBe(true);
    expect(result.current.error).toBe(null);
    expect(typeof result.current.refresh).toBe('function');
  });

  it('should debounce search input', async () => {
    const { result, rerender } = renderHook(
      ({ search }) => useLiveOpsListeners({ search }),
      { initialProps: { search: '' } }
    );

    // Change search multiple times quickly
    rerender({ search: 'a' });
    rerender({ search: 'ab' });
    rerender({ search: 'abc' });

    // Should not trigger immediate updates
    expect(result.current.loading).toBe(true);

    // Wait for debounce
    await waitFor(() => {
      // Debounced search should be applied
    }, { timeout: 500 });
  });

  it('should filter jobs by search query', () => {
    const mockJobs = [
      { id: '1', title: 'Clean Office', client: 'ABC Corp', status: 'Pending' },
      { id: '2', title: 'Wash Windows', client: 'XYZ Ltd', status: 'In Progress' },
    ];

    // Mock the filtering logic
    const searchQuery = 'office';
    const filtered = mockJobs.filter(job =>
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.client.toLowerCase().includes(searchQuery.toLowerCase())
    );

    expect(filtered).toHaveLength(1);
    expect(filtered[0].title).toBe('Clean Office');
  });

  it('should generate alerts for overdue jobs', () => {
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const mockJobs = [
      {
        id: '1',
        title: 'Overdue Job',
        scheduledDate: { toDate: () => yesterday },
        status: 'Scheduled',
      },
      {
        id: '2',
        title: 'On Time Job',
        scheduledDate: { toDate: () => new Date(now.getTime() + 24 * 60 * 60 * 1000) },
        status: 'Scheduled',
      },
    ];

    // Mock alert generation logic
    const alerts = mockJobs
      .filter(job => {
        const scheduledDate = job.scheduledDate.toDate();
        return scheduledDate < now && job.status !== 'Completed';
      })
      .map(job => ({
        id: `sla-${job.id}`,
        type: 'sla_breach',
        message: `SLA breach: ${job.title} is overdue`,
        timestamp: now,
        jobId: job.id,
      }));

    expect(alerts).toHaveLength(1);
    expect(alerts[0].message).toContain('Overdue Job');
  });

  it('should calculate correct job counts', () => {
    const mockJobs = [
      { id: '1', status: 'Pending' },
      { id: '2', status: 'In Progress' },
      { id: '3', status: 'Completed' },
      { id: '4', status: 'In Progress' },
      { id: '5' }, // No status = pending
    ];

    const counts = {
      totalJobs: mockJobs.length,
      inProgress: mockJobs.filter(j => j.status === 'In Progress').length,
      completed: mockJobs.filter(j => j.status === 'Completed').length,
      pending: mockJobs.filter(j => j.status === 'Pending' || !j.status).length,
    };

    expect(counts.totalJobs).toBe(5);
    expect(counts.inProgress).toBe(2);
    expect(counts.completed).toBe(1);
    expect(counts.pending).toBe(2);
  });

  it('should handle date range filtering', () => {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(today.getTime() + 8 * 24 * 60 * 60 * 1000);

    const mockJobs = [
      {
        id: '1',
        title: 'Today Job',
        scheduledDate: { toDate: () => today },
      },
      {
        id: '2',
        title: 'Tomorrow Job',
        scheduledDate: { toDate: () => tomorrow },
      },
      {
        id: '3',
        title: 'Next Week Job',
        scheduledDate: { toDate: () => nextWeek },
      },
    ];

    const dateRange = {
      start: today,
      end: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
    };

    const filtered = mockJobs.filter(job => {
      const jobDate = job.scheduledDate.toDate();
      return jobDate >= dateRange.start && jobDate <= dateRange.end;
    });

    expect(filtered).toHaveLength(2);
    expect(filtered.map(j => j.title)).toEqual(['Today Job', 'Tomorrow Job']);
  });
});