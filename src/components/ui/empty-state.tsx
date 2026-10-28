"use client";

import { Button } from "@/components/ui/button";
import { Calendar, Users, Map, Handshake, MessageCircle, Clock } from "lucide-react";
import { ReactNode } from "react";

/**
 * EmptyState Component
 * Implements BUILD_PLAN Week 8, Task 8.3
 * Reusable empty state component for various pages
 */
interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 border-2 border-dashed border-border-subtle rounded-lg">
      {icon && (
        <div className="mb-4 flex justify-center">
          <div className="text-text-tertiary">{icon}</div>
        </div>
      )}
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-text-tertiary mb-6 max-w-md mx-auto">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button onClick={onAction} size="lg">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Predefined Empty States
 */
export function NoShowsYet({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<Calendar size={48} strokeWidth={1.5} />}
      title="No Shows Yet"
      description="Start by creating your first show. Add venue details, dates, and invite artists or promoters to collaborate."
      actionLabel="Create Your First Show"
      onAction={onCreate}
    />
  );
}

export function NoContactsYet({ onAdd }: { onAdd: () => void }) {
  return (
    <EmptyState
      icon={<Users size={48} strokeWidth={1.5} />}
      title="No Contacts Yet"
      description="Build your network by connecting with artists and promoters. Send contact requests to start collaborating."
      actionLabel="Add Your First Contact"
      onAction={onAdd}
    />
  );
}

export function NoToursYet({ onCreate }: { onCreate: () => void }) {
  return (
    <EmptyState
      icon={<Map size={48} strokeWidth={1.5} />}
      title="No Tours Yet"
      description="Create a tour to organize multiple shows together. Track your tour dates and manage shows efficiently."
      actionLabel="Create Your First Tour"
      onAction={onCreate}
    />
  );
}

export function NoPromoterContacts() {
  return (
    <EmptyState
      icon={<Handshake size={48} strokeWidth={1.5} />}
      title="No Promoter Contacts"
      description="You haven't connected with any promoters yet. Visit the contacts page to start building your network."
    />
  );
}

export function NoConversationsYet() {
  return (
    <EmptyState
      icon={<MessageCircle size={48} strokeWidth={1.5} />}
      title="No Conversations Yet"
      description="Once you connect with artists or promoters, you can start conversations and collaborate on shows."
    />
  );
}

export function NoPendingRequests() {
  return (
    <EmptyState
      icon={<Clock size={48} strokeWidth={1.5} />}
      title="No Pending Requests"
      description="You're all caught up! All your contact requests have been handled."
    />
  );
}
