import { supabase } from './supabase';

// Chat database operations
export const chatService = {
  // Get all chats for a user (simplified)
  async getUserChats(userId) {
    const { data, error } = await supabase
      .from('chats')
      .select('*');
    
    if (error) throw error;
    return data || [];
  },

  // Get messages for a chat
  async getChatMessages(chatId) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Send a message
  async sendMessage(chatId, userId, userName, text, type = 'text', imageUrl = null) {
    const { data, error } = await supabase
      .from('messages')
      .insert([{
        chat_id: chatId,
        user_id: userId,
        user_name: userName,
        text,
        type,
        image_url: imageUrl
      }])
      .select()
      .single();

    if (error) throw error;

    // Update chat's last message
    await supabase
      .from('chats')
      .update({
        last_message: type === 'image' ? '📷 Photo' : text,
        last_message_at: new Date().toISOString()
      })
      .eq('id', chatId);

    return data;
  },

  // Create a group chat
  async createGroupChat(name, creatorId, participantIds) {
    // Create chat
    const { data: chat, error: chatError } = await supabase
      .from('chats')
      .insert([{
        name,
        is_group: true,
        created_by: creatorId,
        last_message: 'Group created',
        last_message_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (chatError) throw chatError;

    // Add participants
    const participants = [...participantIds, creatorId].map(userId => ({
      chat_id: chat.id,
      user_id: userId
    }));

    const { error: participantsError } = await supabase
      .from('chat_participants')
      .insert(participants);

    if (participantsError) throw participantsError;

    return chat;
  },

  // Get messages since timestamp (for polling)
  async getChatMessagesSince(chatId, since) {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .gt('created_at', since)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Get updated chats since timestamp (simplified)
  async getUpdatedChatsSince(userId, since) {
    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .gt('last_message_at', since);
    
    if (error) throw error;
    return data || [];
  }
};