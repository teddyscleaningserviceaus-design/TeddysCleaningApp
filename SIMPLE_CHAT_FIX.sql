-- Complete fix for chat policies
-- Run this in Supabase SQL Editor

-- Drop ALL problematic policies
DROP POLICY IF EXISTS "Users can view participants in their chats" ON chat_participants;
DROP POLICY IF EXISTS "Users can add participants to chats they created" ON chat_participants;

-- Create simple policies without recursion
CREATE POLICY "Allow users to view all participants" ON chat_participants
  FOR SELECT USING (true);

CREATE POLICY "Allow users to add participants" ON chat_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);