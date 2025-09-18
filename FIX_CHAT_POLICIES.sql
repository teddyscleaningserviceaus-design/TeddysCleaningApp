-- Fix infinite recursion in chat_participants policy
-- Run this in Supabase SQL Editor

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view participants in their chats" ON chat_participants;

-- Create a simpler policy without recursion
CREATE POLICY "Users can view participants in their chats" ON chat_participants
  FOR SELECT USING (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM chat_participants cp2 
      WHERE cp2.chat_id = chat_participants.chat_id 
      AND cp2.user_id = auth.uid()
    )
  );