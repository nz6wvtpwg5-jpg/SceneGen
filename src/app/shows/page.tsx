"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useOnboardingRedirect } from "@/hooks/useOnboardingRedirect";
import { useShows } from "@/hooks/useShows";
import { useTours } from "@/hooks/useTours";
import { useBudgets } from "@/hooks/useBudgets";
import type { Show, ShowStatus } from "@/types/show";
import type { Tour } from "@/types/tour";
import type { Budget } from "@/types/budget";
import { CircleAlert, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Coins, FileSpreadsheet } from "lucide-react";
import CreateShowForm from "@/components/shows/CreateShowForm";
import CalendarConversion from "@/components/shows/CalendarConversion";
import ShowsTable from "@/components/shows/ShowsTable";
import BulkActionsToolbar from "@/components/shows/BulkActionsToolbar";
import AddToTourModal from "@/components/shows/AddToTourModal";
import GoogleCalendarConnectModal from "@/components/shows/GoogleCalendarConnectModal";
import CalendarEventModal from "@/components/shows/CalendarEventModal";
import CalendarEventContextMenu from "@/components/shows/CalendarEventContextMenu";
import { ListSkeleton, ShowCardSkeleton } from "@/components/ui/skeleton";
import { NoShowsYet } from "@/components/ui/empty-state";
import { useConfirmDialog } from "@/components/ui/confirm-dialog-provider";
import { MobileShowsSchedule } from "@/components/shows/mobile-shows-schedule";
import { useCountRefreshStore } from "@/store/useCountRefreshStore";
import { apiCache } from "@/lib/api-cache";
import { getEntityId } from "@/lib/entity";

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
  source?: 'google' | 'scenegen'; // Track event source for different styling
  showId?: string; // Link to the show if this is a SceneGen show
}

/**
 * Shows Page
 * Implements BUILD_PLAN Week 2, Task 2.10 & Week 7 Tasks 7.3-7.8
 * Features:
 * - Show cards with status badges
 * - Filter by status and tour
 * - Create Show button → modal
 * - Edit/Cancel actions
 * - Bulk selection and actions
 * - Add to Tour functionality
 */
