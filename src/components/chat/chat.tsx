'use client';

import React from 'react';
import ChatBox from './chat-box';

interface ChatProps {
  channelId: string;
  entityId: string;
}

const Chat: React.FC<ChatProps> = ({ channelId, entityId }) => (
  <div className="h-full overflow-hidden">
    <ChatBox channelId={channelId} userId={entityId} />
  </div>
);

export default Chat;
