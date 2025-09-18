# Employee Authentication Setup

## Problem
The new username-based authentication system requires employees to have:
- Entry in `users` collection with username
- Email verification completed
- Proper user type set

## Solution Options

### Option 1: Update Existing Employees (Recommended)

1. **Download Service Account Key:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Select **teddys-cleaning-app** project
   - **Settings** → **Project settings** → **Service accounts** tab
   - Click **Generate new private key**
   - Save as `serviceAccountKey.json` in `/scripts/` folder

2. **Run Update Script:**
   ```bash
   cd scripts
   node updateExistingEmployees.js
   ```

3. **What This Does:**
   - ✅ Creates `users` collection entries for existing employees
   - ✅ Generates usernames from email addresses
   - ✅ Marks emails as verified
   - ✅ Sets proper user types (employee/admin)
   - ✅ Maintains existing employee data

### Option 2: Create New Employees

1. **Setup Service Account** (same as above)

2. **Edit Employee List:**
   - Open `scripts/createEmployeeWithAuth.js`
   - Modify the `employees` array with your staff details

3. **Run Creation Script:**
   ```bash
   cd scripts
   node createEmployeeWithAuth.js
   ```

## Employee Login Process

After setup, employees can login with:
- **Username**: Generated from email (e.g., `john.smith@company.com` → `john.smith`)
- **Password**: Their existing password
- **Email verification**: Automatically completed

## Verification

Test employee login:
1. Open app
2. Select **Employee** role
3. Login with username and password
4. Should work without email verification step

## Troubleshooting

**"Username not found"**: Run the update script to create users collection entries

**"Email not verified"**: The script should auto-verify, but you can manually verify in Firebase Console

**"Permission denied"**: Ensure serviceAccountKey.json has proper permissions

## Security Notes

- **Change default passwords** after first login
- **Remove serviceAccountKey.json** after setup
- **Employees should update passwords** on first login