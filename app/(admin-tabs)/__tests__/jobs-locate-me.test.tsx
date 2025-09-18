import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import LiveMap from '../components/LiveMap';

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 4,
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

// Mock MapView
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  const MockMapView = React.forwardRef((props: any, ref: any) => {
    React.useImperativeHandle(ref, () => ({
      animateToRegion: jest.fn(),
    }));
    return <View testID="map-view" {...props} />;
  });
  
  return {
    __esModule: true,
    default: MockMapView,
    Marker: ({ children, ...props }: any) => <View testID="marker" {...props}>{children}</View>,
    Callout: ({ children, ...props }: any) => <View testID="callout" {...props}>{children}</View>,
  };
});

describe('Jobs LiveMap Locate-Me Functionality', () => {
  const mockJobs = [
    {
      id: '1',
      title: 'Test Job',
      client: 'Test Client',
      address: '123 Test St',
      latitude: -37.8136,
      longitude: 144.9631,
      status: 'In Progress',
      assignedToName: 'John Doe',
    },
  ];

  const mockOnJobSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders locate button when showLocateButton is true', () => {
    const { getByTestId } = render(
      <LiveMap 
        jobs={mockJobs} 
        onJobSelect={mockOnJobSelect} 
        showLocateButton={true} 
      />
    );

    expect(getByTestId('locate-button')).toBeTruthy();
  });

  it('does not render locate button when showLocateButton is false', () => {
    const { queryByTestId } = render(
      <LiveMap 
        jobs={mockJobs} 
        onJobSelect={mockOnJobSelect} 
        showLocateButton={false} 
      />
    );

    expect(queryByTestId('locate-button')).toBeNull();
  });

  it('requests location permission and centers map on user location', async () => {
    const mockLocation = {
      coords: {
        latitude: -37.8200,
        longitude: 144.9700,
      },
    };

    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue(mockLocation);

    const { getByTestId } = render(
      <LiveMap 
        jobs={mockJobs} 
        onJobSelect={mockOnJobSelect} 
        showLocateButton={true} 
      />
    );

    const locateButton = getByTestId('locate-button');
    fireEvent.press(locateButton);

    await waitFor(() => {
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalled();
      expect(Location.getCurrentPositionAsync).toHaveBeenCalledWith({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 5000,
      });
    });
  });

  it('shows permission alert when location permission is denied', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'denied',
    });

    const { getByTestId } = render(
      <LiveMap 
        jobs={mockJobs} 
        onJobSelect={mockOnJobSelect} 
        showLocateButton={true} 
      />
    );

    const locateButton = getByTestId('locate-button');
    fireEvent.press(locateButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Location Permission Required',
        'Please enable location permissions to use this feature.',
        expect.any(Array)
      );
    });
  });

  it('shows error alert when location retrieval fails', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockRejectedValue(
      new Error('Location unavailable')
    );

    const { getByTestId } = render(
      <LiveMap 
        jobs={mockJobs} 
        onJobSelect={mockOnJobSelect} 
        showLocateButton={true} 
      />
    );

    const locateButton = getByTestId('locate-button');
    fireEvent.press(locateButton);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Location Error',
        'Unable to get your current location. Please check your location settings.',
        [{ text: 'OK' }]
      );
    });
  });

  it('prevents multiple simultaneous location requests', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({ status: 'granted' }), 100))
    );

    const { getByTestId } = render(
      <LiveMap 
        jobs={mockJobs} 
        onJobSelect={mockOnJobSelect} 
        showLocateButton={true} 
      />
    );

    const locateButton = getByTestId('locate-button');
    
    // Press button multiple times quickly
    fireEvent.press(locateButton);
    fireEvent.press(locateButton);
    fireEvent.press(locateButton);

    await waitFor(() => {
      // Should only call permission request once
      expect(Location.requestForegroundPermissionsAsync).toHaveBeenCalledTimes(1);
    });
  });

  it('handles jobs with missing location data gracefully', () => {
    const jobsWithMissingLocation = [
      ...mockJobs,
      {
        id: '2',
        title: 'Job Without Location',
        client: 'Test Client 2',
        address: '456 Test Ave',
        status: 'Pending',
        // Missing latitude/longitude
      },
    ];

    const { getByTestId } = render(
      <LiveMap 
        jobs={jobsWithMissingLocation} 
        onJobSelect={mockOnJobSelect} 
        showLocateButton={true} 
      />
    );

    // Should render without crashing
    expect(getByTestId('map-view')).toBeTruthy();
  });

  it('filters completed jobs when includePast is false', () => {
    const jobsWithCompleted = [
      ...mockJobs,
      {
        id: '2',
        title: 'Completed Job',
        client: 'Test Client 2',
        address: '456 Test Ave',
        latitude: -37.8150,
        longitude: 144.9650,
        status: 'Completed',
        assignedToName: 'Jane Doe',
      },
    ];

    const { getAllByTestId } = render(
      <LiveMap 
        jobs={jobsWithCompleted} 
        onJobSelect={mockOnJobSelect} 
        includePast={false}
        showLocateButton={true} 
      />
    );

    // Should only render markers for non-completed jobs
    const markers = getAllByTestId('marker');
    expect(markers).toHaveLength(1); // Only the "In Progress" job
  });

  it('includes completed jobs when includePast is true', () => {
    const jobsWithCompleted = [
      ...mockJobs,
      {
        id: '2',
        title: 'Completed Job',
        client: 'Test Client 2',
        address: '456 Test Ave',
        latitude: -37.8150,
        longitude: 144.9650,
        status: 'Completed',
        assignedToName: 'Jane Doe',
      },
    ];

    const { getAllByTestId } = render(
      <LiveMap 
        jobs={jobsWithCompleted} 
        onJobSelect={mockOnJobSelect} 
        includePast={true}
        showLocateButton={true} 
      />
    );

    // Should render markers for all jobs
    const markers = getAllByTestId('marker');
    expect(markers).toHaveLength(2); // Both jobs
  });
});