# Setup Instructions for Splash Video

## 1. Install expo-av dependency
```bash
npx expo install expo-av
```

## 2. Add your video file
- Place your 4.2MB video file in: `assets/splash-video.mp4`
- Supported formats: MP4, MOV, M4V

## 3. Optional: Fallback for GIF
If you prefer GIF instead of video, replace the Video component with:
```tsx
import { Image } from 'react-native';

// Replace Video component with:
<Image 
  source={require('../assets/splash-animation.gif')} 
  style={styles.video}
/>
```

## Features:
- Plays automatically when app opens
- Includes audio support
- Fades out smoothly after 8 seconds
- Doesn't interfere with app functionality
- Overlay covers entire screen during playback