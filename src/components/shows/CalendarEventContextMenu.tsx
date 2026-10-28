"use client";

import { useState, useEffect, useRef } from 'react';
import { Plus, X, Copy } from 'lucide-react';

interface CalendarEvent {
  id?: string;
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  source?: 'google' | 'scenegen';
  showId?: string;
}

interface CalendarEventContextMenuProps {
  event: CalendarEvent;
  x: number;
  y: number;
  onClose: () => void;
  onAddAsShow: (event: CalendarEvent) => void;
  onViewDetails: (event: CalendarEvent) => void;
  onDuplicate?: (event: CalendarEvent) => void;
}

export default function CalendarEventContextMenu({
  event,
  x,
  y,
  onClose,
  onAddAsShow,
  onViewDetails,
  onDuplicate,
}: CalendarEventContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });
  const isSceneGenShow =
    event.source === 'scenegen' || event.id?.startsWith('show-');

  useEffect(() => {
    // Adjust position if menu would go off screen
    if (menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let adjustedX = x;
      let adjustedY = y;

      if (x + rect.width > viewportWidth) {
        adjustedX = viewportWidth - rect.width - 10;
      }

      if (y + rect.height > viewportHeight) {
        adjustedY = viewportHeight - rect.height - 10;
      }

      setPosition({ x: adjustedX, y: adjustedY });
    }
  }, [x, y]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    // Close on escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed z-[60] bg-background border border-border-subtle rounded-lg shadow-xl py-1 min-w-[200px]"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* Event title header */}
      <div className="px-3 py-2 border-b border-border-subtle">
        <div className="text-sm font-semibold truncate" title={event.summary}>
          {event.summary}
        </div>
      </div>

      {/* Menu items */}
      <div className="py-1">
        {!isSceneGenShow && (
          <button
            onClick={() => {
              onAddAsShow(event);
              onClose();
            }}
            className="w-full px-3 py-2 text-sm text-left hover:bg-surface-elevated transition-colors flex items-center gap-2"
          >
            <Plus size={16} className="text-primary" />
            <span>Add to SceneGen</span>
          </button>
        )}

        <button
          onClick={() => {
            onViewDetails(event);
            onClose();
          }}
          className="w-full px-3 py-2 text-sm text-left hover:bg-surface-elevated transition-colors flex items-center gap-2"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>{isSceneGenShow ? 'Edit Show' : 'View Details'}</span>
        </button>

        {onDuplicate && !isSceneGenShow && (
          <>
            <div className="border-t border-border-subtle my-1" />
            <button
              onClick={() => {
                onDuplicate(event);
                onClose();
              }}
              className="w-full px-3 py-2 text-sm text-left hover:bg-surface-elevated transition-colors flex items-center gap-2"
            >
              <Copy size={16} className="text-blue-500" />
              <span>Duplicate Event</span>
            </button>
          </>
        )}

        <div className="border-t border-border-subtle my-1" />

        <button
          onClick={onClose}
          className="w-full px-3 py-2 text-sm text-left hover:bg-surface-elevated transition-colors flex items-center gap-2 text-text-tertiary"
        >
          <X size={16} />
          <span>Close</span>
        </button>
      </div>
    </div>
  );
}
