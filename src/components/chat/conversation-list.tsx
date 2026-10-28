import React, { useMemo, useState } from 'react';
import { DateTime } from 'luxon';

// Define the conversation interfaces
interface Conversation {
  conversationId: string;
  lastMessage: string;
  updatedAt: string;
  participants: Array<{ id: string; name?: string }>;
}

interface ConversationPayload {
  conversations: Conversation[];
  continuationToken?: string;
}

interface ConversationListProps {
  conversationPayload: ConversationPayload | undefined;
  selectedConversationId: string | null;
  onSelectConversation: (conversationId: string) => void;
  userName?: string;
}

// Helper function to format DateTimeOffset
const formatDateTime = (dateTimeOffset: string) => {
  try {
    const dt = DateTime.fromISO(dateTimeOffset);
    return dt.toLocaleString(DateTime.DATETIME_SHORT);
  } catch (error) {
    console.error('Error parsing date:', error);
    return 'Invalid date';
  }
};

const ConversationList: React.FC<ConversationListProps> = ({
  conversationPayload,
  selectedConversationId,
  onSelectConversation,
  userName
}) => {
  const [query, setQuery] = useState('');
  const conversations = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return conversationPayload?.conversations || [];
    return (conversationPayload?.conversations || []).filter((conversation) =>
      [...conversation.participants.map((participant) => participant.name || ''), conversation.lastMessage]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [conversationPayload?.conversations, query]);

  return (
    <div className="mobile-safe-top mobile-safe-bottom h-full overflow-y-auto bg-gray2 px-4 py-5 sm:px-5 sm:py-6">
      <p className="heading-1">Conversations</p>
      <p>Welcome, {userName} conversations:{conversationPayload?.conversations.length}</p>
      <p>
        <input
          placeholder="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="my-3 min-h-11 w-full rounded-sm border border-gray5 bg-gray2 px-3 py-2 text-base text-gray7 sm:text-sm"
        />
      </p>
      {conversations.map((conversation) => {
        const isSelected = selectedConversationId === conversation.conversationId;
        return (
          <button
            type="button"
            key={conversation.conversationId}
            className={`messagePreview my-2 min-h-16 w-full cursor-pointer rounded bg-gray5 px-2.5 py-3 text-left ${
              isSelected ? 'border-2 border-blue-500' : ''
            }`}
            onClick={() => onSelectConversation(conversation.conversationId)}
          >
            <p className="heading-1">{conversation.participants[1]?.name || 'Contact'}</p>
            <p className="text-gray8 text-sm truncate">
              {conversation.lastMessage}
            </p>
            <p className="text-xs text-gray-400">
              {formatDateTime(conversation.updatedAt)}
            </p>
          </button>
        );
      })}
    </div>
  );
};

export default ConversationList;
