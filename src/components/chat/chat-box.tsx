'use client';

import React, { useEffect, useState, useRef } from 'react';
import styles from './chat-box.module.css';
import ChatAvatar from './chat-avatar';
import { Send } from 'lucide-react';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { AvatarGenerator } from 'random-avatar-generator';

interface ChatBoxProps {
  channelId: string;
  userId: string;
}

// Our custom message type
interface ChatMessage {
  id?: string;
  data?: any;
  senderId: string;
  timestamp: number;
  name?: string;
}

/**
 * ChatBox component that displays and manages messages for a specific conversation
 *
 * @param {Object} props - Component props
 * @param {string} props.channelId - The ID of the conversation channel
 * @param {string} props.userId - The ID of the current user
 */
const ChatBox: React.FC<ChatBoxProps> = ({ channelId, userId }) => {
  // Refs for DOM elements
  const inputBoxRef = useRef<HTMLTextAreaElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Ref to track the current channel ID
  const currentChannelIdRef = useRef<string>(channelId);

  // Component state
  const [messageText, setMessageText] = useState<string>('');
  const [receivedMessages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userAvatars, setUserAvatars] = useState<Record<string, string>>({});

  // Computed values
  const messageTextIsEmpty = messageText.trim().length === 0;

  // Update the ref when channelId changes
  useEffect(() => {
    // If the channel ID has changed, reset everything
    if (currentChannelIdRef.current !== channelId) {
      console.log(`Channel changed from ${currentChannelIdRef.current} to ${channelId}`);
      setMessages([]);
      setLoading(true);
      currentChannelIdRef.current = channelId;
    }
  }, [channelId]);

  // Fetch message history when channelId changes
  useEffect(() => {
    const fetchMessageHistory = async (showLoading = false) => {
      if (!channelId) return;

      try {
        if (showLoading) setLoading(true);
        const response = await fetch(`/api/messages?conversationId=${channelId}`, {
          headers: { 'X-Entity-Id': userId }, cache: 'no-store'
        });
        if (!response.ok) throw new Error('Failed to fetch message history');

        const data = await response.json();
        if (data.messages) {
          // Format messages for display
          const formattedMessages = data.messages.map((msg: any) => ({
            senderId: msg.senderId,
            data: msg.content,
            id: msg.messageId,
            timestamp: new Date(msg.sentAt).getTime()
          }));

          // Sort messages by timestamp (oldest first)
          formattedMessages.sort((a: ChatMessage, b: ChatMessage) => a.timestamp - b.timestamp);

          setMessages(formattedMessages);
        }
      } catch (error) {
        console.error('Error fetching message history:', error);
      } finally { if (showLoading) setLoading(false); }
    };

    fetchMessageHistory(true);
    const timer = window.setInterval(() => fetchMessageHistory(false), 5000);
    return () => window.clearInterval(timer);
  }, [channelId, userId]);

  // Generate and store avatars for unique users
  useEffect(() => {
    const uniqueUserIds = [...new Set(receivedMessages.map(msg => msg.senderId))];

    // Only generate avatars for users we don't already have
    const newUserIds = uniqueUserIds.filter(id => !userAvatars[id]);

    if (newUserIds.length > 0) {
      const generator = new AvatarGenerator();

      const newAvatars: Record<string, string> = {};
      newUserIds.forEach(id => {
        if (id) {
          newAvatars[id] = generator.generateRandomAvatar(id);
        }
      });

      setUserAvatars(prev => ({ ...prev, ...newAvatars }));
    }
  }, [receivedMessages, userAvatars]);

  /**
   * Send a chat message to the channel
   * @param {string} text - The message text to send
   */
  const sendChatMessage = async (text: string) => {
    const content = text.trim();
    if (!content) return;
    const response = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Entity-Id': userId },
      body: JSON.stringify({ conversationId: channelId, content })
    });
    if (!response.ok) return;
    const message = await response.json();
    setMessages((history) => [...history.slice(-199), {
      id: message.messageId, data: message.content, senderId: message.senderId,
      timestamp: new Date(message.sentAt).getTime()
    }]);
    setMessageText(''); inputBoxRef.current?.focus();
  };

  /**
   * Handle form submission
   * @param {React.FormEvent} event - The form submit event
   */
  const handleFormSubmission = (event: React.FormEvent) => {
    event.preventDefault();
    void sendChatMessage(messageText);
  };

  /**
   * Handle key press in the message input
   * @param {React.KeyboardEvent} event - The keypress event
   */
  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key !== 'Enter' || event.shiftKey || messageTextIsEmpty) {
      return;
    }
    void sendChatMessage(messageText);
    event.preventDefault();
  };

  // Render messages
  const messageElements = receivedMessages.map((message, index) => {
    const author = message.senderId === userId ? 'me' : 'other';
    return (
      <span key={message.id || index} className={styles.message} data-author={author}>
        <ChatAvatar initials={message.senderId} avatarUrl={userAvatars[message.senderId]} />
        {message.data || ''}
      </span>
    );
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [receivedMessages]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex justify-center items-center h-full w-full">
        <div className="text-text-tertiary">Loading messages...</div>
      </div>
    );
  }

  // Render chat UI
  return (
    <div className={styles.chatHolder}>
      <ScrollArea className={styles.chatText}>
        <div className="flex flex-col gap-4 p-4">
          {messageElements.length > 0 ? messageElements : (
            <div className="w-full text-center text-text-tertiary mt-10">
              No messages yet. Start a conversation!
            </div>
          )}
          <div ref={messageEndRef}></div>
        </div>
        <ScrollBar orientation="vertical" />
      </ScrollArea>
      <form onSubmit={handleFormSubmission} className={styles.form}>
        <textarea
          ref={inputBoxRef}
          value={messageText}
          placeholder="Enter your message..."
          onChange={(e) => setMessageText(e.target.value)}
          onKeyUp={handleKeyPress}
          className={styles.textarea}
          rows={1}
          maxLength={4000}
        ></textarea>
        <button
          type="submit"
          className={styles.button}
          disabled={messageTextIsEmpty}
          aria-label="Send message"
        >
          <Send className={messageTextIsEmpty ? "opacity-50" : ""} />
        </button>
      </form>
    </div>
  );
};

export default ChatBox;
