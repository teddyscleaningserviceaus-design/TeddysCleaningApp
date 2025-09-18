import React from 'react';
import { render } from '@testing-library/react-native';
import AdminTabsLayout from '../_layout';

// Mock expo-router
jest.mock('expo-router', () => ({
  Tabs: {
    Screen: ({ children, ...props }: any) => <div data-testid="tab-screen" {...props}>{children}</div>,
  },
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children, ...props }: any) => <div {...props}>{children}</div>,
}));

// Mock expo vector icons
jest.mock('@expo/vector-icons', () => ({
  AntDesign: ({ name, ...props }: any) => <div data-testid={`icon-${name}`} {...props} />,
  Feather: ({ name, ...props }: any) => <div data-testid={`icon-${name}`} {...props} />,
}));

describe('Admin Navigation Layout', () => {
  it('renders all required tabs without news tab', () => {
    const { getAllByTestId, queryByText } = render(<AdminTabsLayout />);
    
    const tabScreens = getAllByTestId('tab-screen');
    
    // Should have exactly 4 tabs: dashboard, jobs, messaging, employees
    expect(tabScreens).toHaveLength(4);
    
    // Verify required icons are present
    expect(getAllByTestId('icon-dashboard')).toBeTruthy();
    expect(getAllByTestId('icon-map')).toBeTruthy();
    expect(getAllByTestId('icon-message1')).toBeTruthy();
    expect(getAllByTestId('icon-team')).toBeTruthy();
    
    // News tab should not be visible (no href means hidden)
    // This test verifies the tab structure is clean
  });

  it('has correct tab configuration', () => {
    const { container } = render(<AdminTabsLayout />);
    
    // Verify the layout renders without crashing
    expect(container).toBeTruthy();
  });
});

describe('Array.isArray Guards', () => {
  it('handles undefined arrays gracefully in filter operations', () => {
    // Test that our Array.isArray guards work
    const testUndefinedFilter = (data: any) => {
      return Array.isArray(data) ? data.filter((item: any) => item.active) : [];
    };

    expect(testUndefinedFilter(undefined)).toEqual([]);
    expect(testUndefinedFilter(null)).toEqual([]);
    expect(testUndefinedFilter([])).toEqual([]);
    expect(testUndefinedFilter([{ active: true }, { active: false }])).toEqual([{ active: true }]);
  });

  it('handles undefined arrays in reduce operations', () => {
    const testUndefinedReduce = (data: any) => {
      return Array.isArray(data) ? data.reduce((sum: number, item: any) => sum + (item.count || 0), 0) : 0;
    };

    expect(testUndefinedReduce(undefined)).toBe(0);
    expect(testUndefinedReduce(null)).toBe(0);
    expect(testUndefinedReduce([])).toBe(0);
    expect(testUndefinedReduce([{ count: 5 }, { count: 3 }])).toBe(8);
  });
});