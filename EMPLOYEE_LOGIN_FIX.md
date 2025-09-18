# Employee Login Fix

## Problem
Employees created through the admin dashboard couldn't sign in because they were missing usernames required by the new authentication system.

## What Was Fixed

### 1. Updated Employee Creation (`add-employee.tsx`)
- ✅ Now generates username from email (part before @)
- ✅ Auto-verifies email for admin-created employees
- ✅ Stores username in users collection

### 2. Updated Authentication Service (`authService.js`)
- ✅ Checks database email verification for admin-created accounts
- ✅ Allows employees to login even if Firebase email verification is pending

### 3. Updated Firestore Rules
- ✅ Allows admins to create employee accounts
- ✅ Proper permissions for employee creation

### 4. Created Fix Script (`scripts/fixExistingEmployees.js`)
- ✅ Adds usernames to existing employees
- ✅ Auto-verifies existing employee emails

## How to Fix Existing Employees

1. **Download Service Account Key:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select **teddys-cleaning-app** project
   - **Settings** → **Project settings** → **Service accounts** tab
   - Click **Generate new private key**
   - Save as `serviceAccountKey.json` in `/scripts/` folder

2. **Run Fix Script:**
   ```bash
   cd scripts
   node fixExistingEmployees.js
   ```

## Employee Login Process (After Fix)

Employees can now login with:
- **Username**: Email prefix (e.g., `john.smith@company.com` → `john.smith`)
- **Password**: Their existing password
- **Email verification**: Auto-completed by admin

## New Employee Creation Process

When admins create new employees:
1. Username is automatically generated from email
2. Email is auto-verified
3. Employee can immediately login with username/password

## Testing

1. Create a new employee through admin dashboard
2. Try logging in as that employee using:
   - Username: email prefix
   - Password: the password you set
3. Should work without email verification step

## Notes

- Existing employees need the fix script run once
- New employees created after this fix will work immediately
- Usernames are generated as email prefixes (before @ symbol)
- If username conflicts exist, a unique suffix is added