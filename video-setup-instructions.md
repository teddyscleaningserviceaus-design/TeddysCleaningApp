# Video Splash Screen Setup

## 1. Install expo-video dependency
Run this command in your project directory:
```bash
npm install expo-video --legacy-peer-deps
```

## 2. Your video file
- Make sure `splash-video.mp4` is in the `assets/` folder
- The video will play with audio for 8 seconds
- Automatically ends when video finishes playing

## Features:
- ✅ Video with audio support
- ✅ Smaller file size than GIF
- ✅ Auto-ends when video completes
- ✅ Proper screen scaling (90% width, 70% height)
- ✅ Black background for better contrast

## If installation fails:
Try force installation:
```bash
npm install expo-video --force
```

The splash screen will now use your MP4 video with audio instead of the silent GIF.