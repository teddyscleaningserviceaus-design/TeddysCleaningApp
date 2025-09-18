# FCM Setup Troubleshooting

## Alternative Method to Enable FCM

### Option 1: Direct Google Cloud Console Access
1. Go directly to: https://console.cloud.google.com/
2. Select project: **teddys-cleaning-app**
3. In the search bar, type: **Firebase Cloud Messaging API**
4. Click on **Firebase Cloud Messaging API** result
5. Click **ENABLE** button

### Option 2: Use Firebase CLI
```bash
# Install Firebase CLI if not installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Enable FCM API
firebase projects:list
firebase use teddys-cleaning-app
```

### Option 3: Skip Server Key for Now
The modern approach doesn't require the legacy server key. We can use:
- **Firebase Admin SDK** (server-side)
- **Expo Push Service** (handles FCM automatically)

## Quick Fix: Use Expo Push Service

Instead of direct FCM, we can use Expo's push service which handles FCM automatically:

1. **Download google-services.json** from Firebase Console
2. **Place in project root**
3. **Build the app**: `npx expo run:android`
4. **Expo handles FCM automatically**

## Browser Issues Fix

If Google Cloud Console won't load:
1. **Clear browser cache**
2. **Try incognito mode**
3. **Try different browser** (Chrome, Firefox, Edge)
4. **Disable browser extensions**
5. **Check internet connection**

## Verify FCM is Working

After placing google-services.json:
```bash
npx expo run:android
```

Check logs for:
- ✅ "Push token obtained: ExponentPushToken[...]"
- ✅ "Notification service initialized"

## Alternative: Test Without FCM

The app will work with local notifications even without FCM:
- Notifications when app is **open**
- Location tracking still works
- Test simulation still functions

FCM only adds notifications when app is **closed**.