import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/useColorScheme';
import { SettingsProvider } from '../contexts/SettingsContext';
import { AuthProvider } from '../contexts/AuthContext';
import { ClientProvider } from '../contexts/ClientContext';
import { ChatProvider } from '../contexts/ChatContext';
import notificationService from '../services/notificationService';
import SplashScreen from '../components/SplashScreen';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // Initialize notification service when app starts
    notificationService.initialize();
    
    return () => {
      // Cleanup when app closes
      notificationService.cleanup();
    };
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <AuthProvider>
      <ClientProvider>
        <ChatProvider>
          <SettingsProvider>
            <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="+not-found" options={{ headerShown: true }} />
              </Stack>
              <StatusBar style="auto" />
              {showSplash && (
                <SplashScreen onFinish={() => setShowSplash(false)} />
              )}
            </ThemeProvider>
          </SettingsProvider>
        </ChatProvider>
      </ClientProvider>
    </AuthProvider>
  );
}
