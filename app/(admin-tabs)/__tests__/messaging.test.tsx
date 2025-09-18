import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import AdminMessaging from '../messaging';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'admin-user', email: 'admin@example.com', userType: 'admin' },
    authReady: true,
  }),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
}));

// Mock global openJobDetailsPanel
(global as any).openJobDetailsPanel = jest.fn();

describe('AdminMessaging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock successful conversations fetch
    const mockOnSnapshot = require('firebase/firestore').onSnapshot;
    mockOnSnapshot.mockImplementation((query, onNext) => {
      onNext({
        docs: [
          {
            id: 'conv1',
            data: () => ({
              participants: ['admin', 'employee1'],
              lastMessage: 'Test message',
              lastMessageAt: { toDate: () => new Date() },
              type: 'admin-employee',
              jobId: 'job123',
              unreadCount: 2,
            }),
          },
        ],
      });
      return () => {};
    });
  });

  it('should render without crashing', () => {
    const { getByText } = render(<AdminMessaging />);
    expect(getByText('Team Messages')).toBeTruthy();
  });

  it('should handle auth readiness correctly', () => {
    const mockUseAuth = require('../../../contexts/AuthContext').useAuth;
    
    // Test with authReady false
    mockUseAuth.mockReturnValue({
      user: null,
      authReady: false,
    });
    
    const { getByText } = render(<AdminMessaging />);
    expect(getByText('Team Messages')).toBeTruthy();
  });

  it('should handle no user gracefully', () => {
    const mockUseAuth = require('../../../contexts/AuthContext').useAuth;
    
    mockUseAuth.mockReturnValue({
      user: null,
      authReady: true,
    });
    
    const { getByText } = render(<AdminMessaging />);
    expect(getByText('No conversations yet')).toBeTruthy();
  });

  it('should display conversations correctly', async () => {
    const { getByText } = render(<AdminMessaging />);
    
    await waitFor(() => {
      expect(getByText('admin & employee1')).toBeTruthy();
      expect(getByText('Test message')).toBeTruthy();
    });
  });

  it('should handle Jump-to-Job functionality', async () => {
    const mockPush = jest.fn();
    const useRouter = require('expo-router').useRouter;
    useRouter.mockReturnValue({ push: mockPush });
    
    const { getByText } = render(<AdminMessaging />);
    
    await waitFor(() => {
      const jumpButton = getByText('View Job Details');
      fireEvent.press(jumpButton);
      
      // Should call global openJobDetailsPanel if available
      expect((global as any).openJobDetailsPanel).toHaveBeenCalledWith('job123');
    });
  });

  it('should fallback to navigation when openJobDetailsPanel not available', async () => {
    // Remove global function
    delete (global as any).openJobDetailsPanel;
    
    const mockPush = jest.fn();
    const useRouter = require('expo-router').useRouter;
    useRouter.mockReturnValue({ push: mockPush });
    
    const { getByText } = render(<AdminMessaging />);
    
    await waitFor(() => {
      const jumpButton = getByText('View Job Details');
      fireEvent.press(jumpButton);
      
      // Should fallback to router navigation
      expect(mockPush).toHaveBeenCalledWith('/(admin-tabs)/jobs?jobId=job123');
    });
  });

  it('should handle permission denied errors gracefully', () => {
    const mockOnSnapshot = require('firebase/firestore').onSnapshot;
    
    mockOnSnapshot.mockImplementation((query, onNext, onError) => {
      onError({ code: 'permission-denied', message: 'Permission denied' });
      return () => {};
    });
    
    const { getByText } = render(<AdminMessaging />);
    
    // Should not crash and show empty state
    expect(getByText('No conversations yet')).toBeTruthy();
  });

  it('should handle transport errors with structured logging', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const mockOnSnapshot = require('firebase/firestore').onSnapshot;
    
    mockOnSnapshot.mockImplementation((query, onNext, onError) => {
      onError({ code: 'unavailable', message: 'Transport error' });
      return () => {};
    });
    
    render(<AdminMessaging />);
    
    // Should log structured error information
    expect(consoleSpy).toHaveBeenCalledWith(
      'Conversations query error:',
      expect.objectContaining({
        code: 'unavailable',
        message: 'Transport error',
        timestamp: expect.any(String),
      })
    );
    
    consoleSpy.mockRestore();
  });

  it('should display conversation statistics correctly', async () => {
    const { getByText } = render(<AdminMessaging />);
    
    await waitFor(() => {
      expect(getByText('1')).toBeTruthy(); // Total conversations
      expect(getByText('2')).toBeTruthy(); // Unread count
    });
  });

  it('should format timestamps correctly', () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    // Test the formatTime function indirectly through component
    const { getByText } = render(<AdminMessaging />);
    
    // Should show relative time
    expect(getByText('Just now')).toBeTruthy();
  });
});