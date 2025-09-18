import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import JobDetailsPanel from '../app/(admin-tabs)/components/JobDetailsPanel';

// Mock Firebase
jest.mock('../app/config/firebase', () => ({
  db: {},
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  updateDoc: jest.fn(),
  onSnapshot: jest.fn(),
  addDoc: jest.fn(),
  collection: jest.fn(),
}));

jest.mock('../app/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user', displayName: 'Test User' },
  }),
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockJob = {
  id: 'job-1',
  title: 'Test Job',
  client: 'Test Client',
  address: '123 Test St',
  scheduledDate: '2024-01-15',
  assignedToName: 'John Doe',
  status: 'pending',
};

describe('JobDetailsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render job details correctly', () => {
    const { getByText } = render(
      <JobDetailsPanel
        visible={true}
        jobId="job-1"
        onClose={() => {}}
      />
    );

    // Should show loading initially
    expect(getByText('Status')).toBeTruthy();
  });

  it('should handle status updates with optimistic UI', async () => {
    const mockUpdateDoc = require('firebase/firestore').updateDoc;
    const mockOnSnapshot = require('firebase/firestore').onSnapshot;
    
    // Mock onSnapshot to return job data
    mockOnSnapshot.mockImplementation((docRef, callback) => {
      callback({
        exists: () => true,
        id: 'job-1',
        data: () => mockJob,
      });
      return () => {}; // unsubscribe function
    });

    const { getByText } = render(
      <JobDetailsPanel
        visible={true}
        jobId="job-1"
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(getByText('Test Job')).toBeTruthy();
    });

    // Find and press scheduled status chip
    const scheduledChip = getByText('Scheduled');
    fireEvent.press(scheduledChip);

    // Should call updateDoc
    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'scheduled',
        updatedAt: expect.any(Date),
      })
    );
  });

  it('should handle optimistic update rollback on error', async () => {
    const mockUpdateDoc = require('firebase/firestore').updateDoc;
    const mockOnSnapshot = require('firebase/firestore').onSnapshot;
    
    // Mock updateDoc to throw error
    mockUpdateDoc.mockRejectedValue(new Error('Network error'));
    
    // Mock onSnapshot to return job data
    mockOnSnapshot.mockImplementation((docRef, callback) => {
      callback({
        exists: () => true,
        id: 'job-1',
        data: () => mockJob,
      });
      return () => {};
    });

    const { getByText } = render(
      <JobDetailsPanel
        visible={true}
        jobId="job-1"
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(getByText('Test Job')).toBeTruthy();
    });

    // Press status chip
    const scheduledChip = getByText('Scheduled');
    fireEvent.press(scheduledChip);

    // Should show error alert
    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Failed to update job status');
    });
  });

  it('should handle accept action for pending jobs', async () => {
    const mockUpdateDoc = require('firebase/firestore').updateDoc;
    const mockOnSnapshot = require('firebase/firestore').onSnapshot;
    
    mockOnSnapshot.mockImplementation((docRef, callback) => {
      callback({
        exists: () => true,
        id: 'job-1',
        data: () => ({ ...mockJob, status: 'pending' }),
      });
      return () => {};
    });

    const { getByText } = render(
      <JobDetailsPanel
        visible={true}
        jobId="job-1"
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(getByText('Accept')).toBeTruthy();
    });

    const acceptButton = getByText('Accept');
    fireEvent.press(acceptButton);

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: 'scheduled',
      })
    );
  });

  it('should handle decline action with confirmation', async () => {
    const mockOnSnapshot = require('firebase/firestore').onSnapshot;
    
    mockOnSnapshot.mockImplementation((docRef, callback) => {
      callback({
        exists: () => true,
        id: 'job-1',
        data: () => ({ ...mockJob, status: 'pending' }),
      });
      return () => {};
    });

    const { getByText } = render(
      <JobDetailsPanel
        visible={true}
        jobId="job-1"
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(getByText('Decline')).toBeTruthy();
    });

    const declineButton = getByText('Decline');
    fireEvent.press(declineButton);

    // Should show confirmation alert
    expect(Alert.alert).toHaveBeenCalledWith(
      'Decline Job',
      'Are you sure you want to decline this job?',
      expect.any(Array)
    );
  });

  it('should handle proof request action', async () => {
    const mockUpdateDoc = require('firebase/firestore').updateDoc;
    const mockAddDoc = require('firebase/firestore').addDoc;
    const mockOnSnapshot = require('firebase/firestore').onSnapshot;
    
    mockOnSnapshot.mockImplementation((docRef, callback) => {
      callback({
        exists: () => true,
        id: 'job-1',
        data: () => mockJob,
      });
      return () => {};
    });

    const { getByText } = render(
      <JobDetailsPanel
        visible={true}
        jobId="job-1"
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      expect(getByText('Request Proof')).toBeTruthy();
    });

    const proofButton = getByText('Request Proof');
    fireEvent.press(proofButton);

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        proofRequested: true,
        proofRequestedAt: expect.any(Date),
      })
    );

    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        jobId: 'job-1',
        action: 'proof_requested',
      })
    );
  });

  it('should display SLA timer correctly', async () => {
    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    const mockOnSnapshot = require('firebase/firestore').onSnapshot;
    
    mockOnSnapshot.mockImplementation((docRef, callback) => {
      callback({
        exists: () => true,
        id: 'job-1',
        data: () => ({
          ...mockJob,
          scheduledDate: { toDate: () => futureDate },
        }),
      });
      return () => {};
    });

    const { getByText } = render(
      <JobDetailsPanel
        visible={true}
        jobId="job-1"
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      // Should show remaining time
      expect(getByText(/remaining/)).toBeTruthy();
    });
  });

  it('should show overdue timer for past scheduled dates', async () => {
    const pastDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago
    const mockOnSnapshot = require('firebase/firestore').onSnapshot;
    
    mockOnSnapshot.mockImplementation((docRef, callback) => {
      callback({
        exists: () => true,
        id: 'job-1',
        data: () => ({
          ...mockJob,
          scheduledDate: { toDate: () => pastDate },
        }),
      });
      return () => {};
    });

    const { getByText } = render(
      <JobDetailsPanel
        visible={true}
        jobId="job-1"
        onClose={() => {}}
      />
    );

    await waitFor(() => {
      // Should show overdue time
      expect(getByText(/overdue/)).toBeTruthy();
    });
  });
});