'use client';

import dynamic from "next/dynamic";
import "@/components/chat/chat.css";
import { useSession } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import ConversationList from "@/components/chat/conversation-list";
import ProposalDetails from "@/components/proposals/proposal-details";
import { useProfileStore } from '@/store/useProfileStore';
import { ArrowLeft } from 'lucide-react';

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

// Dynamically import Chat component to avoid SSR issues
const Chat = dynamic(() => import("../../components/chat/chat"), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full"><div className="animate-pulse">Loading chat...</div></div>
});

export default function Conversations() {
  const { data: session, status } = useSession();
  const { activeProfile } = useProfileStore();
  const [conversationPayload, setConversationPayload] = useState<ConversationPayload>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);

  // Add a ref to track if we've already fetched conversations
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    hasFetchedRef.current = false;
    setError(null);
    const storageKey = activeProfile?.id ? `selectedConversationId:${activeProfile.id}` : null;
    setSelectedConversationId(storageKey ? localStorage.getItem(storageKey) : null);
  }, [activeProfile?.id]);

  // Function to handle conversation selection
  const handleConversationSelect = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    // Save to localStorage for persistence
    if (activeProfile?.id) localStorage.setItem(`selectedConversationId:${activeProfile.id}`, conversationId);
  };

  // Fetch conversations only once
  useEffect(() => {
    async function fetchConversations() {
      if (hasFetchedRef.current) return;

      try {
        setLoading(true);
        if (!activeProfile?.id) throw new Error('Select an artist or promoter profile first');
        const response = await fetch('/api/conversations', { headers: { 'X-Entity-Id': activeProfile.id } });
        if (!response.ok) {
          throw new Error('Failed to fetch conversations');
        }
        const data = await response.json();
        setConversationPayload(data);

        const selectedExists = data.conversations?.some(
          (conversation: Conversation) => conversation.conversationId === selectedConversationId
        );
        // Automatically select the most recent conversation if the saved selection is absent.
        if (data.conversations && data.conversations.length > 0 && !selectedExists) {
          // Sort conversations by updatedAt in descending order (newest first)
          const sortedConversations = [...data.conversations].sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
          // Select the first (most recent) conversation
          const conversationId = sortedConversations[0].conversationId;
          setSelectedConversationId(conversationId);
          localStorage.setItem(`selectedConversationId:${activeProfile.id}`, conversationId);
        }

        hasFetchedRef.current = true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load conversations');
      } finally {
        setLoading(false);
      }
    }

    if (session && activeProfile?.id) {
      fetchConversations();
    }
  }, [session, activeProfile?.id, selectedConversationId]);

  if (status === "loading") {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (status === "unauthenticated") {
    return <div className="flex justify-center items-center h-full">Access Denied</div>;
  }

  if (!activeProfile) {
    return <div className="flex justify-center items-center h-full">Select an artist or promoter profile to view conversations.</div>;
  }

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-full">Error: {error}</div>;
  }

  return (
    <div className="grid h-[100dvh] min-h-0 w-full gap-px overflow-hidden bg-black/10 md:grid-cols-[300px_minmax(0,1fr)] lg:grid-cols-[300px_minmax(0,1fr)_320px]">
      {/* Left column - Conversation List */}
      <div className={`${selectedConversationId ? 'hidden' : 'block'} h-full min-h-0 overflow-hidden bg-[#e9e2d6] md:block`}>
        <ConversationList
          conversationPayload={conversationPayload}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleConversationSelect}
          userName={session?.user.name ?? undefined}
        />
      </div>

      {/* Middle column - Chat window for individual conversations */}
      <div className={`${selectedConversationId ? 'flex' : 'hidden'} h-full min-h-0 min-w-0 flex-col overflow-hidden bg-[#fbf8f1] md:flex`}>
        {selectedConversationId && (
          <button type="button" onClick={() => setSelectedConversationId(null)} className="mobile-safe-top flex min-h-12 shrink-0 items-center gap-2 border-b px-4 text-sm font-bold md:hidden">
            <ArrowLeft size={18}/>All conversations
          </button>
        )}
        <div className="min-h-0 flex-1 overflow-hidden">
        {selectedConversationId ? (
          <Chat key={selectedConversationId} channelId={selectedConversationId} entityId={activeProfile!.id} />
        ) : (
          <div className="flex justify-center items-center h-full text-text-tertiary">
            Select a conversation to start chatting
          </div>
        )}
        </div>
      </div>

      {/* Right column - Proposal details */}
      <div className="hidden h-full overflow-auto bg-[#f2ede3] lg:block">
        <ProposalDetails />
      </div>
    </div>
  );
}
