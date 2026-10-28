'use client';

import { useCallback, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getEntityId } from '@/lib/entity';

export interface SceneGenNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  actionUrl?: string;
  createdAt: string;
}

export function useNotifications(limit = 50) {
  const { status } = useSession();
  const [notifications, setNotifications] = useState<SceneGenNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (status !== 'authenticated') return;
    const entityId = getEntityId();
    if (!entityId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/notification/history?limit=${limit}`, {
        headers: { 'X-Entity-Id': entityId }, cache: 'no-store'
      });
      if (!response.ok) throw new Error('Failed to load notifications');
      const data = await response.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
    } finally {
      setIsLoading(false);
    }
  }, [limit, status]);

  const markRead = useCallback(async (notificationId?: string) => {
    const entityId = getEntityId();
    if (!entityId) return;
    const response = await fetch('/api/notification/markread', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Entity-Id': entityId },
      body: JSON.stringify(notificationId ? { notificationId } : { markAllAsRead: true })
    });
    if (!response.ok) throw new Error('Failed to update notification');
    await refresh();
  }, [refresh]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('scenegen:push-notification', refresh);
    return () => { window.clearInterval(timer); window.removeEventListener('scenegen:push-notification', refresh); };
  }, [refresh]);

  return { notifications, unreadCount, isLoading, refresh, markRead };
}
