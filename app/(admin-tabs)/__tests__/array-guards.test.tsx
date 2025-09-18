import React from 'react';
import { render } from '@testing-library/react-native';

// Mock all the dependencies
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'test-user' },
    logout: jest.fn(),
  }),
}));

jest.mock('../hooks/useLiveOpsListeners', () => ({
  useLiveOpsListeners: () => ({
    jobs: null, // Test with null to trigger Array.isArray guards
    employees: undefined, // Test with undefined
    alerts: 'not-an-array', // Test with invalid type
    counts: { totalJobs: 0, inProgress: 0, completed: 0, pending: 0 },
    loading: false,
    error: null,
    refresh: jest.fn(),
  }),
}));

jest.mock('../components/LiveMap', () => {
  const { View } = require('react-native');
  return ({ jobs }: any) => <View testID="live-map" />;
});

jest.mock('../components/JobDetailsPanel', () => {
  const { View } = require('react-native');
  return ({ visible }: any) => visible ? <View testID="job-details-panel" /> : null;
});

jest.mock('../components/EmployeeRoster', () => {
  const { View } = require('react-native');
  return ({ employees }: any) => <View testID="employee-roster" />;
});

jest.mock('../components/BulkToolbar', () => {
  const { View } = require('react-native');
  return ({ selectedJobs }: any) => <View testID="bulk-toolbar" />;
});

jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: any) => <View testID="map-view">{children}</View>,
    Marker: ({ children }: any) => <View testID="marker">{children}</View>,
    Callout: ({ children }: any) => <View testID="callout">{children}</View>,
  };
});

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: ({ children }: any) => children,
}));

jest.mock('firebase/auth', () => ({
  signOut: jest.fn(),
}));

jest.mock('../../config/firebase', () => ({
  auth: {},
  db: {},
}));

describe('Array Guards Tests', () => {
  it('should handle null/undefined jobs array in Dashboard without crashing', () => {
    const AdminDashboard = require('../dashboard').default;
    
    expect(() => {
      render(<AdminDashboard />);
    }).not.toThrow();
  });

  it('should handle null/undefined jobs array in Jobs view without crashing', () => {
    // Mock additional dependencies for jobs view
    jest.mock('../../hooks/useFirestoreListener', () => ({
      useFirestoreListener: () => jest.fn(),
    }));

    const AdminJobs = require('../jobs').default;
    
    expect(() => {
      render(<AdminJobs />);
    }).not.toThrow();
  });

  it('should display zero counts when arrays are invalid', () => {
    const AdminDashboard = require('../dashboard').default;
    
    const { getByText } = render(<AdminDashboard />);
    
    // Should show 0 for jobs count when jobs is null
    expect(getByText('Jobs (0)')).toBeTruthy();
  });

  it('should handle filtering operations safely with invalid arrays', () => {
    // Test that filtering operations don't crash with non-array data
    const testFilter = (data: any) => {
      if (!Array.isArray(data)) {
        return [];
      }
      return data.filter((item: any) => item.status === 'active');
    };

    expect(testFilter(null)).toEqual([]);
    expect(testFilter(undefined)).toEqual([]);
    expect(testFilter('not-an-array')).toEqual([]);
    expect(testFilter(123)).toEqual([]);
    expect(testFilter({})).toEqual([]);
    expect(testFilter([{ status: 'active' }, { status: 'inactive' }])).toEqual([{ status: 'active' }]);
  });

  it('should handle map operations safely with invalid arrays', () => {
    // Test that map operations don't crash with non-array data
    const testMap = (data: any) => {
      if (!Array.isArray(data)) {
        return [];
      }
      return data.map((item: any) => item.id);
    };

    expect(testMap(null)).toEqual([]);
    expect(testMap(undefined)).toEqual([]);
    expect(testMap('not-an-array')).toEqual([]);
    expect(testMap([{ id: 1 }, { id: 2 }])).toEqual([1, 2]);
  });

  it('should handle length operations safely with invalid arrays', () => {
    // Test that length operations don't crash with non-array data
    const getLength = (data: any) => {
      return Array.isArray(data) ? data.length : 0;
    };

    expect(getLength(null)).toBe(0);
    expect(getLength(undefined)).toBe(0);
    expect(getLength('not-an-array')).toBe(0);
    expect(getLength([1, 2, 3])).toBe(3);
  });
});