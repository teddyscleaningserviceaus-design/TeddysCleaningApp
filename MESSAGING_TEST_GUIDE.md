# Messaging Fix Manual Test Guide

## Test Steps to Verify Behavior

### 1. Auth Race Condition Fix
1. Open the app and navigate to Employee Messaging
2. **Before fix**: Would see repeated "No user profile, skipping user load" logs
3. **After fix**: Should see clean debug logs showing resolved uid and user count

### 2. Retry Loading Users
1. Navigate to messaging screen
2. If no users load (empty state), press "Retry Loading Users"
3. **Before fix**: Would flood console with error logs
4. **After fix**: Shows "Loading..." state briefly, then loads users or shows admin fallback

### 3. Auth Fallback Behavior
1. Test with userProfile available (normal case)
2. Test with userProfile null but auth.currentUser available
3. **Expected**: Both cases should work and load contacts

### 4. Chat Listener Guard
1. Navigate to messaging
2. Check that chat listener only starts when uid is available
3. Navigate away and back - listener should clean up properly

### 5. Console Logs Verification
Look for these debug messages in console:
- "AuthContext: userProfile loaded [uid]"
- "Setting up messaging for uid: [uid]"
- "Starting loadUsers for uid: [uid]"
- "Fetched users count: [number]"

### 6. Error Handling
1. Test with Firestore permission denied (simulate by temporarily changing rules)
2. Should show admin fallback contact
3. Should show retry button
4. Should not crash or show blank screen

## Expected Results
- ✅ No repeated error logs on retry
- ✅ Admin Team contact always visible as fallback
- ✅ Clean debug logging shows auth resolution steps
- ✅ Chat listener starts only when uid exists
- ✅ Graceful handling of permission errors
- ✅ Retry button shows loading state

## Test Environment
- Device/Emulator: Android/iOS
- Network: Online/Offline scenarios
- Auth State: Fresh login, existing session, expired session