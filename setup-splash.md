# Splash Screen Setup

## Current Implementation:
- Uses existing `teddy-logo.png` from assets
- Shows for 3 seconds on app launch
- Blue gradient background matching app theme
- No dependencies required

## To use your video:
1. Convert video to small GIF (under 1MB)
2. Replace `teddy-logo.png` with `splash-animation.gif` in the component
3. Adjust timing if needed

## Video size reduction tips:
- Reduce dimensions to 400x400px or smaller
- Lower frame rate to 10-15 fps
- Use online tools like ezgif.com or ffmpeg:
  ```
  ffmpeg -i input.mp4 -vf "scale=400:400,fps=12" -t 3 output.gif
  ```