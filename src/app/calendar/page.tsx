"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, MapPin } from "lucide-react";

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
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('month');
  const [isConnected, setIsConnected] = useState(false);

  // Check calendar connection status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/calendar/status');
        const data = await response.json();
        setIsConnected(data.connected);
      } catch (error) {
        console.error('Error checking calendar status:', error);
      }
    };
    checkStatus();
  }, []);

  // Fetch calendar events
  useEffect(() => {
    const fetchEvents = async () => {
      if (!isConnected) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Get date range for current view
        const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

        const response = await fetch(
          `/api/calendar/events?timeMin=${startOfMonth.toISOString()}&timeMax=${endOfMonth.toISOString()}`
        );

        if (!response.ok) {
          throw new Error('Failed to fetch events');
        }

        const data = await response.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error('Error fetching events:', error);
        toast.error('Failed to load calendar events');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEvents();
  }, [currentDate, isConnected]);

  // Calendar navigation
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Get calendar days for the month
  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days = [];
    const currentDay = new Date(startDate);

    // Generate 6 weeks of days
    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        days.push(new Date(currentDay));
        currentDay.setDate(currentDay.getDate() + 1);
      }
    }

    return days;
  };

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => {
      const eventDate = new Date(event.start.dateTime);
      return (
        eventDate.getDate() === day.getDate() &&
        eventDate.getMonth() === day.getMonth() &&
        eventDate.getFullYear() === day.getFullYear()
      );
    });
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const calendarDays = getCalendarDays();
  const monthName = currentDate.toLocaleString('en-US', { month: 'long', year: 'numeric' });

  if (!isConnected) {
    return (
      <div className="scene-page">
        <div className="page-heading-container">
          <div>
            <p className="page-heading">Calendar</p>
            <p className="page-subheading">View your show schedule</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center py-20">
          <CalendarIcon size={64} className="text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold mb-2">Google Calendar Not Connected</h3>
          <p className="text-gray-600 mb-6">Connect your Google Calendar to view your events here</p>
          <button
            onClick={() => {
              if (Capacitor.isNativePlatform()) return;
              window.location.href = '/api/calendar/connect';
            }}
            disabled={Capacitor.isNativePlatform()}
            className="group relative px-5 py-2.5 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-gray-400 hover:shadow-md transition-all duration-200 flex items-center gap-3 shadow-sm overflow-hidden"
          >
            <div className="flex-shrink-0 w-5 h-5">
              <svg width="20" height="20" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                <path fill="none" d="M0 0h48v48H0z"/>
              </svg>
            </div>
            <span className="text-[15px] font-medium text-gray-700 tracking-tight">
              {Capacitor.isNativePlatform() ? 'Connect Calendar on the website' : 'Connect Google Calendar'}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="scene-page h-[calc(100vh-5rem)] overflow-y-auto scrollable">
      <div className="page-heading-container mb-6">
        <div>
          <p className="page-heading">Calendar</p>
          <p className="page-subheading">View your show schedule from Google Calendar</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={goToToday}
            className="px-4 py-2 bg-surface-elevated hover:bg-surface-elevated/80 rounded-lg text-sm font-medium transition-colors"
          >
            Today
          </button>
        </div>
      </div>

      {/* Calendar Header */}
      <div className="panel-dark p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={goToPrevMonth}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-2xl font-bold text-foreground">{monthName}</h2>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
          <div className="text-sm text-text-secondary">
            {events.length} event{events.length !== 1 ? 's' : ''} this month
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-cyan"></div>
          </div>
        ) : (
          <>
            {/* Day names */}
            <div className="grid grid-cols-7 gap-px mb-px bg-white/10">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div
                  key={day}
                  className="bg-white/60 p-3 text-center text-sm font-semibold text-text-secondary"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-px bg-white/10 border border-black/10">
              {calendarDays.map((day, index) => {
                const isCurrentMonth = day.getMonth() === currentDate.getMonth();
                const isToday =
                  day.getDate() === new Date().getDate() &&
                  day.getMonth() === new Date().getMonth() &&
                  day.getFullYear() === new Date().getFullYear();
                const dayEvents = getEventsForDay(day);

                return (
                  <div
                    key={index}
                    className={`
                      bg-bg-surface min-h-[120px] p-2 relative
                      ${!isCurrentMonth ? 'bg-surface-elevated/30' : ''}
                      ${isToday ? 'ring-2 ring-primary ring-inset' : ''}
                    `}
                  >
                    <div className={`
                      text-sm font-medium mb-1
                      ${!isCurrentMonth ? 'text-text-tertiary' : ''}
                      ${isToday ? 'text-primary font-bold' : ''}
                    `}>
                      {day.getDate()}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.map((event, idx) => (
                        <div
                          key={event.id || idx}
                          className="text-xs bg-primary/10 text-primary px-2 py-1 rounded truncate hover:bg-primary/20 cursor-pointer transition-colors"
                          title={`${event.summary}\n${formatTime(event.start.dateTime)}${event.location ? `\n${event.location}` : ''}`}
                        >
                          <div className="font-medium truncate">{event.summary}</div>
                          <div className="text-[10px] opacity-80">{formatTime(event.start.dateTime)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Events List */}
      {!isLoading && events.length > 0 && (
        <div className="panel-dark p-6">
          <h3 className="text-lg font-semibold mb-4 text-foreground">All Events This Month</h3>
          <div className="space-y-3">
            {events
              .sort((a, b) => new Date(a.start.dateTime).getTime() - new Date(b.start.dateTime).getTime())
              .map((event, idx) => (
                <div
                  key={event.id || idx}
                  className="p-4 bg-white/60 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold text-base mb-1 text-foreground">{event.summary}</h4>
                      {event.description && (
                        <p className="text-sm text-text-secondary mb-2">{event.description}</p>
                      )}
                      <div className="flex flex-wrap gap-3 text-sm text-text-secondary">
                        <div className="flex items-center gap-1">
                          <CalendarIcon size={14} />
                          {new Date(event.start.dateTime).toLocaleDateString('en-US', {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </div>
                        <div>
                          {formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}
                        </div>
                        {event.location && (
                          <div className="flex items-center gap-1">
                            <MapPin size={14} /> {event.location}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {!isLoading && events.length === 0 && (
        <div className="panel-dark p-12 text-center">
          <CalendarIcon size={48} className="mx-auto text-text-secondary mb-4" />
          <h3 className="text-lg font-semibold mb-2 text-foreground">No Events This Month</h3>
          <p className="text-text-secondary">
            You don't have any events scheduled in {monthName}
          </p>
        </div>
      )}
    </div>
  );
}
