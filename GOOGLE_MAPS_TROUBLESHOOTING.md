# Google Maps API Troubleshooting

## Current Issue: Cream box with "Google" watermark

This indicates the API key is working but has restrictions or missing APIs.

## Step 1: Check Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" → "Enabled APIs"

## Step 2: Enable Required APIs

Make sure these APIs are enabled:
- ✅ Maps SDK for Android
- ✅ Maps SDK for iOS  
- ✅ Maps JavaScript API (for web)
- ✅ Places API
- ✅ Geocoding API
- ✅ Directions API

## Step 3: Check API Key Restrictions

1. Go to "APIs & Services" → "Credentials"
2. Click on your API key
3. Check "Application restrictions":
   - Should be "None" for testing
   - Or properly configured for your app

## Step 4: Check API Restrictions

In the same API key settings:
- API restrictions should include all the APIs listed above
- Or set to "Don't restrict key" for testing

## Step 5: Verify Billing

1. Go to "Billing" in Google Cloud Console
2. Make sure billing is enabled
3. Google Maps requires a billing account even for free tier

## Step 6: Test API Key

Test your API key with this URL in browser:
```
https://maps.googleapis.com/maps/api/geocode/json?address=Melbourne,Australia&key=YOUR_API_KEY
```

Replace YOUR_API_KEY with: AIzaSyDele-TeUwLAx22J_s0W-9X6LBCGcqlwZ4

## Common Solutions

1. **Remove all restrictions temporarily**
2. **Enable billing account**
3. **Wait 5-10 minutes after changes**
4. **Rebuild the app completely**

## If Still Not Working

Try creating a completely new API key with no restrictions.