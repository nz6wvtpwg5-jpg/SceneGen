import React from 'react';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";

interface ChatAvatarProps {
  initials?: string;
  avatarUrl?: string;
}

const ChatAvatar: React.FC<ChatAvatarProps> = ({ initials, avatarUrl }) => {
  return (
    <Avatar>
      <AvatarImage src={avatarUrl} alt={initials} />
      <AvatarFallback>{initials?.substring(0, 2)}</AvatarFallback>
    </Avatar>
  );
};

export default ChatAvatar;
