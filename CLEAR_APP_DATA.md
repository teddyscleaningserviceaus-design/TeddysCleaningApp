# How to Clear App Data

## Method 1: Android Settings (Recommended)
1. **Go to Android Settings**
2. **Apps & notifications** (or "Apps")
3. **Find "Expo Go"** in the list
4. **Tap on Expo Go**
5. **Storage & cache**
6. **Clear Storage** (this clears all data)
7. **Clear Cache** (optional, but recommended)

## Method 2: Uninstall/Reinstall App
1. **Long press** the app icon
2. **Uninstall** the app
3. **Reinstall** from Play Store
4. **Run** `npx expo run:android` again

## Method 3: Clear AsyncStorage (Code Method)
Add this temporary button to your app:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

const clearAllData = async () => {
  try {
    await AsyncStorage.clear();
    console.log('AsyncStorage cleared');
  } catch (error) {
    console.error('Error clearing AsyncStorage:', error);
  }
};
```

## Method 4: Firebase Auth Sign Out
```typescript
import { signOut } from 'firebase/auth';
import { auth } from './config/firebase';

await signOut(auth);
```

## Method 5: Development Reset
```bash
# Stop the development server
# Clear Metro cache
npx expo start --clear

# Or reset the entire project
npx expo install --fix
```

## What Gets Cleared:
- ✅ User authentication state
- ✅ AsyncStorage data (hasUsedApp flag)
- ✅ App cache and temporary files
- ✅ Any stored user preferences

## After Clearing:
1. App will show intro animation
2. Then show login screen (no auto-login)
3. Fresh registration will create new client account
4. All previous user data associations are removed