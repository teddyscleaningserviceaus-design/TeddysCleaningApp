# Supabase Setup Instructions

## 1. Install Supabase Client
```bash
npm install @supabase/supabase-js
```

## 2. Get Your Supabase Credentials
1. Go to your Supabase dashboard
2. Select your project
3. Go to Settings → API
4. Copy:
   - Project URL
   - Anon/Public key

## 3. Update config/supabase.js
Replace the placeholders with your actual values:
```javascript
const supabaseUrl = 'https://your-project.supabase.co';
const supabaseAnonKey = 'your-anon-key-here';
```

## 4. Create Storage Bucket
1. Go to Storage in Supabase dashboard
2. Create a new bucket called `job-attachments`
3. Set it to **Public** (for easy image access)
4. Configure policies:

### Storage Policies (RLS)
```sql
-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated uploads" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow public read access
CREATE POLICY "Allow public downloads" ON storage.objects
FOR SELECT USING (bucket_id = 'job-attachments');

-- Allow authenticated users to update their uploads
CREATE POLICY "Allow authenticated updates" ON storage.objects
FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Allow authenticated deletes" ON storage.objects
FOR DELETE USING (auth.role() = 'authenticated');
```

## 5. Folder Structure
The app will create these folders automatically:
- `job-photos/{jobId}/`
- `equipment-photos/{equipmentId}/`

## 6. Usage in Your App
```javascript
import { uploadJobPhoto } from '../config/supabase';

// Upload a job photo
const result = await uploadJobPhoto(jobId, imageUri, fileName);
if (result.success) {
  console.log('Photo uploaded:', result.url);
} else {
  console.error('Upload failed:', result.error);
}
```

## 7. Benefits of Supabase Storage
- ✅ More reliable than Firebase Storage
- ✅ Better error handling
- ✅ Generous free tier (1GB storage)
- ✅ Fast CDN delivery
- ✅ Easy to set up and use
- ✅ Built-in image transformations