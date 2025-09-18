# Chat System Setup Guide

## Backend Architecture

The chat system uses **Supabase** as the primary backend with the following architecture:

### Database Tables:
- `chats` - Stores chat/group information
- `messages` - Stores all chat messages
- `chat_participants` - Links users to chats they participate in

### Storage:
- Chat images are stored in Supabase Storage under `chat-images/`
- Uses the existing `job-attachments` bucket

### Real-time Features:
- Message updates via polling (2-3 second intervals)
- Automatic last message updates via database triggers
- Row Level Security (RLS) for data protection

## Setup Instructions

### 1. Run the SQL Schema
Execute the SQL in `SUPABASE_CHAT_SCHEMA.sql` in your Supabase SQL editor:

```bash
# Copy and paste the entire SUPABASE_CHAT_SCHEMA.sql content into Supabase SQL Editor
```

### 2. No Realtime Setup Required
Since Supabase Realtime is not available, the system uses polling:
- Messages are checked every 2 seconds in active chats
- Chat list updates every 3 seconds
- No additional Supabase configuration needed

### 3. Storage Bucket Permissions
The chat system uses the existing `job-attachments` bucket. Ensure it has these policies:

```sql
-- Allow authenticated users to upload chat images
CREATE POLICY "Allow chat image uploads" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'job-attachments' AND 
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = 'chat-images'
);

-- Allow users to view chat images
CREATE POLICY "Allow chat image viewing" ON storage.objects
FOR SELECT USING (
  bucket_id = 'job-attachments' AND
  (storage.foldername(name))[1] = 'chat-images'
);
```

## Features Implemented

✅ **Near real-time messaging** - Messages appear within 2-3 seconds  
✅ **Group chat creation** - Create teams with multiple members  
✅ **Image sharing** - Upload and share photos  
✅ **Emoji support** - Custom emoji picker  
✅ **Message persistence** - All messages saved to database  
✅ **Security** - Row Level Security protects user data  
✅ **Automatic updates** - Last message updates automatically  

## Firebase vs Supabase

**Current Setup:**
- **Authentication**: Firebase Auth (with AsyncStorage persistence)
- **Chat Backend**: Supabase (database + storage + realtime)
- **File Storage**: Supabase Storage

**Why This Hybrid Approach:**
- Firebase Auth is already configured and working
- Supabase provides better real-time chat features
- Supabase has simpler database queries for chat
- No additional Firebase setup required

## Testing the Chat System

1. **Create a group**: Tap + button in chat list
2. **Send messages**: Type and send text messages
3. **Share images**: Tap camera icon to share photos
4. **Use emojis**: Tap smile icon for emoji picker
5. **Near real-time updates**: Messages sync within 2-3 seconds across devices

## Troubleshooting

**If messages don't appear:**
- Check network connectivity (polling requires internet)
- Verify RLS policies are applied
- Check browser console for errors
- Messages may take 2-3 seconds to appear (normal with polling)

**If images don't upload:**
- Verify storage bucket policies
- Check network connectivity
- Ensure proper file permissions

**If groups can't be created:**
- Check user authentication
- Verify database schema is applied
- Check RLS policies for chat_participants table