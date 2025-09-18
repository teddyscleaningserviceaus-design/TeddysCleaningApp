import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useLiveOpsListeners } from '../hooks/useLiveOpsListeners';

// Mock Firebase
jest.mock('../../../config/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  getDocs: jest.fn(),
}));

// Mock AuthContext
const mockAuthContext = {
  user: { uid: 'test-user', email: 'test@example.com' },
  authReady: true,
};

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
}));

describe('useLiveOpsListeners', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should debounce search input', async () => {
    const { result, rerender } = renderHook(
      ({ search }) => useLiveOpsListeners({ search }),
      { initialProps: { search: '' } }
    );

    // Rapidly change search
    rerender({ search: 'a' });
    rerender({ search: 'ab' });
    rerender({ search: 'abc' });

    // Should not trigger immediate updates
    expect(result.current.loading).toBe(true);

    // Wait for debounce
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 350));
    });

    // Should have debounced the search
    expect(result.current.loading).toBe(false);
  });

  it('should handle transport errors with fallback', async () => {
    const mockOnSnapshot = require('firebase/firestore').onSnapshot;
    const mockGetDocs = require('firebase/firestore').getDocs;

    // Mock transport error
    mockOnSnapshot.mockImplementation((query, onNext, onError) => {
      onError({ code: 'unavailable', message: 'Transport error' });
      return () => {};
    });

    // Mock successful polling fallback
    mockGetDocs.mockResolvedValue({
      docs: [
        { id: 'job1', data: () => ({ title: 'Test Job', status: 'Pending' }) }
      ]
    });

    const { result } = renderHook(() => useLiveOpsListeners({}));

    await waitFor(() => {
      expect(result.current.error).toContain('Connection error');
    });
  });

  it('should filter jobs by date range correctly', () => {
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const mockJobs = [
      { id: '1', title: 'Today Job', scheduledDate: { toDate: () => today } },
      { id: '2', title: 'Yesterday Job', scheduledDate: { toDate: () => yesterday } },
      { id: '3', title: 'Tomorrow Job', scheduledDate: { toDate: () => tomorrow } },
    ];

    // Mock successful data fetch
    const mockOnSnapshot = require('firebase/firestore').onSnapshot;
    mockOnSnapshot.mockImplementation((query, onNext) => {
      onNext({ docs: mockJobs.map(job => ({ id: job.id, data: () => job })) });
      return () => {};
    });

    const { result } = renderHook(() => 
      useLiveOpsListeners({
        dateRange: { start: today, end: tomorrow }
      })
    );

    expect(result.current.jobs).toHaveLength(2); // Today and tomorrow
  });

  it('should generate alerts for SLA breaches', () => {
    const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    
    const mockJobs = [
      { 
        id: '1', 
        title: 'Overdue Job', 
        status: 'In Progress',
        scheduledDate: { toDate: () => pastDate }
      }
    ];

    const mockOnSnapshot = require('firebase/firestore').onSnapshot;
    mockOnSnapshot.mockImplementation((query, onNext) => {
      onNext({ docs: mockJobs.map(job => ({ id: job.id, data: () => job })) });
      return () => {};
    });

    const { result } = renderHook(() => useLiveOpsListeners({}));

    expect(result.current.alerts).toHaveLength(1);
    expect(result.current.alerts[0].type).toBe('sla_breach');
    expect(result.current.alerts[0].message).toContain('overdue');
  });

  it('should handle permission denied gracefully', async () => {
    const mockOnSnapshot = require('firebase/firestore').onSnapshot;
    
    mockOnSnapshot.mockImplementation((query, onNext, onError) => {
      onError({ code: 'permission-denied', message: 'Permission denied' });
      return () => {};
    });

    const { result } = renderHook(() => useLiveOpsListeners({}));

    await waitFor(() => {
      expect(result.current.error).toBeNull(); // Should not show error for permission-denied
      expect(result.current.jobs).toHaveLength(0);
    });
  });

  it('should include past jobs when includePast is true', () => {
    const completedJob = {
      id: '1',
      title: 'Completed Job',
      status: 'Completed',
      completedAt: { toDate: () => new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) } // 2 days ago
    };

    const mockOnSnapshot = require('firebase/firestore').onSnapshot;
    mockOnSnapshot.mockImplementation((query, onNext) => {
      onNext({ docs: [{ id: completedJob.id, data: () => completedJob }] });
      return () => {};
    });

    // Without includePast
    const { result: resultWithoutPast } = renderHook(() => 
      useLiveOpsListeners({ includePast: false })
    );

    // With includePast
    const { result: resultWithPast } = renderHook(() => 
      useLiveOpsListeners({ includePast: true })
    );

    expect(resultWithoutPast.current.jobs).toHaveLength(0); // Filtered out
    expect(resultWithPast.current.jobs).toHaveLength(1); // Included
  });
});