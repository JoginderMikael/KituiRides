import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';

/**
 * ChatBox Component - Real-time chat for rides and support
 * Features:
 * - Send/receive messages
 * - Mark as read
 * - Conversation list
 * - Unread message count
 */
const ChatBox = ({ conversationId, onClose }) => {
  const { user, token } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef(null);

  const API_URL = 'http://localhost:8080/api/chat';

  // Fetch messages when conversation changes
  useEffect(() => {
    if (conversationId) {
      fetchMessages();
      fetchUnreadCount();
      // Poll for new messages every 2 seconds (WebSocket would be better)
      const interval = setInterval(fetchMessages, 2000);
      return () => clearInterval(interval);
    }
  }, [conversationId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data.reverse()); // Show oldest first
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`${API_URL}/conversations/${conversationId}/unread-count`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const count = await response.json();
        setUnreadCount(count);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const response = await fetch(`${API_URL}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: newMessage })
      });

      if (response.ok) {
        setNewMessage('');
        fetchMessages(); // Refresh messages
      }
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await fetch(`${API_URL}/messages/${messageId}/read`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96 bg-gray-100">Loading messages...</div>;
  }

  return (
    <div className="flex flex-col h-screen bg-white border border-gray-200 rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex justify-between items-center p-4 border-b border-gray-200 bg-gradient-to-r from-blue-500 to-blue-600">
        <h3 className="text-white font-semibold">Conversation</h3>
        {unreadCount > 0 && (
          <span className="bg-red-500 text-white px-2 py-1 rounded-full text-sm">
            {unreadCount} new
          </span>
        )}
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 transition"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 mt-8">No messages yet. Start a conversation!</div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender.id === user.id ? 'justify-end' : 'justify-start'}`}
              onClick={() => !msg.isRead && markAsRead(msg.id)}
            >
              <div
                className={`max-w-xs px-4 py-2 rounded-lg ${
                  msg.sender.id === user.id
                    ? 'bg-blue-500 text-white rounded-br-none'
                    : 'bg-gray-200 text-gray-900 rounded-bl-none'
                }`}
              >
                <p className="text-sm">{msg.content}</p>
                <span className="text-xs opacity-70">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className="flex gap-2 p-4 border-t border-gray-200 bg-gray-50">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type message..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
        >
          Send
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
