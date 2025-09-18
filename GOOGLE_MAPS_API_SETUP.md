# Google Maps API Setup Instructions

## 1. Get Google Maps API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Enable the following APIs:
   - Maps SDK for Android
   - Maps SDK for iOS
   - Places API
   - Geocoding API
   - Directions API

4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy your API key

## 2. Configure API Key Restrictions (Recommended)

1. Click on your API key in the credentials list
2. Under "Application restrictions":
   - For Android: Select "Android apps" and add your package name and SHA-1 certificate fingerprint
   - For iOS: Select "iOS apps" and add your bundle identifier
3. Under "API restrictions": Select "Restrict key" and choose the APIs you enabled above

## 3. Update Your App Files

### Update app.json
```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_GOOGLE_MAPS_API_KEY_HERE"
        }
      }
    },
    "ios": {
      "config": {
        "googleMapsApiKey": "YOUR_GOOGLE_MAPS_API_KEY_HERE"
      }
    }
  }
}
```

### Update .env file
```
GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY_HERE
```

## 4. Files to Update with API Key

### For Address Validation (employee-setup-new.tsx)
Replace line with Google API call:
```javascript
// Replace this line:
response = await fetch(
  `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formData.fullAddress + ', Australia')}&key=YOUR_GOOGLE_API_KEY`
);

// With:
response = await fetch(
  `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(formData.fullAddress + ', Australia')}&key=${process.env.GOOGLE_MAPS_API_KEY}`
);
```

### For Map Components
Update any MapView components in these files:
- `app/(employee-tabs)/jobs.tsx`
- `app/(admin-tabs)/dashboard.tsx` 
- Any other files using maps

Example MapView configuration:
```javascript
import MapView, { Marker } from 'react-native-maps';

<MapView
  style={styles.map}
  initialRegion={{
    latitude: -37.8136,
    longitude: 144.9631,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  }}
  provider="google" // Add this line
>
  <Marker
    coordinate={{ latitude: -37.8136, longitude: 144.9631 }}
    title="Job Location"
  />
</MapView>
```

## 5. Install Required Dependencies

```bash
npm install react-native-maps
# For Expo managed workflow:
expo install react-native-maps
```

## 6. Test the Setup

1. Rebuild your app after making these changes
2. Test address validation in employee setup
3. Test map display in job locations
4. Verify markers and directions work properly

## Troubleshooting

- **Cream/blank map**: Usually means API key is missing or incorrect
- **"For development purposes only" watermark**: API key restrictions are too strict
- **Map not loading**: Check if Maps SDK is enabled for your platform
- **Address validation failing**: Ensure Geocoding API is enabled

## Cost Considerations

- Google Maps has usage limits and pricing
- Consider implementing usage limits in your app
- Monitor usage in Google Cloud Console
- Set up billing alerts to avoid unexpected charges