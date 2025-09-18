# Fix Splash Screen Issues

## Current Status:
- GIF splash screen is set up in `components/SplashScreen.tsx`
- Should show for 8 seconds when app opens
- Sized to 80% width, 60% height with black background

## If GIF isn't playing:

### Option 1: Use Video (with audio)
```bash
npm install expo-av --legacy-peer-deps
```
Then replace in `app/_layout.tsx`:
```tsx
import VideoSplashScreen from '../components/VideoSplashScreen';
// Replace SplashScreen with VideoSplashScreen
```

### Option 2: Reduce GIF size
Your 5MB GIF is too large. Reduce it:
```bash
# Using ffmpeg to make smaller GIF
ffmpeg -i splash-video.mp4 -vf "scale=400:600,fps=10" -t 8 splash-animation.gif
```

### Option 3: Test current setup
1. Make sure `splash-animation.gif` is in `assets/` folder
2. Close app completely (not just minimize)
3. Reopen app - splash should show for 8 seconds

## File locations:
- `assets/splash-animation.gif` (for GIF version)
- `assets/splash-video.mp4` (for video version)
- Both should be under 2MB for best performance