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
  },
  {
    id: '2',
    title: 'Test Job 2',
    client: 'Test Client 2',
    address: '456 Test Ave',
    status: 'Completed',
    latitude: -37.8200,
    longitude: 144.9700,
    assignedToName: 'Jane Smith'
  }
];

describe('LiveMap', () => {
  const mockOnJobSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders MapView instead of placeholder', () => {
    const { getByTestId, queryByText } = render(
      <LiveMap jobs={mockJobs} onJobSelect={mockOnJobSelect} />
    );

    // Should render actual MapView
    expect(getByTestId('map-view')).toBeTruthy();
    
    // Should NOT render placeholder text
    expect(queryByText('Live Map View')).toBeNull();
  });

  it('renders markers for jobs with coordinates', () => {
    const { getAllByTestId } = render(
      <LiveMap jobs={mockJobs} onJobSelect={mockOnJobSelect} />
    );

    const markers = getAllByTestId('marker');
    expect(markers).toHaveLength(2);
  });

  it('filters completed jobs when includePast is false', () => {
    const { getAllByTestId } = render(
      <LiveMap jobs={mockJobs} onJobSelect={mockOnJobSelect} includePast={false} />
    );

    // Should only show 1 marker (In Progress job)
    const markers = getAllByTestId('marker');
    expect(markers).toHaveLength(1);
  });

  it('shows all jobs when includePast is true', () => {
    const { getAllByTestId } = render(
      <LiveMap jobs={mockJobs} onJobSelect={mockOnJobSelect} includePast={true} />
    );

    // Should show both markers
    const markers = getAllByTestId('marker');
    expect(markers).toHaveLength(2);
  });

  it('renders legend with status colors', () => {
    const { getByText } = render(
      <LiveMap jobs={mockJobs} onJobSelect={mockOnJobSelect} />
    );

    expect(getByText('In Progress')).toBeTruthy();
    expect(getByText('Completed')).toBeTruthy();
    expect(getByText('Pending')).toBeTruthy();
    expect(getByText('Scheduled')).toBeTruthy();
  });

  it('filters out jobs without coordinates', () => {
    const jobsWithoutCoords = [
      ...mockJobs,
      {
        id: '3',
        title: 'No Coords Job',
        client: 'Test Client 3',
        address: '789 Test Blvd',
        status: 'Pending'
        // No latitude/longitude
      }
    ];

    const { getAllByTestId } = render(
      <LiveMap jobs={jobsWithoutCoords} onJobSelect={mockOnJobSelect} includePast={true} />
    );

    // Should still only show 2 markers (jobs with coordinates)
    const markers = getAllByTestId('marker');
    expect(markers).toHaveLength(2);
  });
});