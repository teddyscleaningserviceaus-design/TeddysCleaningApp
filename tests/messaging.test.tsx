import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import EmployeeMessaging from '../app/(employee-tabs)/messaging';
import { useAuth } from '../contexts/AuthContext';
import { messagingService } from '../services/messagingService';
import { auth } from '../config/firebase';

// Mock dependencies
jest.mock('../contexts/AuthContext');
jest.mock('../services/messagingService');
jest.mock('../config/firebase');
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockMessagingService = messagingService as jest.Mocked<typeof messagingService>;
const mockAuth = auth as jest.Mocked<typeof auth>;

describe('EmployeeMessaging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Alert.alert = jest.fn();
  });

  describe('loadUsers behavior', () => {
    it('should use auth.currentUser fallback when userProfile is null', async () => {
      // Setup mocks
      mockUseAuth.mockReturnValue({
        userProfile: null,
        authReady: true,
        user: null,
        loading: false,
        setUserRole: jest.fn(),
        logout: jest.fn(),
      });

      mockAuth.currentUser = {
        uid: 'test-uid',
        displayName: 'Test User',
      } as any;

      mockMessagingService.getMessagingUsers.mockResolvedValue([
        { id: 'user1', name: 'User 1', email: 'user1@test.com', role: 'employee' },
      ]);

      mockMessagingService.getUserChats.mockReturnValue(() => {});

      const { getByText } = render(<EmployeeMessaging />);

      // Wait for component to load
      await waitFor(() => {
        expect(mockMessagingService.getMessagingUsers).toHaveBeenCalled();
      });

      // Should not show "No user profile" error
      expect(getByText('Admin Team')).toBeTruthy();
    });

    it('should set Admin fallback if Firestore call fails', async () => {
      mockUseAuth.mockReturnValue({
        userProfile: { uid: 'test-uid', name: 'Test User' } as any,
        authReady: true,
        user: null,
        loading: false,
        setUserRole: jest.fn(),
        logout: jest.fn(),
      });

      mockMessagingService.getMessagingUsers.mockRejectedValue(
        new Error('permission-denied')
      );

      mockMessagingService.getUserChats.mockReturnValue(() => {});

      const { getByText } = render(<EmployeeMessaging />);

      await waitFor(() => {
        expect(getByText('Admin Team')).toBeTruthy();
      });
    });

    it('should only start chats listener when uid exists', async () => {
      mockUseAuth.mockReturnValue({
        userProfile: null,
        authReady: true,
        user: null,
        loading: false,
        setUserRole: jest.fn(),
        logout: jest.fn(),
      });

      mockAuth.currentUser = null;

      render(<EmployeeMessaging />);

      // Should not call getUserChats when no uid
      expect(mockMessagingService.getUserChats).not.toHaveBeenCalled();
    });

    it('should handle retry loading with loading state', async () => {
      mockUseAuth.mockReturnValue({
        userProfile: { uid: 'test-uid', name: 'Test User' } as any,
        authReady: true,
        user: null,
        loading: false,
        setUserRole: jest.fn(),
        logout: jest.fn(),
      });

      mockMessagingService.getMessagingUsers.mockResolvedValue([]);
      mockMessagingService.getUserChats.mockReturnValue(() => {});

      const { getByText } = render(<EmployeeMessaging />);

      await waitFor(() => {
        expect(getByText('Retry Loading Users')).toBeTruthy();
      });

      const retryButton = getByText('Retry Loading Users');
      fireEvent.press(retryButton);

      // Should show loading state
      await waitFor(() => {
        expect(getByText('Loading...')).toBeTruthy();
      });
    });
  });

  describe('Integration-style test', () => {
    it('should handle permission-denied gracefully', async () => {
      mockUseAuth.mockReturnValue({
        userProfile: { uid: 'test-uid', name: 'Test User' } as any,
        authReady: true,
        user: null,
        loading: false,
        setUserRole: jest.fn(),
        logout: jest.fn(),
      });

      const permissionError = new Error('permission-denied');
      permissionError.code = 'permission-denied';
      mockMessagingService.getMessagingUsers.mockRejectedValue(permissionError);
      mockMessagingService.getUserChats.mockReturnValue(() => {});

      const { getByText } = render(<EmployeeMessaging />);

      await waitFor(() => {
        // Should show admin fallback
        expect(getByText('Admin Team')).toBeTruthy();
        // Should show retry option
        expect(getByText('Retry Loading Users')).toBeTruthy();
      });
    });
  });
});