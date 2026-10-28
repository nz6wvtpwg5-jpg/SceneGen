'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

interface CalendarSyncButtonProps {
  show: any;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  onSyncSuccess?: () => void; // Callback to refetch shows after sync
}

export function CalendarSyncButton({
  show,
  variant = 'outline',
  size = 'sm',
  className = '',
  onSyncSuccess
}: CalendarSyncButtonProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  useEffect(() => {
    // If we have a google_calendar_event_id, the show is already synced
    setIsSynced(!!(show.googleCalendarEventId || show.google_calendar_event_id));

    // Check actual calendar connection status
    checkCalendarStatus();
  }, [show.googleCalendarEventId, show.google_calendar_event_id]);

  const entityId = show.entityId || show.artistEntityId;

  const checkCalendarStatus = async () => {
    try {
      const response = await fetch('/api/calendar/status');
      const data = await response.json();
      console.log('📅 Calendar status check:', data);
      setIsConnected(data.connected);
    } catch (error) {
      console.error('Error checking calendar status:', error);
      setIsConnected(false);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  const handleConnect = () => {
    window.dispatchEvent(new CustomEvent('scenegen:connect-calendar'));
  };

  const handleSync = async () => {
    if (!entityId) {
      toast.error('This show is missing its workspace context');
      return;
    }
    setIsSyncing(true);
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Entity-Id': entityId },
        body: JSON.stringify({ showId: show.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        // If we get a 401, it means the calendar isn't connected
        if (response.status === 401) {
          toast.error('Please connect your Google Calendar first');
          setIsConnected(false);
          return;
        }
        throw new Error(data.error || 'Failed to sync to calendar');
      }

      setIsSynced(true);
      toast.success('Show synced to Google Calendar successfully!');

      // Trigger refetch of shows data
      if (onSyncSuccess) {
        onSyncSuccess();
      }
    } catch (error) {
      console.error('Sync error:', error);
      toast.error(error instanceof Error ? error.message : 'Could not sync show to calendar');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleUnsync = async () => {
    if (!entityId) {
      toast.error('This show is missing its workspace context');
      return;
    }
    setIsSyncing(true);
    try {
      const response = await fetch('/api/calendar/sync', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'X-Entity-Id': entityId },
        body: JSON.stringify({ showId: show.id }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to remove calendar event');
      setIsSynced(false);
      toast.success('Show removed from Google Calendar');
      onSyncSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not remove calendar event');
    } finally {
      setIsSyncing(false);
    }
  };

  if (isCheckingStatus) {
    return (
      <Button variant={variant} size={size} disabled className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (!isConnected) {
    return (
      <Button
        variant={variant}
        size={size}
        onClick={handleConnect}
        className={className}
      >
        <Calendar className="h-4 w-4 mr-2" />
        Connect Calendar
      </Button>
    );
  }

  if (isSynced) {
    return (
      <Button
        variant="secondary"
        size={size}
        className={className}
        onClick={handleUnsync}
        disabled={isSyncing}
      >
        {isSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2 text-semantic-success" />}
        {isSyncing ? 'Removing...' : 'Synced'}
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSync}
      disabled={isSyncing}
      className={className}
    >
      {isSyncing ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <Calendar className="h-4 w-4 mr-2" />
          Add to Calendar
        </>
      )}
    </Button>
  );
}
