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
    Balanced: 3,
  },
}));

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => <View testID="map-view" {...props} />),
    Marker: (props: any) => <View testID="marker" {...props} />,
    Callout: (props: any) => <View testID="callout" {...props} />,
  };
});

// Mock Alert
jest.spyOn(Alert, 'alert');

const mockJobs = [
  {
    id: '1',
    title: 'Test Job 1',
    client: 'Test Client',
    address: '123 Test St',
    latitude: -37.8136,
    longitude: 144.9631,
    status: 'In Progress',
    assignedToName: 'John Doe',
  },
];

const mockOnJobSelect = jest.fn();

describe('LiveMap Locate-Me Functionality', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render locate button when showLocateButton is true', () => {
    const { getByTestId } = render(
      <LiveMap 
        jobs={mockJobs} 
        onJobSelect={mockOnJobSelect}
        showLocateButton={true}
      />
    );

    expect(getByTestId('locate-button')).toBeTruthy();
  });

  it('should not render locate button when showLocateButton is false', () => {
    const { queryByTestId } = render(
      <LiveMap 
        jobs={mockJobs} 
        onJobSelect={mockOnJobSelect}
        showLocateButton={false}
      />
    );

    expect(queryByTestId('locate-button')).toBeNull();
  });

  it('should request location permission and center map on user location', async () => {
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

  it('should show permission alert when location permission is denied', async () => {
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

  it('should show error alert when location retrieval fails', async () => {
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

  it('should disable button while locating', async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockImplementation(
      () => new Promise(resolve => setTimeout(resolve, 1000))
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

    // Button should be disabled while locating
    expect(locateButton.props.accessibilityState?.disabled).toBe(true);
  });

  it('should render user location marker when location is found', async () => {
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

    const { getByTestId, getAllByTestId } = render(
      <LiveMap 
        jobs={mockJobs} 
        onJobSelect={mockOnJobSelect}
        showLocateButton={true}
      />
    );

    const locateButton = getByTestId('locate-button');
    fireEvent.press(locateButton);

    await waitFor(() => {
      const markers = getAllByTestId('marker');
      // Should have job marker + user location marker
      expect(markers.length).toBeGreaterThan(1);
    });
  });

  it('should clear user location marker after 5 seconds', async () => {
    jest.useFakeTimers();
    
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

    const { getByTestId, getAllByTestId } = render(
      <LiveMap 
        jobs={mockJobs} 
        onJobSelect={mockOnJobSelect}
        showLocateButton={true}
      />
    );

    const locateButton = getByTestId('locate-button');
    fireEvent.press(locateButton);

    await waitFor(() => {
      const markers = getAllByTestId('marker');
      expect(markers.length).toBeGreaterThan(1);
    });

    // Fast-forward 5 seconds
    jest.advanceTimersByTime(5000);

    await waitFor(() => {
      const markers = getAllByTestId('marker');
      // Should only have job markers, user location marker cleared
      expect(markers.length).toBe(1);
    });

    jest.useRealTimers();
  });

  it('should handle jobs array with proper filtering', () => {
    const jobsWithAndWithoutLocation = [
      ...mockJobs,
      {
        id: '2',
        title: 'Job without location',
        client: 'Test Client 2',
        address: '456 Test Ave',
        status: 'Pending',
      },
    ];

    const { getAllByTestId } = render(
      <LiveMap 
        jobs={jobsWithAndWithoutLocation} 
        onJobSelect={mockOnJobSelect}
        showLocateButton={true}
      />
    );

    const markers = getAllByTestId('marker');
    // Should only render markers for jobs with coordinates
    expect(markers.length).toBe(1);
  });
});