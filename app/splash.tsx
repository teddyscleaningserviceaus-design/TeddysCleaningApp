import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  StatusBar,
  StyleSheet,
  View,
} from "react-native";
import IntroAnimation from "../components/IntroAnimation";

export default function SplashScreen() {
  const router = useRouter();
  const [showVideo, setShowVideo] = useState(true);

  const handleIntroComplete = () => {
    setShowVideo(false);
    router.replace("/");
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#4facfe" translucent={false} />
      
      {showVideo && (
        <IntroAnimation onComplete={handleIntroComplete} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4facfe",
  },
});