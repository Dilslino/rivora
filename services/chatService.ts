import { supabase } from '../lib/supabase';
import { ChatMessage, User } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Send a chat message
export async function sendMessage(roomId: string, user: User, message: string): Promise<ChatMessage | null> {
  const msgId = uuidv4();
  
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      id: msgId,
      room_id: roomId,
      user_id: user.id,
      message: message.trim(),
    });

  if (error) {
    console.error('Error sending message:', error);
    return null;
  }

  return {
    id: msgId,
    roomId,
    userId: user.id,
    username: user.username,
    avatar: user.avatar,
    message: message.trim(),
    timestamp: Date.now(),
  };
}

// Get chat messages for a room
export async function getMessages(roomId: string, limit: number = 100): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select(`
      *,
      user:users(username, avatar)
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return (data || []).map((msg: any) => ({
    id: msg.id,
    roomId: msg.room_id,
    userId: msg.user_id,
    username: msg.user?.username || 'Unknown',
    avatar: msg.user?.avatar || '',
    message: msg.message,
    timestamp: new Date(msg.created_at).getTime(),
  }));
}

// Subscribe to new chat messages
export function subscribeToChat(roomId: string, callback: (message: ChatMessage) => void) {
  const channel = supabase
    .channel(`chat:${roomId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'chat_messages',
        filter: `room_id=eq.${roomId}`,
      },
      async (payload) => {
        const msg = payload.new as any;
        
        // Fetch user info
        const { data: userData } = await supabase
          .from('users')
          .select('username, avatar')
          .eq('id', msg.user_id)
          .single();

        callback({
          id: msg.id,
          roomId: msg.room_id,
          userId: msg.user_id,
          username: userData?.username || 'Unknown',
          avatar: userData?.avatar || '',
          message: msg.message,
          timestamp: new Date(msg.created_at).getTime(),
        });
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
