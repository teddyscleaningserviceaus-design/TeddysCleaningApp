# Firebase FCM Setup for Push Notifications

## Step 1: Generate FCM Server Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **teddys-cleaning-app**
3. Click the **Settings gear** → **Project settings**
4. Go to **Cloud Messaging** tab
5. Under **Cloud Messaging API (Legacy)**, click **Manage API in Google Cloud Console**
6. **Enable** the Cloud Messaging API if not already enabled
7. Go back to Firebase Console → **Cloud Messaging** tab
8. Copy the **Server key** (you'll need this)

## Step 2: Update app.json with FCM Configuration

Add this to your `app.json`:

```json
{
  "expo": {
    "android": {
      "googleServicesFile": "./google-services.json",
      "useNextNotificationsApi": true
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/icon.png",
          "color": "#4facfe",
          "sounds": ["./assets/sounds/notification.wav"]
        }
      ]
    ]
  }
}
```

## Step 3: Download google-services.json

1. In Firebase Console → **Project settings**
2. Go to **General** tab
3. Under **Your apps**, find your Android app
4. Click **Download google-services.json**
5. Place the file in your project root: `teddys-cleaning-app/google-services.json`

## Step 4: Update Notification Service

The notification service needs the FCM server key for sending push notifications.

## Step 5: Test Push Notifications

1. Build the app: `npx expo run:android`
2. Use the "Test Alerts" button on dashboard
3. Check device notifications when app is closed

## Troubleshooting

- **"Default FirebaseApp not initialized"**: Make sure `google-services.json` is in project root
- **No push token**: Check if FCM API is enabled in Google Cloud Console
- **Notifications not received**: Verify server key is correct and app is built (not Expo Go)

## Important Notes

- Push notifications only work on **physical devices** or **built apps**
- **Expo Go** doesn't support FCM - you need to build the app
- Test with `npx expo run:android` for full functionality