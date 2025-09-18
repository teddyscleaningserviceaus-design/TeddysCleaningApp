# Enable Google Directions API

## Steps to Fix "This API key is not authorized to use this service or API" Error

### 1. Go to Google Cloud Console
- Visit: https://console.cloud.google.com/
- Select your project: `teddys-cleaning-app`

### 2. Enable Directions API
1. Go to **APIs & Services** → **Library**
2. Search for "**Directions API**"
3. Click on "**Directions API**" 
4. Click "**ENABLE**"

### 3. Update API Key Restrictions (Optional but Recommended)
1. Go to **APIs & Services** → **Credentials**
2. Click on your API key: `AIzaSyD-ZSDsExijWGcVsALHSE9m7K5009vQvH4`
3. Under **API restrictions**, select "**Restrict key**"
4. Check these APIs:
   - ✅ Maps SDK for Android
   - ✅ Maps SDK for iOS
   - ✅ Maps JavaScript API
   - ✅ **Directions API** (newly added)
5. Click **Save**

### 4. Test the Navigation
- Open the app
- Navigate to a job from the employee jobs tab
- The route should now display properly

## What This Enables
- **Turn-by-turn route visualization** on the map
- **Accurate distance and duration** calculations
- **Optimized routing** for driving directions
- **Real-time navigation guidance** to job sites

## Cost Considerations
- Directions API: $5 per 1,000 requests
- With $200 monthly credit, you get ~40,000 direction requests free
- Typical usage: 10-50 requests per day for employees

## Fallback Behavior
If the Directions API fails:
- App automatically falls back to straight-line distance
- Still shows estimated time (2 min per km)
- Map still displays start/end markers
- No app crashes or errors