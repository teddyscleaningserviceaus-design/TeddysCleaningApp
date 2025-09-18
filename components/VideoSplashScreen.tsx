import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';

const { width, height } = Dimensions.get('window');

interface SplashScreenProps {
  onFinish: () => void;
}

export default function VideoSplashScreen({ onFinish }: SplashScreenProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    // Force install expo-av with legacy peer deps
    const timer = setTimeout(() => {
      setVisible(false);
      onFinish();
    }, 8000);

    return () => clearTimeout(timer);
  }, [onFinish]);

  if (!visible) return null;

  // This will require: npm install expo-av --legacy-peer-deps
  try {
    const { Video, ResizeMode } = require('expo-av');
    
    return (
      <View style={styles.container}>
        <Video
          source={require('../assets/splash-video.mp4')}
          style={styles.video}
          shouldPlay
          isLooping={false}
          resizeMode={ResizeMode.CONTAIN}
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded && status.didJustFinish) {
              setVisible(false);
              onFinish();
            }
          }}
        />
      </View>
    );
  } catch (error) {
    // Fallback to GIF if expo-av not installed
    const { Image } = require('react-native');
    
    return (
      <View style={styles.container}>
        <Image
          source={require('../assets/splash-animation.gif')}
          style={styles.video}
          resizeMode="contain"
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    width,
    height,
    backgroundColor: '#000',
    zIndex: 9999,
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: width * 0.9,
    height: height * 0.7,
  },
});