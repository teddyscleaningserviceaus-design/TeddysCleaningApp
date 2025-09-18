# Admin Tabs - Live Operations Dashboard

## Overview
The admin tabs provide a comprehensive Live Operations dashboard for managing cleaning jobs, employees, and communications in real-time.

## New Components & Hooks (PR1)

### Jobs Map Locate-Me Feature
**Location**: `components/LiveMap.tsx` (used in both Dashboard and Jobs views)

The locate-me functionality is now available on both Admin Dashboard and Jobs view maps:
- **Permission handling**: Requests location permissions with user-friendly fallback messages
- **Error handling**: Graceful handling of permission denied and location unavailable scenarios
- **Visual feedback**: Shows loading state and temporary user location marker with pulse animation
- **Map centering**: Automatically centers map on user location when found
- **Debounce protection**: Prevents multiple simultaneous location requests

**Usage**:
```typescript
<LiveMap 
  jobs={jobs} 
  onJobSelect={handleJobPress} 
  showLocateButton={true}  // Enable locate-me button
  includePast={false}      // Filter completed jobs
/>
```

### Navigation Cleanup
**Location**: `_layout.tsx`

Cleaned up admin navigation to show only intended tabs:
- **Dashboard**: Live operations overview with KPIs and real-time data
- **Jobs**: Job management with map view and locate-me functionality
- **Messages**: Team communications and admin messaging
- **Team**: Employee management and roster
- **Removed**: News tab (file still exists but hidden from navigation)

### Array.isArray Guards
**Locations**: All admin tab components

Added comprehensive `.filter()` crash prevention:
- **Jobs filtering**: Status, date range, and search filters now have Array.isArray guards
- **Employee stats**: Job counting and filtering protected from undefined arrays
- **Messaging counts**: Conversation filtering and statistics protected
- **News filtering**: Publication and priority filtering protected

### useLiveOpsListeners Hook
**Location**: `hooks/useLiveOpsListeners.ts`

Centralized hook for real-time data management with stability optimizations:
- **Debounced search** (300ms) to prevent excessive queries
- **Memoized filtering** to prevent render loops
- **Stable dependencies** using useMemo for date ranges
- **Auth readiness** checks before setting up listeners
- **Scoped queries** with pagination (default 50 items)

**Usage**:
```typescript
const { jobs, employees, alerts, counts, loading, error, refresh } = useLiveOpsListeners({
  search: 'search term',
  dateRange: { start: new Date(), end: new Date() },
  status: 'In Progress',
  pageSize: 50
});
```

**Returns**:
- `jobs[]`: Filtered job list
- `employees[]`: Available employees
- `alerts[]`: Generated alerts (SLA breaches, long-running jobs, missing proof)
- `counts`: Job status counts (totalJobs, inProgress, completed, pending)
- `loading`: Loading state
- `error`: Error message (null for permission-denied)
- `refresh()`: Manual refresh function

### Dashboard Stability Fixes
**Location**: `dashboard.tsx`

Key improvements:
- **Memoized dateRange** prevents effect dependency loops
- **Debounced search** with 300ms delay using useCallback
- **Jump-to-Job API** exposed globally for messaging integration
- **KPI routing** uses exact DB status strings: `{ total: null, active: "In Progress", completed: "Completed", pending: "Pending" }`

### Messaging Auth Readiness
**Location**: `messaging.tsx`

Enhanced auth handling:
- **authReady check** before setting up listeners
- **Jump-to-Job integration** using global `openJobDetailsPanel` API
- **Graceful fallbacks** for permission-denied errors
- **No spam logs** for "No user profile" scenarios

### EmployeeRoster Optimizations
**Location**: `components/EmployeeRoster.tsx`

Performance improvements:
- **useCallback** for event handlers to prevent inline function recreation
- **useMemo** for available jobs calculation
- **Memoized renderItem** to prevent unnecessary re-renders
- **Stable props** to avoid cascading updates

## Testing

### Unit Tests
Run tests with: `npm test`

**Coverage**:
- `useLiveOpsListeners` lifecycle and filtering
- Messaging auth fallback scenarios
- Debounced search behavior
- Date range filtering
- Alerts generation

### Manual QA Checklist (PR1)

1. **Navigation cleanup**
   - ✅ Bottom nav shows only Dashboard, Jobs, Messages, Team tabs
   - ✅ No iconless tabs visible
   - ✅ No .filter crashes when navigating between tabs
   - ✅ All tab icons and labels display correctly

