import React from 'react';
import { render } from '@testing-library/react-native';
import LiveMap from '../components/LiveMap';

// Mock react-native-maps
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return {
    __esModule: true,
    default: ({ children, ...props }: any) => <View testID="map-view" {...props}>{children}</View>,
    Marker: ({ children, ...props }: any) => <View testID="marker" {...props}>{children}</View>,
    Callout: ({ children, ...props }: any) => <View testID="callout" {...props}>{children}</View>,
  };
});

// Mock expo-location
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: {
    Balanced: 4,
  },
}));

const mockJobs = [
  {
    id: '1',
    title: 'Test Job 1',
    client: 'Test Client',
    address: '123 Test St',
    status: 'In Progress',
    latitude: -37.8136,
    longitude: 144.9631,
    assignedToName: 'John Doe'
  }
];

describe('Locate Control Parity Tests', () => {
  const mockOnJobSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render transparent locate button by default', () => {
    const { getByTestId } = render(
      <LiveMap 
        jobs={mockJobs} 
        onJobSelect={mockOnJobSelect} 
        showLocateButton={true}
      />
    );

    const locateButton = getByTestId('locate-button');
    expect(locateButton).toBeTruthy();
    
    // Check that transparent style is applied by default
    expect(locateButton.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: 'rgba(255, 255, 255, 0.9)'
        })
      ])
    );
  });

  it('should render solid locate button when specified', () => {
    const { getByTestId } = render(
      <LiveMap 
        jobs={mockJobs} 
        onJobSelect={mockOnJobSelect} 
        showLocateButton={true}
        locateButtonStyle="solid"
      />
    );

    const locateButton = getByTestId('locate-button');
    expect(locateButton).toBeTruthy();
    
    // Check that solid style is applied
    expect(locateButton.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: '#fff'
        })
      ])
    );
  });

  it('should render transparent locate button when explicitly specified', () => {
    const { getByTestId } = render(
      <LiveMap 
        jobs={mockJobs} 
        onJobSelect={mockOnJobSelect} 
        showLocateButton={true}
        locateButtonStyle="transparent"
      />
    );

    const locateButton = getByTestId('locate-button');
    expect(locateButton).toBeTruthy();
    
    // Check that transparent style is applied
    expect(locateButton.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: 'rgba(255, 255, 255, 0.9)'
        })
      ])
    );
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

  it('should handle jobs with missing location data gracefully', () => {
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
    expect(getByTestId('locate-button')).toBeTruthy();
  });

  it('should filter jobs correctly based on includePast prop', () => {
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

    // Test with includePast=false (should filter out completed jobs)
    const { getAllByTestId: getMarkersExcludePast } = render(
      <LiveMap 
        jobs={jobsWithCompleted} 
        onJobSelect={mockOnJobSelect} 
        includePast={false}
        showLocateButton={true} 
      />
    );

    const markersExcludePast = getMarkersExcludePast('marker');
    expect(markersExcludePast).toHaveLength(1); // Only the "In Progress" job

    // Test with includePast=true (should include all jobs)
    const { getAllByTestId: getMarkersIncludePast } = render(
      <LiveMap 
        jobs={jobsWithCompleted} 
        onJobSelect={mockOnJobSelect} 
        includePast={true}
        showLocateButton={true} 
      />
    );

    const markersIncludePast = getMarkersIncludePast('marker');
    expect(markersIncludePast).toHaveLength(2); // Both jobs
  });
});