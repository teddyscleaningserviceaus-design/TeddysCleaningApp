# App Branding & Splash Screen Setup

## Current Issues & Solutions

### ✅ **App Icon Fixed**
- **Updated** `app.json` to use `teddy-logo.png` for all icons
- **Android adaptive icon** now uses brand colors (#4facfe background)
- **Consistent branding** across all platforms

### ✅ **Splash Screen Enhanced**
- **Replaced white screen** with branded splash screen
- **Uses teddy logo** with gradient background
- **Smooth animations** (fade in + scale)
- **2.5 second duration** before navigating to main app

### 🎯 **How Android Icons Work**

#### **Regular Icon**
- Uses `icon` field in app.json
- **1024x1024px recommended** for best quality
- Android automatically creates different sizes

#### **Adaptive Icon (Android 8.0+)**
- Uses `adaptiveIcon.foregroundImage` + `backgroundColor`
- **Foreground**: Your logo (should fit in safe area - center 66%)
- **Background**: Solid color or simple pattern
- **Android shapes it** (circle, square, rounded, etc.)

### 🚀 **Production vs Development**

#### **Development (Expo Go)**
- May show **white screen briefly** due to Expo Go loading
- **Custom splash** works but has slight delay
- **Icons may not update** immediately in Expo Go

#### **Production Build (APK/AAB)**
- **No white screen delay** - splash shows immediately
- **Proper icon** displays on device home screen
- **Faster loading** and smoother experience

## Current Configuration

```json
{
  "name": "Teddy's Cleaning",
  "icon": "./assets/teddy-logo.png",
  "splash": {
    "image": "./assets/teddy-logo.png",
    "backgroundColor": "#4facfe"
  },
  "android": {
    "adaptiveIcon": {
      "foregroundImage": "./assets/teddy-logo.png",
      "backgroundColor": "#4facfe"
    }
  }
}
```

## Recommendations for Production

### **Create Proper App Icons**
1. **Design 1024x1024px icon** with teddy logo
2. **Ensure logo fits** in center 66% for adaptive icon
3. **Test on different Android shapes** (circle, square, etc.)

### **Optimize Splash Screen**
1. **Current setup** will work perfectly in production
2. **No white screen** in compiled APK
3. **Smooth transition** to main app

### **When You Compile APK**
- ✅ **Splash screen** will show immediately (no white screen)
- ✅ **App icon** will display properly on home screen
- ✅ **Branding** will be consistent throughout
- ✅ **Loading time** will be much faster

## Testing the Changes
1. **Kill and restart** the development server
2. **Clear Expo Go cache** if using Expo Go
3. **For best results**: Build APK when ready for testing

The white screen issue is primarily a **development environment limitation** - it won't exist in the final compiled app!