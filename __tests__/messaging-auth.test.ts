import { render, waitFor } from '@testing-library/react-native';
import AdminMessaging from '../app/(admin-tabs)/messaging';

// Mock dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

jest.mock('../config/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
}));

// Mock AuthContext
const mockUseAuth = jest.fn();
jest.mock('../contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('AdminMessaging Auth Fallback', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle auth not ready state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      authReady: false,
    });

    const { onSnapshot } = require('firebase/firestore');
    const mockUnsubscribe = jest.fn();
    onSnapshot.mockReturnValue(mockUnsubscribe);

    render(<AdminMessaging />);

    // Should not call onSnapshot when auth not ready
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('should handle no user gracefully', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      authReady: true,
    });

    const { onSnapshot } = require('firebase/firestore');
    const mockUnsubscribe = jest.fn();
    onSnapshot.mockReturnValue(mockUnsubscribe);

    const { getByText } = render(<AdminMessaging />);

    await waitFor(() => {
      expect(getByText('No conversations yet')).toBeTruthy();
    });

    // Should not call onSnapshot when no user
    expect(onSnapshot).not.toHaveBeenCalled();
  });

  it('should setup listeners when user is authenticated', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user', email: 'test@example.com' },
      authReady: true,
    });

    const { onSnapshot } = require('firebase/firestore');
    const mockUnsubscribe = jest.fn();
    onSnapshot.mockReturnValue(mockUnsubscribe);

    render(<AdminMessaging />);

    // Should call onSnapshot when user is authenticated
    expect(onSnapshot).toHaveBeenCalled();
  });

  it('should handle permission denied errors gracefully', () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user', email: 'test@example.com' },
      authReady: true,
    });

    const { onSnapshot } = require('firebase/firestore');
    onSnapshot.mockImplementation((query, successCallback, errorCallback) => {
      // Simulate permission denied error
      errorCallback({ code: 'permission-denied', message: 'Permission denied' });
      return () => {};
    });

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    render(<AdminMessaging />);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Conversations query error:',
      expect.objectContaining({ code: 'permission-denied' })
    );

    consoleSpy.mockRestore();
  });

  it('should use Jump-to-Job functionality', async () => {
    mockUseAuth.mockReturnValue({
      user: { uid: 'test-user', email: 'test@example.com' },
      authReady: true,
    });

    const mockConversations = [
      {
        id: 'conv1',
        participants: ['Admin', 'Employee'],
        lastMessage: 'Test message',
        lastMessageAt: new Date(),
        jobId: 'job123',
        type: 'admin-employee',
      }
    ];

    const { onSnapshot } = require('firebase/firestore');
    onSnapshot.mockImplementation((query, callback) => {
      callback({
        docs: mockConversations.map(conv => ({
          id: conv.id,
          data: () => conv
        }))
      });
      return () => {};
    });

    // Mock global openJobDetailsPanel
    const mockOpenJobDetailsPanel = jest.fn();
    (global as any).window = { openJobDetailsPanel: mockOpenJobDetailsPanel };

    const { getByText } = render(<AdminMessaging />);

    await waitFor(() => {
      expect(getByText('View Job Details')).toBeTruthy();
    });

    // Test Jump-to-Job button functionality would be tested with fireEvent.press
    // but keeping this test focused on auth fallback behavior
  });
});