export default function Shows() {
  const confirmDialog = useConfirmDialog();
  const router = useRouter();
  const { data: session } = useSession();
  const { isChecking: isCheckingEntities } = useOnboardingRedirect();
  const { fetchShows, cancelShow, deleteShow, isLoading, error } = useShows();
  const { fetchTours, removeShowsFromTour } = useTours();
  const { budgets } = useBudgets({ search: '' });
  const refreshShows = useCountRefreshStore((state) => state.refreshShows);

  const [shows, setShows] = useState<Show[]>([]);
  const [tours, setTours] = useState<Tour[]>([]);
  const [timeFilter, setTimeFilter] = useState<"upcoming" | "past" | "all">("upcoming");
  const [statusFilter, setStatusFilter] = useState<ShowStatus | "pending" | "all">("all");
  const [tourFilter, setTourFilter] = useState<string | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedShowIds, setSelectedShowIds] = useState<string[]>([]);
  const [showAddToTourModal, setShowAddToTourModal] = useState(false);
  const [showCalendarConnectModal, setShowCalendarConnectModal] = useState(false);
  const [showCalendarExpiredModal, setShowCalendarExpiredModal] = useState(false);
  const [selectedCalendarEvent, setSelectedCalendarEvent] = useState<CalendarEvent | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    event: CalendarEvent;
    x: number;
    y: number;
  } | null>(null);
  const [eventToConvertToShow, setEventToConvertToShow] = useState<CalendarEvent | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showToEdit, setShowToEdit] = useState<Show | null>(null);

  // Google Calendar state
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [importCalendarTour,setImportCalendarTour] = useState(false);
  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [isLoadingCalendar, setIsLoadingCalendar] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showCalendarView, setShowCalendarView] = useState(true);
  const [activeTab, setActiveTab] = useState<'shows' | 'routing'>('shows');

  // Dashboard creation links open the existing form immediately. Consume only
  // this parameter so cancelling or refreshing does not reopen the form.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("create") !== "show") return;
    setShowCreateModal(true);
    url.searchParams.delete("create");
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  // Calendar connection is user initiated. Never interrupt page entry with OAuth.
  useEffect(() => {
    const openConnectionPanel = () => setShowCalendarConnectModal(true);
    window.addEventListener('scenegen:connect-calendar', openConnectionPanel);
    return () => window.removeEventListener('scenegen:connect-calendar', openConnectionPanel);
  }, []);

  // Handle OAuth callback success
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const calendarConnected = urlParams.get("calendar_connected");
    const error = urlParams.get("error");

    if (calendarConnected === "true") {
      localStorage.setItem("google-calendar-connected", "true");
      toast.success("Google Calendar connected successfully.");
      // Clean up URL
      window.history.replaceState({}, "", "/shows");
    } else if (error) {
      const errorMessages: Record<string, string> = {
        calendar_auth_failed: "Calendar connection was cancelled.",
        no_auth_code: "No authorization code received.",
        calendar_auth_error: "Failed to connect calendar. Please try again.",
      };
      toast.error(errorMessages[error] || "Failed to connect calendar.");
      // Clean up URL
      window.history.replaceState({}, "", "/shows");
    }
  }, []);

  // Check calendar connection status
  useEffect(() => {
    const checkStatus = async () => {
      // Wait for session to be authenticated
      if (!session?.user?.id) return;

      try {
        const response = await fetch("/api/calendar/status");
        const data = await response.json();
        if (!response.ok || data.temporarilyUnavailable) return;
        setIsCalendarConnected(Boolean(data.connected));

        if (data.connected) {
          localStorage.setItem("google-calendar-connected", "true");
        }
      } catch (error) {
        console.error("Error checking calendar status:", error);
      }
    };
    checkStatus();
  }, [session?.user?.id]);

  // Function to fetch calendar events
  const fetchCalendarEvents = async () => {
    if (!isCalendarConnected || !session?.user?.id) return;

    try {
      setIsLoadingCalendar(true);

      // Get date range for current month
      const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      // Set to the last day of month at 23:59:59 to include the entire last day
      const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0, 23, 59, 59);

      const response = await fetch(
        `/api/calendar/events?timeMin=${startOfMonth.toISOString()}&timeMax=${endOfMonth.toISOString()}`
      );

      if (!response.ok) {
        const failure = await response.json().catch(() => null);
        if (failure?.reconnectRequired) {
          setShowCalendarExpiredModal(true);
        } else {
          toast.error("Google Calendar is temporarily unavailable. Please retry.");
        }
        return;
      }

      const data = await response.json();
      setCalendarEvents(data.events || []);
    } catch {
      toast.error("Google Calendar is temporarily unavailable. Please retry.");
    } finally {
      setIsLoadingCalendar(false);
    }
  };

  // Fetch calendar events when calendar is connected
  useEffect(() => {
    if (!isCalendarConnected || !session?.user?.id) return;
    const refreshTimer = window.setTimeout(() => void fetchCalendarEvents(), 0);
    return () => window.clearTimeout(refreshTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentDate, isCalendarConnected, session?.user?.id]);

  // Refetch shows data (used after calendar sync)
  const refetchShows = async () => {
    try {
      const showsData = await fetchShows();
      setShows(showsData);
    } catch (err) {
      console.error("Failed to refetch shows:", err);
      toast.error("Failed to refresh shows");
    }
  };

  // Fetch shows and tours on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Fetch shows and tours separately to handle errors independently
        const showsData = await fetchShows();
        setShows(showsData);

        // Try to fetch tours, but don't fail if it doesn't work
        try {
          const toursData = await fetchTours();
          setTours(toursData);
        } catch (tourError) {
          console.warn("Failed to fetch tours (non-critical):", tourError);
          setTours([]);
        }
      } catch (err: any) {
        console.error("Failed to fetch data:", err);

        // Gracefully handle backend being unavailable during development
        toast.error('Unable to load SceneGen workspace data. Your existing records have not been changed.');
      }
    };

    // Wait for both session to be ready and entities check to complete
    if (!isCheckingEntities && session?.user?.id) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCheckingEntities, session?.user?.id]);

  // Combine Google Calendar events with SceneGen shows for calendar display
  const allCalendarEvents = useMemo(() => {
    // Start with Google Calendar events (marked as 'google' source)
    const googleEvents: CalendarEvent[] = calendarEvents.map(event => ({
      ...event,
      source: 'google' as const
    }));

    // Convert shows to calendar events (marked as 'scenegen' source)
    const showEvents: CalendarEvent[] = shows
      .filter(show => show.showDate) // Only include shows with valid dates
      .map(show => {
        try {
          // Parse the show date and time
          const showDatePart = show.showDate.split('T')[0]; // Get YYYY-MM-DD
          const showTime = show.showTime || '20:00'; // Default to 8 PM if no time
          const doorsTime = show.doorsTime || '19:00'; // Default to 7 PM if no doors time

          // Ensure time formats are valid (HH:MM or HH:MM:SS)
          const normalizeTime = (time: string) => {
            const parts = time.split(':');
            if (parts.length >= 2) {
              return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
            }
            return '20:00'; // Fallback
          };

          const normalizedDoorsTime = normalizeTime(doorsTime);
          const normalizedShowTime = normalizeTime(showTime);

          // Create start date/time (doors time)
          const startDateTime = new Date(`${showDatePart}T${normalizedDoorsTime}:00`);

          // Create end date/time (show time + 3 hours for typical show duration)
          const endDateTime = new Date(`${showDatePart}T${normalizedShowTime}:00`);
          endDateTime.setHours(endDateTime.getHours() + 3); // Add 3 hours

          // Validate dates
          if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
            console.warn('Invalid date/time for show:', show.id, showDatePart, normalizedDoorsTime, normalizedShowTime);
            return null;
          }

          return {
            id: `show-${show.id}`,
            summary: show.venueName || show.venueCity || 'Show location TBC',
            description: show.notes || undefined,
            location: [show.venueAddress, show.venueCity, show.venueState, show.venueCountry].filter(Boolean).join(', '),
            start: {
              dateTime: startDateTime.toISOString(),
              timeZone: 'UTC'
            },
            end: {
              dateTime: endDateTime.toISOString(),
              timeZone: 'UTC'
            },
            source: 'scenegen' as const,
            showId: show.id
          } as CalendarEvent;
        } catch (error) {
          console.error('Error converting show to calendar event:', show.id, error);
          return null;
        }
      })
      .filter((event): event is NonNullable<typeof event> => event !== null); // Remove any null entries

    // Combine both arrays
    return [...googleEvents, ...showEvents];
  }, [calendarEvents, shows]);

  // Apply filters with useMemo for performance
  const filteredShows = useMemo(() => {
    let filtered = shows;

    // Status filter
    if (statusFilter === "pending") {
      filtered = filtered.filter((show) => show.status === "pending_invite" || show.status === "pending_acceptance");
    } else if (statusFilter !== "all") {
      filtered = filtered.filter((show) => show.status === statusFilter);
    }

    // Tour filter
    if (tourFilter !== "all") {
      if (tourFilter === "standalone") {
        filtered = filtered.filter((show) => !show.tourId);
      } else {
        filtered = filtered.filter((show) => show.tourId === tourFilter);
      }
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (show) =>
          (show.venueName || '').toLowerCase().includes(query) || (show.venueCity || '').toLowerCase().includes(query)
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dated = filtered.map((show) => {
      const datePart = show.showDate?.split('T')[0];
      if (!datePart) return { show, date: null };
      const [year, month, day] = datePart.split('-').map(Number);
      return { show, date: new Date(year, month - 1, day) };
    });

    return dated
      .filter(({ date }) => {
        if (timeFilter === "all") return true;
        if (!date) return false;
        return timeFilter === "upcoming" ? date >= today : date < today;
      })
      .sort((a, b) => {
        if (!a.date) return 1;
        if (!b.date) return -1;
        return timeFilter === "past"
          ? b.date.getTime() - a.date.getTime()
          : a.date.getTime() - b.date.getTime();
      })
      .map(({ show }) => show);
  }, [timeFilter, statusFilter, tourFilter, searchQuery, shows]);

  const timeCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let upcoming = 0;
    let past = 0;
    shows.forEach((show) => {
      const datePart = show.showDate?.split('T')[0];
      if (!datePart) return;
      const [year, month, day] = datePart.split('-').map(Number);
      const showDate = new Date(year, month - 1, day);
      if (showDate >= today) upcoming += 1;
      else past += 1;
    });
    return { upcoming, past, all: shows.length };
  }, [shows]);

  const statusCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inTimeRange = shows.filter((show) => {
      if (timeFilter === "all") return true;
      const datePart = show.showDate?.split('T')[0];
      if (!datePart) return false;
      const [year, month, day] = datePart.split('-').map(Number);
      const showDate = new Date(year, month - 1, day);
      return timeFilter === "upcoming" ? showDate >= today : showDate < today;
    });
    return {
      all: inTimeRange.length,
      confirmed: inTimeRange.filter((show) => show.status === "confirmed").length,
      pending: inTimeRange.filter((show) => show.status === "pending_invite" || show.status === "pending_acceptance").length,
      draft: inTimeRange.filter((show) => show.status === "draft").length,
      cancelled: inTimeRange.filter((show) => show.status === "cancelled").length,
    };
  }, [shows, timeFilter]);

  const handleCreateSuccess = async () => {
    setShowCreateModal(false);
    toast.success("Show created successfully!");
    // Refresh shows list
    try {
      const data = await fetchShows();
      setShows(data);
    } catch (err) {
      console.error("Failed to refresh shows:", err);
      toast.error("Failed to refresh shows list");
    }
  };

  const handleCancelShow = async (showId: string) => {
    if (!await confirmDialog({
      title: 'Cancel this show?',
      description: 'The show will remain in SceneGen with a cancelled status.',
      confirmLabel: 'Cancel show',
      tone: 'destructive',
    })) {
      return;
    }

    try {
      await cancelShow(showId);
      toast.success("Show cancelled successfully");
      // Refresh shows list
      const data = await fetchShows();
      setShows(data);
      // Clear selection if cancelled show was selected
      setSelectedShowIds((prev) => prev.filter((id) => id !== showId));
    } catch (err) {
      console.error("Failed to cancel show:", err);
      toast.error("Failed to cancel show. Please try again.");
    }
  };

  const handleEditShow = (show: Show) => {
    setShowToEdit(show);
    setShowEditModal(true);
  };

  /**
   * Resolve a SceneGen calendar representation back to the real Show.
   *
   * SceneGen shows deliberately use synthetic calendar IDs in the form
   * "show-<showId>" so they can coexist with Google Calendar events in
   * the calendar UI. Those IDs must never be sent to Google Calendar.
   */
  const getSceneGenShowForCalendarEvent = (
    event: CalendarEvent
  ): Show | undefined => {
    const showId =
      event.showId ||
      (event.id?.startsWith("show-")
        ? event.id.slice("show-".length)
        : undefined);

    return showId ? shows.find((show) => show.id === showId) : undefined;
  };

  /**
   * Open the correct editor for the selected calendar item.
   *
   * - SceneGen show -> SceneGen show editor
   * - Google event  -> Google Calendar event modal
   */
  const handleOpenCalendarItem = (event: CalendarEvent) => {
    if (event.source === "scenegen" || event.id?.startsWith("show-")) {
      const show = getSceneGenShowForCalendarEvent(event);

      if (!show) {
        toast.error(
          "Unable to open this SceneGen show. Please refresh and try again."
        );
        return;
      }

      handleEditShow(show);
      return;
    }

    setSelectedCalendarEvent(event);
  };

  const handleDeleteShow = async (showId: string) => {
    if (!await confirmDialog({
      title: 'Permanently delete this show?',
      description: 'This action cannot be undone.',
      confirmLabel: 'Delete show',
      tone: 'destructive',
    })) {
      return;
    }

    try {
      await deleteShow(showId);
      toast.success("Show deleted successfully");
      // Bust the sidebar badge cache and trigger a re-fetch
      apiCache.invalidate(`show-count-${getEntityId()}`);
      refreshShows();
      // Refresh shows list
      const data = await fetchShows();
      setShows(data);
      // Clear selection if deleted show was selected
      setSelectedShowIds((prev) => prev.filter((id) => id !== showId));
    } catch (err) {
      console.error("Failed to delete show:", err);
      toast.error("Failed to delete show. Please try again.");
    }
  };

  const handleAddToTourSuccess = async () => {
    setShowAddToTourModal(false);
    setSelectedShowIds([]);
    toast.success("Shows added to tour successfully!");
    // Refresh shows
    try {
      const data = await fetchShows();
      setShows(data);
    } catch (err) {
      console.error("Failed to refresh shows:", err);
      toast.error("Failed to refresh shows list");
    }
  };

  const handleRemoveFromTour = async () => {
    if (!await confirmDialog({
      title: `Remove ${selectedShowIds.length} show${selectedShowIds.length === 1 ? '' : 's'} from their tours?`,
      description: 'The shows will remain in SceneGen as standalone shows.',
      confirmLabel: 'Remove from tours',
      tone: 'destructive',
    })) {
      return;
    }

    try {
      await removeShowsFromTour(selectedShowIds);
      setSelectedShowIds([]);
      toast.success("Shows removed from tours successfully");
      // Refresh shows
      const data = await fetchShows();
      setShows(data);
    } catch (err) {
      console.error("Failed to remove shows from tour:", err);
      toast.error("Failed to remove shows from tours. Please try again.");
    }
  };

  // Calendar event handlers
  const handleUpdateCalendarEvent = async (eventId: string, updatedEvent: Partial<CalendarEvent>) => {
    // Defensive protection: synthetic SceneGen IDs are not Google event IDs.
    if (eventId.startsWith("show-")) {
      console.error(
        "Blocked SceneGen show from Google Calendar update route:",
        eventId
      );
      throw new Error("SceneGen shows must be edited in the show editor");
    }

    try {
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedEvent),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Update failed:", errorData);
        throw new Error(
          errorData.details ||
          errorData.error ||
          "Failed to update event"
        );
      }


      // If the event date changed, navigate to the new month
      if (updatedEvent.start?.dateTime) {
        const newEventDate = new Date(updatedEvent.start.dateTime);
        const currentMonth = currentDate.getMonth();
        const currentYear = currentDate.getFullYear();
        const newMonth = newEventDate.getMonth();
        const newYear = newEventDate.getFullYear();

        if (currentMonth !== newMonth || currentYear !== newYear) {
          setCurrentDate(newEventDate);
        }
      }

      await fetchCalendarEvents();

      if (selectedCalendarEvent && selectedCalendarEvent.id === eventId) {
        setSelectedCalendarEvent({
          ...selectedCalendarEvent,
          ...updatedEvent,
        });
      }
    } catch (error) {
      console.error("Failed to update calendar event:", error);
      throw error;
    }
  };

  const handleCreateCalendarEvent = async (newEvent: Partial<CalendarEvent>) => {
    try {
      const response = await fetch(`/api/calendar/events`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newEvent),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Create failed:", errorData);
        throw new Error(errorData.error || "Failed to create event");
      }

      await fetchCalendarEvents();
    } catch (error) {
      console.error("Failed to create calendar event:", error);
      throw error;
    }
  };

  const handleDuplicateCalendarEvent = (event: CalendarEvent) => {
    const startDate = new Date(event.start.dateTime);
    const endDate = new Date(event.end.dateTime);

    startDate.setDate(startDate.getDate() - 1);
    endDate.setDate(endDate.getDate() - 1);

    const duplicatedEvent: CalendarEvent = {
      summary: event.summary,
      description: event.description,
      location: event.location,
      start: {
        dateTime: startDate.toISOString(),
        timeZone: event.start.timeZone,
      },
      end: {
        dateTime: endDate.toISOString(),
        timeZone: event.end.timeZone,
      },
    };

    setSelectedCalendarEvent(duplicatedEvent);
  };

  const handleDeleteCalendarEvent = async (eventId: string) => {
    try {
      // Check if this is a SceneGen show (ID starts with "show-")
      if (eventId.startsWith('show-')) {
        const showId = eventId.replace('show-', '');

        // Delete the show using the shows API
        await deleteShow(showId);

        // Bust the sidebar badge cache and trigger a re-fetch
        apiCache.invalidate(`show-count-${getEntityId()}`);
        refreshShows();

        // Refresh shows list
        const showsData = await fetchShows();
        setShows(showsData);
      } else {
        // Delete Google Calendar event
        const response = await fetch(`/api/calendar/events/${eventId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          throw new Error("Failed to delete event");
        }

        await fetchCalendarEvents();
      }
    } catch (error) {
      console.error("Failed to delete calendar event:", error);
      throw error;
    }
  };

  // Handle converting calendar event to show
  const handleAddCalendarEventAsShow = (event: CalendarEvent) => {
    if (!event.id || event.source === 'scenegen') return;
    setSelectedCalendarEvent(null);
    setContextMenu(null);
    setEventToConvertToShow(event);
  };

  // Calendar helper functions
  const goToPrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);

    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDay = new Date(startDate);

    for (let week = 0; week < 6; week++) {
      for (let day = 0; day < 7; day++) {
        days.push(new Date(currentDay));
        currentDay.setDate(currentDay.getDate() + 1);
      }
    }

    return days;
  };

  const getEventsForDay = (day: Date) => {
    const filtered = allCalendarEvents.filter((event) => {
      const eventStart = new Date(event.start.dateTime);
      const eventEnd = new Date(event.end.dateTime);

      const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
      const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);

      const matches = eventStart < dayEnd && eventEnd >= dayStart;

      if (matches && day.getDate() === 28) {
      }

      return matches;
    });

    return filtered;
  };

  const isFirstDayOfEvent = (event: CalendarEvent, day: Date) => {
    const eventStart = new Date(event.start.dateTime);
    const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
    const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);

    return eventStart >= dayStart && eventStart < dayEnd;
  };

  const isMultiDayEvent = (event: CalendarEvent) => {
    const eventStart = new Date(event.start.dateTime);
    const eventEnd = new Date(event.end.dateTime);

    const startDay = new Date(eventStart.getFullYear(), eventStart.getMonth(), eventStart.getDate());
    const endDay = new Date(eventEnd.getFullYear(), eventEnd.getMonth(), eventEnd.getDate());

    return endDay > startDay;
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const monthName = currentDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  const calendarDays = getCalendarDays();

  // Show loading while checking entities
  if (isCheckingEntities) {
    return (
      <div className="scene-page">
        <h2 className="text-2xl font-bold">Loading...</h2>
      </div>
    );
  }

  // Count pending shows
  const pendingCount = shows.filter(
    (show) => show.status === "pending_invite" || show.status === "pending_acceptance"
  ).length;

  const selectedShows = shows.filter((s) => selectedShowIds.includes(s.id));

  // Helper function to get budget for a show
  const getBudgetForShow = (showId: string): Budget | undefined => {
    const budget = budgets.find(budget => budget.showId === showId);
    // Debug logging
    if (budget) {
    }
    return budget;
  };

  // Helper function to get currency symbol
  const getCurrencySymbol = (currencyCode: string): string => {
    const currencyMap: Record<string, string> = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'CAD': 'C$',
      'AUD': 'A$',
      'JPY': '¥',
      'CHF': 'CHF',
      'CNY': '¥',
      'SEK': 'kr',
      'NZD': 'NZ$',
    };
    return currencyMap[currencyCode] || currencyCode;
  };

  // The rail follows the same time and status filters as the main list.
  const railShows = filteredShows;

  // ✅ Only use the right-rail layout when calendar view is active and connected.
  const showRightRail = isCalendarConnected && showCalendarView;

  return (
    <div className="scene-page mx-auto max-w-none space-y-8">
      <MobileShowsSchedule
        shows={filteredShows} tours={tours} loading={isLoading} error={error}
        pendingCount={pendingCount} timeFilter={timeFilter} timeCounts={timeCounts}
        statusFilter={statusFilter} tourFilter={tourFilter} searchQuery={searchQuery}
        onTimeFilter={setTimeFilter} onStatusFilter={setStatusFilter}
        onTourFilter={setTourFilter} onSearch={setSearchQuery} onAdd={() => setShowCreateModal(true)}
      />
      <div className="hidden flex-col gap-6 border-b border-black/10 pb-8 sm:flex sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="scene-kicker">Forward schedule</p>
          <div className="mt-3 flex items-center gap-3">
          <h1 className="text-5xl font-black tracking-[-0.05em] text-[#151713]">Shows</h1>
          <button
            onClick={() => router.push('/routing')}
            className="rounded-full border border-black/15 bg-transparent px-4 py-1.5 text-xs font-black uppercase tracking-[0.12em] text-[#151713] transition hover:bg-[#11140f] hover:text-[#f7f2e8]"
          >
            Routing
          </button>
          </div>
          <p className="scene-copy">Confirmed dates, working holds and every movement still taking shape.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
          {!isCalendarConnected && (
            <button
              onClick={() => setShowCalendarConnectModal(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/15 bg-transparent px-5 text-sm font-bold text-[#151713] transition hover:bg-white/60"
              type="button"
            >
              <div className="flex-shrink-0 w-4 h-4">
                <svg width="16" height="16" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  <path fill="none" d="M0 0h48v48H0z"/>
                </svg>
              </div>
              <span>Connect Google Calendar</span>
            </button>
          )}

          <button
            onClick={() => router.push('/import')}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/15 bg-transparent px-5 text-sm font-bold text-[#151713] transition hover:bg-white/60"
            type="button"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Import from CSV
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[#ff5a36] px-6 text-sm font-bold text-white shadow-[0_10px_24px_rgba(255,90,54,0.2)] transition hover:bg-[#e54525]"
            type="button"
          >
            Add show
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="hidden border-b border-black/10 sm:block">
        <div className="flex gap-6">
          <button
            onClick={() => setActiveTab('shows')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'shows'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-tertiary hover:text-foreground hover:border-border-subtle'
            }`}
            type="button"
          >
            Shows
          </button>
          <button
            onClick={() => setActiveTab('routing')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'routing'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-tertiary hover:text-foreground hover:border-border-subtle'
            }`}
            type="button"
          >
            Routing
          </button>
        </div>
      </div>

      <div className="hidden sm:block">
      {activeTab === 'shows' && (
        <>
          {pendingCount > 0 && (
        <div className="rounded-xl border border-border-subtle bg-surface-elevated px-5 py-4">
          <div className="flex items-start gap-3">
            <CircleAlert className="mt-0.5 h-5 w-5 text-text-tertiary" />
            <p className="text-sm text-foreground">
              You have <span className="font-semibold">{pendingCount}</span> show{pendingCount > 1 ? "s" : ""} pending response.
              <span className="font-semibold"> View them now</span>
            </p>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="scene-panel space-y-5 rounded-[22px] p-5 md:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* View Toggle */}
          <div className="inline-flex w-fit items-center gap-1 rounded-lg bg-surface-elevated p-1">
            <button
              onClick={() => setShowCalendarView(true)}
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition ${
                showCalendarView ? "bg-surface-hover text-foreground shadow-sm" : "text-text-tertiary hover:text-foreground"
              } ${!isCalendarConnected ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={!isCalendarConnected}
              title={!isCalendarConnected ? "Connect Google Calendar to use this view" : "Calendar view"}
              type="button"
            >
              <CalendarIcon className="mr-1.5 h-4 w-4" />
              Calendar
            </button>
            <button
              onClick={() => setShowCalendarView(false)}
              className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition ${
                !showCalendarView ? "bg-surface-hover text-foreground shadow-sm" : "text-text-tertiary hover:text-foreground"
              }`}
              title="List view"
              type="button"
            >
              <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              List
            </button>
          </div>

          {/* Time is the primary way users browse their schedule. */}
          <div className="inline-flex flex-wrap gap-1 rounded-full bg-[#e7e0d4] p-1">
            <button
              onClick={() => setTimeFilter("upcoming")}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                timeFilter === "upcoming" ? "bg-[#11140f] text-[#f7f2e8] shadow-sm" : "text-[#666a61] hover:text-[#151713]"
              }`}
              type="button"
            >
              Upcoming ({timeCounts.upcoming})
            </button>
            <button
              onClick={() => setTimeFilter("past")}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                timeFilter === "past" ? "bg-[#11140f] text-[#f7f2e8] shadow-sm" : "text-[#666a61] hover:text-[#151713]"
              }`}
              type="button"
            >
              Past ({timeCounts.past})
            </button>
            <button
              onClick={() => setTimeFilter("all")}
              className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                timeFilter === "all" ? "bg-[#11140f] text-[#f7f2e8] shadow-sm" : "text-[#666a61] hover:text-[#151713]"
              }`}
              type="button"
            >
              All ({timeCounts.all})
            </button>
          </div>
        </div>

        {/* Tour Filter & Search */}
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Booking status</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ShowStatus | "pending" | "all")}
              className="w-full rounded-[14px] border border-black/15 bg-white px-4 py-2 text-sm text-[#151713] shadow-sm focus:border-[#ff5a36]/70 focus:outline-none focus:ring-4 focus:ring-[#ff5a36]/10"
            >
              <option value="all">Any status ({statusCounts.all})</option>
              <option value="confirmed">Confirmed ({statusCounts.confirmed})</option>
              <option value="pending">Pending ({statusCounts.pending})</option>
              <option value="draft">Draft ({statusCounts.draft})</option>
              <option value="cancelled">Cancelled ({statusCounts.cancelled})</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Filter by Tour</label>
            <select
              value={tourFilter}
              onChange={(e) => setTourFilter(e.target.value)}
              className="w-full rounded-lg border border-border-subtle bg-background px-4 py-2 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">All Tours</option>
              <option value="standalone">Standalone Shows</option>
              {tours.map((tour) => (
                <option key={tour.id} value={tour.id}>
                  {tour.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-foreground">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by venue or city..."
              className="w-full rounded-lg border border-border-subtle bg-background px-4 py-2 text-sm text-foreground shadow-sm placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>
        </div>
      </div>

      {/* ✅ MAIN CONTENT LAYOUT:
          - If calendar view is active, we use a 2-column layout (calendar left, shows right).
          - Otherwise (list view), we keep the existing single-column behavior.
      */}
      {showRightRail ? (
        <div className="grid gap-6 lg:grid-cols-[1fr_420px] items-start">
          {/* LEFT: Calendar */}
          <div className="panel-dark p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <h3 className="text-lg font-semibold text-foreground">Google Calendar</h3>
                <button type="button" onClick={()=>setImportCalendarTour(true)} className="rounded-full border border-[#ff5a36] px-3 py-2 text-xs font-bold text-[#e84a2d]">Add dates to SceneGen</button>
                <div className="flex items-center gap-2">
                  <button onClick={goToPrevMonth} className="p-1 hover:bg-surface-hover rounded transition-colors">
                    <ChevronLeft size={20} />
                  </button>
                  <span className="text-sm font-medium min-w-[150px] text-center text-foreground">{monthName}</span>
                  <button onClick={goToNextMonth} className="p-1 hover:bg-surface-hover rounded transition-colors">
                    <ChevronRight size={20} />
                  </button>
                  <button
                    onClick={goToToday}
                    className="ml-2 px-3 py-1 bg-surface-elevated hover:bg-surface-hover rounded text-xs font-medium transition-colors"
                  >
                    Today
                  </button>
                </div>
                {!isLoadingCalendar && (
                  <span className="text-sm text-text-tertiary">
                    {calendarEvents.length} event{calendarEvents.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
            </div>

            {/* Color Legend */}
            <div className="flex items-center gap-4 mb-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-green-500/15 border-l-2 border-green-500"></div>
                <span className="text-text-secondary">SceneGen Shows</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-primary/10"></div>
                <span className="text-text-secondary">Calendar Events</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-accent-purple/10 border-l-2 border-accent-purple/60"></div>
                <span className="text-text-secondary">Multi-day Events</span>
              </div>
            </div>

            {isLoadingCalendar ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* Day names */}
                <div className="grid grid-cols-7 gap-px mb-px bg-surface-hover">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <div
                      key={day}
                      className="bg-surface-elevated p-2 text-center text-xs font-semibold text-text-tertiary"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-px bg-surface-hover border border-border-subtle rounded-lg overflow-hidden">
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
                          bg-background min-h-[80px] p-1.5 relative
                          ${!isCurrentMonth ? "opacity-40" : ""}
                          ${isToday ? "ring-2 ring-primary/40 ring-inset" : ""}
                        `}
                      >
                        <div
                          className={`
                            text-xs font-medium mb-1
                            ${!isCurrentMonth ? "text-text-tertiary" : "text-foreground"}
                            ${isToday ? "text-primary font-bold" : ""}
                          `}
                        >
                          {day.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 2).map((event, idx) => {
                            const isFirstDay = isFirstDayOfEvent(event, day);
                            const isMultiDay = isMultiDayEvent(event);
                            const isSceneGenShow = event.source === 'scenegen';

                            // Color scheme:
                            // - Google Calendar multi-day: Purple
                            // - Google Calendar single-day: Blue (primary)
                            // - SceneGen shows: Green/Teal
                            const colorClasses = isSceneGenShow
                              ? "bg-green-500/15 text-green-600 hover:bg-green-500/25 border-l-2 border-green-500"
                              : isMultiDay
                              ? "bg-accent-purple/10 text-accent-purple hover:bg-accent-purple/20 border-l-2 border-accent-purple/60"
                              : "bg-primary/10 text-primary hover:bg-primary/20";

                            return (
                              <div
                                key={event.id || idx}
                                onClick={() => handleOpenCalendarItem(event)}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setContextMenu({
                                    event,
                                    x: e.clientX,
                                    y: e.clientY,
                                  });
                                }}
                                className={`
                                  text-[10px] px-1.5 py-0.5 rounded truncate cursor-pointer transition-colors
                                  ${colorClasses}
                                `}
                                title={`${event.summary}\n${formatTime(event.start.dateTime)} - ${formatTime(event.end.dateTime)}${
                                  event.location ? `\n${event.location}` : ""
                                }${isMultiDay ? "\n(Multi-day event)" : ""}${isSceneGenShow ? "\n(SceneGen Show)" : "\n(Google Calendar)"}\nRight-click for more options`}
                              >
                                <div className="font-medium truncate">
                                  {isFirstDay ? event.summary : `↔ ${event.summary}`}
                                </div>
                              </div>
                            );
                          })}
                          {dayEvents.length > 2 && (
                            <div className="text-[9px] text-text-tertiary px-1">
                              +{dayEvents.length - 2} more
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* RIGHT: Upcoming shows (sticky rail) */}
          <aside className="lg:sticky lg:top-14">
            {isLoading ? (
              <ListSkeleton count={2} ItemSkeleton={ShowCardSkeleton} />
            ) : error ? (
              <div className="p-4 bg-semantic-warning/10 border border-semantic-warning/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <CircleAlert className="text-semantic-warning flex-shrink-0 mt-0.5" size={20} />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">
                      Unable to connect to backend
                    </h3>
                    <p className="text-sm text-text-secondary">
                      Upcoming shows will appear here when the API is available.
                    </p>
                  </div>
                </div>
              </div>
            ) : shows.length === 0 ? (
              <div className="panel-dark p-6">
                <NoShowsYet onCreate={() => setShowCreateModal(true)} />
              </div>
            ) : (
              <div className="panel-dark overflow-hidden">
                <div className="px-4 py-3 border-b border-border-subtle sticky top-0 bg-bg-elevated z-10">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h2 className="text-sm font-semibold text-foreground">
                        {timeFilter === "upcoming" ? "Upcoming shows" : timeFilter === "past" ? "Past shows" : "All shows"}
                      </h2>
                      <p className="text-xs text-text-tertiary mt-0.5">
                        {railShows.length} {statusFilter === "all" ? timeFilter : statusFilter.replace("_", " ")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Compact, scannable list of upcoming shows */}
                <div className="max-h-[calc(100vh-10rem)] overflow-auto">
                  {railShows.length === 0 ? (
                    <div className="p-6 text-center text-sm text-text-tertiary">
                      {timeFilter === "past" ? "No past shows found" : timeFilter === "all" ? "No shows found" : "No upcoming shows scheduled"}
                    </div>
                  ) : (
                    <div className="divide-y divide-white/10">
                      {railShows.map((show) => {
                      const isSelected = selectedShowIds.includes(show.id);
                      const statusColors: Record<ShowStatus, string> = {
                        draft: "bg-surface-elevated text-text-tertiary border-border-subtle",
                        pending_invite: "bg-accent-blue/10 text-accent-blue border-accent-blue/20",
                        pending_acceptance: "bg-semantic-warning/10 text-semantic-warning border-semantic-warning/20",
                        confirmed: "bg-semantic-success/10 text-semantic-success border-semantic-success/20",
                        tentative: "bg-semantic-warning/10 text-semantic-warning border-semantic-warning/20",
                        cancelled: "bg-semantic-error/10 text-semantic-error border-semantic-error/20",
                      };
                      const budget = getBudgetForShow(show.id);
                      const isPerformanceDate = !['off_day', 'travel_day'].includes(show.showType || 'show');
                      const showFee = isPerformanceDate && show.guarantee != null ? Number(show.guarantee) : null;
                      const hasShowFee = showFee != null && Number.isFinite(showFee);
                      const costs = budget?.totalExpenses == null ? null : Number(budget.totalExpenses);
                      const hasCosts = costs != null && Number.isFinite(costs);
                      const showCurrencySymbol = show.currency ? getCurrencySymbol(show.currency) : '';
                      const costCurrencySymbol = budget?.currency ? getCurrencySymbol(budget.currency) : '';

                      return (
                        <div
                          key={show.id}
                          className={`
                            p-3 hover:bg-surface-elevated transition-colors cursor-pointer
                            ${isSelected ? "bg-primary/5 border-l-2 border-primary" : ""}
                          `}
                          onClick={() => {
                            setSelectedShowIds((prev) =>
                              prev.includes(show.id)
                                ? prev.filter((id) => id !== show.id)
                                : [...prev, show.id]
                            );
                          }}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1.5">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-foreground truncate">
                                {show.venueName || show.venueCity || 'Location TBC'}
                              </div>
                              <div className="text-xs text-text-tertiary truncate">
                                {show.venueCity}, {show.venueState}
                              </div>
                            </div>
                            <span
                              className={`
                                text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0
                                ${statusColors[show.status]}
                              `}
                            >
                              {show.status}
                            </span>
                          </div>

                          <div className="text-xs text-text-tertiary mb-2">
                            {new Date(show.showDate).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </div>

                          {budget && <div className="mb-2 flex items-center gap-3 text-xs"><div className="flex items-center gap-1"><Coins className="h-3 w-3 text-accent-cyan" /><span className="text-[10px] font-medium text-accent-cyan">Budget Tracked</span></div></div>}

                          {(hasShowFee || hasCosts) && <div className="flex items-center gap-4 text-xs">
                            {hasShowFee && <div><span className="text-text-tertiary">Show fee </span><span className="font-medium text-foreground">{showCurrencySymbol}{showFee.toLocaleString()}</span></div>}
                            {hasCosts && <div><span className="text-text-tertiary">Costs </span><span className="font-medium text-foreground">{costCurrencySymbol}{costs.toLocaleString()}</span></div>}
                          </div>}

                          {show.notes && (
                            <div className="text-xs text-text-tertiary mt-1.5 line-clamp-2">
                              {show.notes}
                            </div>
                          )}

                          {/* Action buttons */}
                          <div className="flex gap-1.5 mt-2 pt-2 border-t border-white/5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/shows/${show.id}`);
                              }}
                              className="flex-1 px-2 py-1 text-[10px] font-medium rounded bg-[#171713] text-white hover:bg-[#ff5738] transition"
                            >
                              Day sheet
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditShow(show);
                              }}
                              className="flex-1 px-2 py-1 text-[10px] font-medium rounded bg-surface-elevated hover:bg-surface-hover text-foreground transition"
                            >
                              Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteShow(show.id);
                              }}
                              className="flex-1 px-2 py-1 text-[10px] font-medium rounded bg-surface-elevated hover:bg-destructive/10 text-destructive transition"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </aside>
        </div>
      ) : (
        // ✅ Original single-column behavior for list view / when calendar not connected
        <>
          {isLoading ? (
            <ListSkeleton count={3} ItemSkeleton={ShowCardSkeleton} />
          ) : error ? (
            <div className="p-6 bg-semantic-warning/10 border border-semantic-warning/30 rounded-lg">
              <div className="flex items-start gap-3">
                <CircleAlert className="text-semantic-warning flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-foreground mb-1">
                    Unable to connect to backend
                  </h3>
                  <p className="text-sm text-text-secondary mb-3">
                    The SceneGen API is currently unavailable. This is normal during development if the backend server isn't running.
                  </p>
                  <details className="text-xs text-text-tertiary">
                    <summary className="cursor-pointer hover:underline mb-2">Technical details</summary>
                    <code className="block bg-surface-elevated p-2 rounded mt-1">
                      Error: {error}
                    </code>
                  </details>
                  <p className="text-sm text-text-secondary mt-3">
                    <strong>You can still:</strong>
                  </p>
                  <ul className="text-sm text-text-secondary list-disc list-inside mt-1 space-y-1">
                    <li>View and test the Google Calendar integration</li>
                    <li>Test the UI and navigation</li>
                    <li>Review the documentation</li>
                  </ul>
                </div>
              </div>
            </div>
          ) : shows.length === 0 ? (
            <div className="panel-dark p-8">
              <div className="mx-auto max-w-md">
                <NoShowsYet onCreate={() => setShowCreateModal(true)} />
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-foreground">
                  {filteredShows.length} {statusFilter === "all" ? timeFilter : `${timeFilter} ${statusFilter.replace("_", " ")}`} show
                  {filteredShows.length !== 1 ? "s" : ""}
                </h2>
              </div>

              <ShowsTable
                shows={filteredShows}
                selectedIds={selectedShowIds}
                onSelectionChange={setSelectedShowIds}
                onCancelShow={handleCancelShow}
                onEditShow={handleEditShow}
                onDeleteShow={handleDeleteShow}
                onRefresh={refetchShows}
              />
            </>
          )}
        </>
      )
      }
      </>
      )}
      </div>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedShowIds.length}
        onAddToTour={() => setShowAddToTourModal(true)}
        onRemoveFromTour={handleRemoveFromTour}
        onClearSelection={() => setSelectedShowIds([])}
      />

      {/* Create Show Modal */}
      {showCreateModal && !eventToConvertToShow && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-0 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="min-h-[100dvh] w-full bg-[#f7f0e5] sm:max-h-[90vh] sm:max-w-4xl sm:min-h-0 sm:overflow-y-auto sm:rounded-lg">
            <div className="mobile-safe-top sticky top-0 z-30 flex items-center justify-between border-b border-[#d8d0c3] bg-[#f7f0e5]/95 p-4 backdrop-blur-xl sm:static sm:mb-0 sm:p-6">
              <h2 className="text-xl font-black sm:text-2xl">
                Create New Show
              </h2>
              <button type="button"
                onClick={() => {
                  setShowCreateModal(false);
                  setEventToConvertToShow(null);
                }}
                className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-semibold hover:bg-black/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5 shrink-0"><path d="m6 6 12 12M18 6 6 18" /></svg><span>Close</span>
              </button>
            </div>
            <div className="p-4 sm:p-6"><CreateShowForm
              onSuccess={handleCreateSuccess}
              onCancel={() => {
                setShowCreateModal(false);
                setEventToConvertToShow(null);
              }}
            /></div>
          </div>
        </div>
      )}

      {(eventToConvertToShow || importCalendarTour) && <CalendarConversion
        key={eventToConvertToShow?.id || 'calendar-bulk'}
        events={eventToConvertToShow ? [{...eventToConvertToShow,source:'google'}] : calendarEvents.map(event=>({...event,source:'google' as const}))}
        existingDates={shows}
        onClose={()=>{setImportCalendarTour(false);setEventToConvertToShow(null);}}
        onSaved={result=>{
          setImportCalendarTour(false);
          setEventToConvertToShow(null);
          refreshShows();
          toast.success(result.showCount+' calendar date'+(result.showCount===1?'':'s')+' saved to SceneGen.');
          if(result.tour?.id)router.push('/tours/'+result.tour.id);
          else if(result.showId)router.push('/shows/'+result.showId);
          else {void fetchShows().then(setShows);router.push('/shows');}
        }}
      />}

      {/* Add to Tour Modal */}
      {showAddToTourModal && (
        <AddToTourModal
          selectedShows={selectedShows}
          onClose={() => setShowAddToTourModal(false)}
          onSuccess={handleAddToTourSuccess}
        />
      )}

      {/* Edit Show Modal */}
      {showEditModal && showToEdit && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/60 p-0 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-4">
          <div className="min-h-[100dvh] w-full bg-[#f7f0e5] sm:max-h-[90vh] sm:max-w-4xl sm:min-h-0 sm:overflow-y-auto sm:rounded-lg">
            <div className="mobile-safe-top sticky top-0 z-30 flex items-center justify-between border-b border-border-subtle bg-[#f7f0e5]/95 p-4 backdrop-blur-xl sm:static sm:p-6">
              <h2 className="text-xl font-bold text-foreground">Edit Show</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setShowToEdit(null);
                }}
                className="grid h-12 w-12 place-items-center rounded-full text-text-tertiary transition-colors hover:bg-black/5 hover:text-foreground"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="p-4 sm:p-6">
              <CreateShowForm
                show={showToEdit}
                onSuccess={() => {
                  setShowEditModal(false);
                  setShowToEdit(null);
                  refetchShows();
                }}
                onCancel={() => {
                  setShowEditModal(false);
                  setShowToEdit(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Google Calendar Connect Modal */}
      {showCalendarConnectModal && (
        <GoogleCalendarConnectModal
          onClose={() => setShowCalendarConnectModal(false)}
        />
      )}

      {/* Google Calendar Expired Modal */}
      {showCalendarExpiredModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="panel-dark shadow-glow-lg max-w-md w-full p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 bg-semantic-error/20 border border-semantic-error/30 rounded-full">
                <CircleAlert className="w-6 h-6 text-semantic-error" />
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold text-foreground mb-2">
                  Google Calendar Disconnected
                </h2>
                <p className="text-sm text-text-tertiary">
                  Your Google Calendar connection has expired or been revoked.
                  You'll need to reconnect to sync your calendar events with SceneGen.
                </p>
              </div>
            </div>

            <div className="bg-surface-elevated border border-border-subtle rounded-md p-3 mb-6">
              <p className="text-sm text-text-tertiary">
                <strong className="text-foreground">Note:</strong> Your SceneGen shows are still safe.
                Only Google Calendar events won't be displayed until you reconnect.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCalendarExpiredModal(false);
                  localStorage.removeItem("google-calendar-connected");
                }}
                className="flex-1 px-4 py-2 bg-surface-elevated text-foreground rounded-md hover:bg-surface-hover transition-colors"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  setShowCalendarExpiredModal(false);
                  localStorage.removeItem("google-calendar-connected");
                  setShowCalendarConnectModal(true);
                }}
                className="flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Reconnect Calendar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Event Detail Modal */}
      {selectedCalendarEvent && (
        <CalendarEventModal
          event={selectedCalendarEvent}
          onClose={() => setSelectedCalendarEvent(null)}
          onUpdate={handleUpdateCalendarEvent}
          onCreate={handleCreateCalendarEvent}
          onDelete={handleDeleteCalendarEvent}
        />
      )}

      {/* Calendar Event Context Menu */}
      {contextMenu && (
        <CalendarEventContextMenu
          event={contextMenu.event}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onAddAsShow={handleAddCalendarEventAsShow}
          onViewDetails={(event) => {
            handleOpenCalendarItem(event);
            setContextMenu(null);
          }}
          onDuplicate={handleDuplicateCalendarEvent}
        />
      )}
    </div>
  );
}
