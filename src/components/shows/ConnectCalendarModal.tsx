'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar, Check } from 'lucide-react';

interface ConnectCalendarModalProps {
  onConnect: () => void;
  onSkip: () => void;
}

export function ConnectCalendarModal({ onConnect, onSkip }: ConnectCalendarModalProps) {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Initiate OAuth flow by redirecting to Google
      onConnect();
    } catch (error) {
      console.error('Error connecting calendar:', error);
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open: boolean) => !open && onSkip()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center justify-center w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10">
            <Calendar className="w-6 h-6 text-primary" />
          </div>
          <DialogTitle className="text-center text-2xl">
            Connect Your Google Calendar
          </DialogTitle>
          <DialogDescription className="text-center text-base pt-2">
            Sync your shows to Google Calendar with one click. Never miss a gig!
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-semantic-success/20 dark:bg-semantic-success/20 flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-semantic-success dark:text-semantic-success" />
            </div>
            <div>
              <p className="text-sm font-medium">One-click sync</p>
              <p className="text-xs text-text-tertiary">
                Add shows to your calendar instantly
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-semantic-success/20 dark:bg-semantic-success/20 flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-semantic-success dark:text-semantic-success" />
            </div>
            <div>
              <p className="text-sm font-medium">Automatic reminders</p>
              <p className="text-xs text-text-tertiary">
                Get Google Calendar notifications before each show
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-semantic-success/20 dark:bg-semantic-success/20 flex items-center justify-center mt-0.5">
              <Check className="w-3 h-3 text-semantic-success dark:text-semantic-success" />
            </div>
            <div>
              <p className="text-sm font-medium">Stay organized</p>
              <p className="text-xs text-text-tertiary">
                View all your shows alongside your other events
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-col space-y-2">
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full"
            size="lg"
          >
            {isConnecting ? (
              <>
                <span className="mr-2">Connecting...</span>
              </>
            ) : (
              <>
                <Calendar className="mr-2 h-4 w-4" />
                Connect Google Calendar
              </>
            )}
          </Button>
          <Button
            variant="ghost"
            onClick={onSkip}
            disabled={isConnecting}
            className="w-full"
          >
            Skip for now
          </Button>
        </DialogFooter>

        <p className="text-xs text-center text-text-tertiary mt-4">
          You can connect your calendar anytime from settings
        </p>
      </DialogContent>
    </Dialog>
  );
}
