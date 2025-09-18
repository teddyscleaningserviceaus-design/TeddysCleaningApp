# Google Maps API Setup Instructions

## 1. Get Google Maps API Keys

### Step 1: Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Create a new project or select existing project

### Step 2: Enable APIs
Enable these APIs for your project:
- **Maps SDK for Android**
- **Maps SDK for iOS** 
- **Maps JavaScript API** (for web)

### Step 3: Create API Keys
1. Go to "Credentials" in the left sidebar
2. Click "Create Credentials" → "API Key"
3. Create separate keys for Android and iOS (recommended for security)

### Step 4: Restrict API Keys (Important for Security)
**Android Key:**
- Application restrictions: Android apps
- Add your app's package name and SHA-1 certificate fingerprint

**iOS Key:**
- Application restrictions: iOS apps  
- Add your app's bundle identifier

## 2. Add Keys to Your App

### Update app.json
Replace the placeholder values in `app.json`:
```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMapsApiKey": "AIzaSyC4YjA12345678901234567890123456789"
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "AIzaSyD5ZjB98765432109876543210987654321"
        }
      }
    }
  }
}
```

### Environment Variables (Recommended)
Create `.env` file in project root:
```
GOOGLE_MAPS_ANDROID_API_KEY=your_android_key_here
GOOGLE_MAPS_IOS_API_KEY=your_ios_key_here
```

Then update app.json to use environment variables:
```json
{
  "expo": {
    "ios": {
      "config": {
        "googleMapsApiKey": "${GOOGLE_MAPS_IOS_API_KEY}"
      }
    },
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "${GOOGLE_MAPS_ANDROID_API_KEY}"
        }
      }
    }
  }
}
```

## 3. Security Best Practices

### API Key Restrictions
- **Never commit API keys to version control**
- Use different keys for development and production
- Restrict keys to specific apps/domains
- Monitor API usage in Google Cloud Console

### Rate Limiting
- Set daily quotas to prevent unexpected charges
- Monitor usage patterns
- Consider implementing client-side caching

## 4. Testing

### Development
- Use Expo Go app for initial testing
- API keys work automatically in development

### Production
- Build standalone app with `expo build`
- Test on physical devices
- Verify maps load correctly

## 5. Troubleshooting

### Common Issues
- **Maps not loading**: Check API key configuration
- **Gray screen**: Verify API is enabled in Google Cloud
- **Authentication errors**: Check key restrictions

### Debug Steps
1. Check Expo/React Native logs
2. Verify API key in Google Cloud Console
3. Ensure correct bundle ID/package name
4. Check API quotas and billing

## 6. Cost Considerations

### Free Tier
- Google provides $200 monthly credit
- Covers ~28,000 map loads per month
- Monitor usage to avoid charges

### Optimization
- Implement map caching
- Use static maps for thumbnails
- Limit map interactions when possible

## Current Implementation

The app uses Google Maps for:
- **Job site locations** on interactive map
- **Melbourne-centered view** as default
- **Color-coded pins** for job status
- **Callout information** with job details
- **Navigation integration** for directions

Maps are integrated in:
- `app/(tabs)/jobs.tsx` - Main job map view
- `app/job-details/[id].tsx` - Individual job location
- `app/schedule.tsx` - Calendar with location context