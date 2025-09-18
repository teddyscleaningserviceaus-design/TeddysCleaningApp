# Android Studio Setup for Google Maps Testing

## 1. Open Project in Android Studio

1. **Open Android Studio**
2. **Open an Existing Project**
3. **Navigate to:** `C:\Users\Tewedros\teddys-cleaning-app\android`
4. **Click "Open"**

## 2. Configure Google Maps API Key

Your API key is already configured in `app.json`:
```
AIzaSyD-ZSDsExijWGcVsALHSE9m7K5009vQvH4
```

**Important:** This key needs to be restricted in Google Cloud Console:
- Go to: https://console.cloud.google.com/apis/credentials
- Find your API key
- Add restriction: **Android apps**
- Package name: `com.teddyscleaning.app`
- SHA-1 certificate fingerprint (get from Android Studio)

## 3. Get SHA-1 Fingerprint

In Android Studio terminal, run:
```bash
cd android
./gradlew signingReport
```

Copy the SHA-1 fingerprint and add it to your Google Cloud Console API key restrictions.

## 4. Enable Required APIs

In Google Cloud Console, enable:
- **Maps SDK for Android**
- **Places API** (optional, for address autocomplete)

## 5. Build and Run

1. **Connect Android device** or **start emulator**
2. **Click "Run" button** in Android Studio
3. **Select your device/emulator**

## 6. Test Google Maps Features

The app includes:
- **Map View Toggle** in Jobs page
- **Job location pins** with status colors
- **Interactive callouts** with job details
- **Melbourne-centered map** as default view

## 7. Troubleshooting

### Maps not loading:
- Check API key is correct
- Verify API restrictions match package name
- Ensure Maps SDK for Android is enabled

### Build errors:
- Clean project: `Build > Clean Project`
- Rebuild: `Build > Rebuild Project`
- Sync Gradle: `File > Sync Project with Gradle Files`

### Device connection:
- Enable Developer Options on device
- Enable USB Debugging
- Install device drivers if needed

## 8. Testing Map Features

1. **Navigate to Jobs page**
2. **Toggle to Map View**
3. **Add jobs with coordinates** using the form
4. **View pins on Melbourne map**
5. **Tap pins for job details**

## 9. Adding Test Data

Use the sample jobs in `sample-jobs.js` or create jobs through the app with Melbourne coordinates:
- Melbourne CBD: `-37.8136, 144.9631`
- Southbank: `-37.8226, 144.9648`
- Richmond: `-37.8197, 144.9937`

## 10. Development Workflow

1. **Make changes** in VS Code
2. **Save files**
3. **Metro bundler** will reload automatically
4. **Test on device/emulator**

The Android project is now ready for Google Maps testing!