import React from 'react';
import { render } from '@testing-library/react-native';
import { Tabs } from 'expo-router';

// Mock expo-router
jest.mock('expo-router', () => ({
  Tabs: {
    Screen: ({ name, options }: any) => null,
  },
}));

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({
  GestureHandlerRootView: ({ children }: any) => children,
}));

// Mock vector icons
jest.mock('@expo/vector-icons', () => ({
  AntDesign: () => null,
  Feather: () => null,
  MaterialCommunityIcons: () => null,
}));

describe('Navigation Cleanup Tests', () => {
  it('should have correct tab configuration', () => {
    // Import the layout component
    const AdminTabsLayout = require('../_layout').default;
    
    // Mock Tabs.Screen to capture the configuration
    const screenConfigs: any[] = [];
    const mockTabsScreen = jest.fn(({ name, options }) => {
      screenConfigs.push({ name, options });
      return null;
    });
    
    // Replace Tabs.Screen with our mock
    (Tabs as any).Screen = mockTabsScreen;
    
    // Render the layout
    render(<AdminTabsLayout />);
    
    // Check that we have the expected screens
    const screenNames = screenConfigs.map(config => config.name);
    expect(screenNames).toContain('dashboard');
    expect(screenNames).toContain('jobs');
    expect(screenNames).toContain('messaging');
    expect(screenNames).toContain('employees');
    expect(screenNames).toContain('news');
    
    // Check that news tab is hidden
    const newsConfig = screenConfigs.find(config => config.name === 'news');
    expect(newsConfig).toBeDefined();
    expect(newsConfig.options.tabBarButton).toBeDefined();
    expect(typeof newsConfig.options.tabBarButton).toBe('function');
    expect(newsConfig.options.tabBarButton()).toBeNull();
    
    // Check that visible tabs have proper configuration
    const visibleTabs = ['dashboard', 'jobs', 'messaging', 'employees'];
    visibleTabs.forEach(tabName => {
      const config = screenConfigs.find(config => config.name === tabName);
      expect(config).toBeDefined();
      expect(config.options.title).toBeDefined();
      expect(config.options.tabBarIcon).toBeDefined();
      expect(typeof config.options.tabBarIcon).toBe('function');
    });
  });

  it('should have correct tab titles', () => {
    const AdminTabsLayout = require('../_layout').default;
    
    const screenConfigs: any[] = [];
    const mockTabsScreen = jest.fn(({ name, options }) => {
      screenConfigs.push({ name, options });
      return null;
    });
    
    (Tabs as any).Screen = mockTabsScreen;
    render(<AdminTabsLayout />);
    
    const expectedTitles = {
      dashboard: 'Dashboard',
      jobs: 'Jobs',
      messaging: 'Messages',
      employees: 'Team'
    };
    
    Object.entries(expectedTitles).forEach(([name, expectedTitle]) => {
      const config = screenConfigs.find(config => config.name === name);
      expect(config.options.title).toBe(expectedTitle);
    });
  });

  it('should have proper tab bar styling', () => {
    const AdminTabsLayout = require('../_layout').default;
    
    // Mock Tabs component to capture screenOptions
    let capturedScreenOptions: any = null;
    const mockTabs = jest.fn(({ screenOptions, children }) => {
      capturedScreenOptions = screenOptions;
      return children;
    });
    
    (Tabs as any) = mockTabs;
    (Tabs as any).Screen = jest.fn(() => null);
    
    render(<AdminTabsLayout />);
    
    expect(capturedScreenOptions).toBeDefined();
    expect(capturedScreenOptions.tabBarActiveTintColor).toBe('#4facfe');
    expect(capturedScreenOptions.tabBarInactiveTintColor).toBe('#9ca3af');
    expect(capturedScreenOptions.headerShown).toBe(false);
    
    // Check tab bar style
    const tabBarStyle = capturedScreenOptions.tabBarStyle;
    expect(tabBarStyle.backgroundColor).toBe('#fff');
    expect(tabBarStyle.height).toBe(65);
  });
});