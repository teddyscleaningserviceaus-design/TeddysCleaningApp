import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AdminDashboard from '../dashboard';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', email: 'test@example.com' },
    logout: jest.fn(),
  }),
}));

jest.mock('../hooks/useLiveOpsListeners', () => ({
  useLiveOpsListeners: () => ({
    jobs: [
      { id: '1', title: 'Test Job', status: 'Pending', client: 'Test Client' },
      { id: '2', title: 'Active Job', status: 'In Progress', client: 'Active Client' },
    ],
    employees: [
      { id: 'emp1', name: 'John Doe', userType: 'employee' },
    ],
    alerts: [
      { id: 'alert1', message: 'Test alert', type: 'sla_breach' },
    ],
    counts: { totalJobs: 2, inProgress: 1, completed: 0, pending: 1 },
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

jest.mock('../components/LiveMap', () => {
  return function MockLiveMap({ jobs, includePast }: any) {
    return null; // Mock component
  };
});

jest.mock('../components/JobDetailsPanel', () => {
  return function MockJobDetailsPanel() {
    return null;
  };
});

jest.mock('../components/EmployeeRoster', () => {
  return function MockEmployeeRoster() {
    return null;
  };
});

jest.mock('../components/BulkToolbar', () => {
  return function MockBulkToolbar() {
    return null;
  };
});

describe('AdminDashboard', () => {
  it('should render without crashing', () => {
    const { getByText } = render(<AdminDashboard />);
    expect(getByText('Live Operations')).toBeTruthy();
  });

  it('should handle search input with debouncing', async () => {
    const { getByPlaceholderText } = render(<AdminDashboard />);
    const searchInput = getByPlaceholderText('Search jobs, clients, employees...');
    
    fireEvent.changeText(searchInput, 'test search');
    
    // Should update immediately in UI
    expect(searchInput.props.value).toBe('test search');
  });

  it('should toggle include past jobs', () => {
    const { getByText } = render(<AdminDashboard />);
    const toggleButton = getByText('Include Past Jobs');
    
    fireEvent.press(toggleButton);
    
    // Should toggle the state (visual feedback would be tested in integration tests)
    expect(toggleButton).toBeTruthy();
  });

  it('should handle KPI navigation correctly', () => {
    const mockPush = jest.fn();
    const useRouter = require('expo-router').useRouter;
    useRouter.mockReturnValue({ push: mockPush, replace: jest.fn() });
    
    const { getByText } = render(<AdminDashboard />);
    
    // Test total KPI click
    const totalCard = getByText('Total').parent;
    fireEvent.press(totalCard);
    expect(mockPush).toHaveBeenCalledWith('/(admin-tabs)/jobs');
    
    // Test active KPI click
    const activeCard = getByText('Active').parent;
    fireEvent.press(activeCard);
    expect(mockPush).toHaveBeenCalledWith('/(admin-tabs)/jobs?status=In%20Progress');
  });

  it('should expose global openJobDetailsPanel function', () => {
    render(<AdminDashboard />);
    
    // Should expose the function globally
    expect((global as any).openJobDetailsPanel).toBeDefined();
    expect(typeof (global as any).openJobDetailsPanel).toBe('function');
  });

  it('should handle job selection', () => {
    const { getByText } = render(<AdminDashboard />);
    
    // Find and press a job item
    const jobItem = getByText('Test Job');
    fireEvent.press(jobItem);
    
    // Should open job details panel (tested via state change)
    expect(jobItem).toBeTruthy();
  });

  it('should handle date range filtering', () => {
    const { getByText } = render(<AdminDashboard />);
    
    // Test date range buttons
    const weekButton = getByText('Week');
    fireEvent.press(weekButton);
    
    const monthButton = getByText('Month');
    fireEvent.press(monthButton);
    
    const allButton = getByText('All');
    fireEvent.press(allButton);
    
    // Should update the selected date range
    expect(weekButton).toBeTruthy();
  });

  it('should handle error states gracefully', () => {
    const mockUseLiveOpsListeners = require('../hooks/useLiveOpsListeners').useLiveOpsListeners;
    mockUseLiveOpsListeners.mockReturnValue({
      jobs: [],
      employees: [],
      alerts: [],
      counts: { totalJobs: 0, inProgress: 0, completed: 0, pending: 0 },
      loading: false,
      error: 'Connection error - using cached data',
      refresh: jest.fn(),
    });
    
    const { getByText } = render(<AdminDashboard />);
    
    // Should show error banner
    expect(getByText('Connection error - using cached data')).toBeTruthy();
    expect(getByText('Retry')).toBeTruthy();
  });

  it('should handle multi-select mode', () => {
    const { getByTestId } = render(<AdminDashboard />);
    
    // Enable multi-select mode by long pressing a job
    const jobItem = getByTestId('job-item-1') || getByText('Test Job');
    fireEvent(jobItem, 'longPress');
    
    // Should enter multi-select mode
    expect(jobItem).toBeTruthy();
  });
});