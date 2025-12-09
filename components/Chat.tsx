import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, User } from '../types';
import { sendMessage, getMessages, subscribeToChat } from '../services/chatService';

interface ChatProps {
  roomId: string;
  currentUser: User | null;
}

export const Chat: React.FC<ChatProps> = ({ roomId, currentUser }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  // Load initial messages
  useEffect(() => {
    const loadMessages = async () => {
      const msgs = await getMessages(roomId);
      setMessages(msgs);
    };
    loadMessages();
  }, [roomId]);

  // Subscribe to new messages
  useEffect(() => {
    const unsubscribe = subscribeToChat(roomId, (newMessage) => {
      setMessages((prev) => {
        // Avoid duplicates
        if (prev.some(m => m.id === newMessage.id)) return prev;
        return [...prev, newMessage];
      });
    });

    return () => unsubscribe();
  }, [roomId]);

  // Auto scroll
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !currentUser || isSending) return;

    setIsSending(true);
    const message = input.trim();
    setInput('');

    try {
      await sendMessage(roomId, currentUser, message);
    } catch (error) {
      console.error('Failed to send message:', error);
      setInput(message); // Restore message on error
    }

    setIsSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-rivora-panel/50 border border-white/5 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="px-4 py-2 border-b border-white/10 flex items-center gap-2">
        <svg className="w-4 h-4 text-rivora-cyan" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
        <span className="text-sm font-display text-slate-400">ROOM CHAT</span>
        <span className="ml-auto text-xs text-slate-500">{messages.length} messages</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-slate-500 text-sm py-8">
            No messages yet. Say hello!
          </div>
        )}
        
        {messages.map((msg) => (
          <div key={msg.id} className="flex gap-2 group">
            <img 
              src={msg.avatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${msg.userId}`}
              alt={msg.username}
              className="w-6 h-6 rounded-full border border-white/20 flex-shrink-0 mt-0.5"
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-rivora-cyan truncate">
                  {msg.username}
                </span>
                <span className="text-[10px] text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                  {new Date(msg.timestamp).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </span>
              </div>
              <p className="text-sm text-slate-300 break-words">{msg.message}</p>
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      {/* Input */}
      {currentUser ? (
        <div className="p-3 border-t border-white/10">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              maxLength={500}
              disabled={isSending}
              className="flex-1 bg-rivora-dark border border-white/20 rounded px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rivora-cyan disabled:opacity-50"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isSending}
              className="px-4 py-2 bg-rivora-violet hover:bg-violet-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3 border-t border-white/10 text-center">
          <p className="text-sm text-slate-500">Connect wallet to chat</p>
        </div>
      )}
    </div>
  );
};