2. **Jobs map locate-me functionality**
   - ✅ Open Jobs view → locate button visible in top-right of map
   - ✅ Tap locate button → app requests location permission
   - ✅ Grant permission → map centers on user location with pulse marker
   - ✅ Deny permission → shows permission required alert with settings option
   - ✅ Location unavailable → shows error alert with retry option
   - ✅ Multiple rapid taps → only one location request processed

3. **Dashboard map locate-me (unchanged)**
   - ✅ Admin Dashboard map has same locate-me behavior
   - ✅ Identical permission handling and error messages
   - ✅ Same visual feedback and map centering

4. **Array.isArray crash prevention**
   - ✅ Jobs view with undefined/null job arrays → no crashes
   - ✅ Employee stats with missing data → shows 0 counts gracefully
   - ✅ Messaging with undefined conversations → no filter crashes
   - ✅ All filtering operations handle edge cases

5. **Start app, navigate to Admin Dashboard**
   - ✅ No "Maximum update depth exceeded" errors in logs
   - ✅ Dashboard loads without render loops

6. **Search functionality**
   - ✅ Type in search box - results update after ~300ms debounce
   - ✅ No immediate updates on each keystroke
   - ✅ Search filters jobs by title, client, address, assignee

7. **KPI card navigation**
   - ✅ Click "Total" → routes to `/(admin-tabs)/jobs` (no status filter)
   - ✅ Click "Active" → routes to `/(admin-tabs)/jobs?status=In Progress`
   - ✅ Click "Done" → routes to `/(admin-tabs)/jobs?status=Completed`
   - ✅ Click "Pending" → routes to `/(admin-tabs)/jobs?status=Pending`

8. **Job selection**
   - ✅ Click job row → JobDetailsPanel opens with correct jobId
   - ✅ Click map marker → JobDetailsPanel opens (skeleton)
   - ✅ Panel shows job details and status controls

9. **Jump-to-Job from messaging**
   - ✅ Send test message with jobId reference
   - ✅ Click "View Job Details" → JobDetailsPanel opens
   - ✅ Correct job details displayed

10. **Date range filtering**
    - ✅ Select "Today" → shows only today's jobs
    - ✅ Select "Week" → shows jobs within 7 days
    - ✅ Select "Month" → shows jobs within 30 days

## Architecture Notes

### Data Flow
1. `useLiveOpsListeners` sets up Firestore listeners
2. Raw data is filtered and memoized
3. Components receive stable, filtered data
4. UI updates only when filtered results change

### Performance Optimizations
- **Debounced search** prevents excessive Firestore queries
- **Memoized calculations** prevent unnecessary re-computations
- **Stable dependencies** prevent effect loops
- **Scoped queries** limit data transfer

### Error Handling
- Permission-denied errors are handled gracefully (no error state)
- Auth readiness prevents premature listener setup
- Fallback states for offline/disconnected scenarios

## Next Steps (Future PRs)

### PR2: JobDetailsPanel Full Actions
- Complete lifecycle controls (accept/decline/reassign)
- Optimistic updates with rollback
- Audit logging for all actions
- SLA timer enhancements

### PR3: Employee & Bulk Operations
- One-click assign with rollback handling
- Bulk job operations (complete/schedule/delete)
- Undo toast notifications
- Drag-and-drop assignment (future)

### PR4: Full Messaging Inbox
- ConversationList and ConversationThread components
- useMessagingListeners hook
- Pagination and message search
- Canned replies and admin actions

### PR5: Alerts & Polish
- Real-time alerts feed
- Bell notification badge
- UX polish and animations
- Comprehensive test coverage

## Troubleshooting

### Common Issues

**"Maximum update depth exceeded"**
- Ensure dateRange is memoized in dashboard
- Check that search is debounced properly
- Verify useLiveOpsListeners dependencies are stable

**Jobs not loading**
- Check Firestore security rules
- Verify user authentication state
- Check browser console for permission errors

**Search not working**
- Verify 300ms debounce is working
- Check that search term is passed to useLiveOpsListeners
- Ensure Firestore has searchable fields

**KPI navigation broken**
- Verify status strings match DB values exactly
- Check router.push calls use correct paths
- Ensure query params are properly encoded