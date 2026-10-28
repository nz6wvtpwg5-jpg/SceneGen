"use client";

import { useState, useEffect } from 'react';
import { X, MapPin, Clock, Calendar, Edit2, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import PlacesAutocomplete from '@/components/ui/PlacesAutocomplete';
import { useCountRefreshStore } from '@/store/useCountRefreshStore';
import { useConfirmDialog } from '@/components/ui/confirm-dialog-provider';

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
  source?: 'google' | 'scenegen'; // Track event source
  showId?: string; // Link to the show if this is a SceneGen show
}

interface CalendarEventModalProps {
  event: CalendarEvent;
  onClose: () => void;
  onUpdate?: (eventId: string, updatedEvent: Partial<CalendarEvent>) => Promise<void>;
  onCreate?: (newEvent: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: (eventId: string) => Promise<void>;
}

export default function CalendarEventModal({
  event,
  onClose,
  onUpdate,
  onCreate,
  onDelete,
}: CalendarEventModalProps) {
  const [isEditing, setIsEditing] = useState(!event.id); // Auto-edit if no ID (new event)
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const refreshShows = useCountRefreshStore((state) => state.refreshShows);
  const confirmDialog = useConfirmDialog();

  // Parse existing location into separate fields
  const parseLocation = (locationString: string) => {
    if (!locationString) return { venueName: '', venueAddress: '', venueCity: '', venueState: '', venueCountry: '' };

    const parts = locationString.split(',').map(p => p.trim());
    return {
      venueName: parts[0] || '',
      venueAddress: parts[1] || '',
      venueCity: parts[2] || '',
      venueState: parts[3] || '',
      venueCountry: parts[4] || '',
    };
  };

  const initialVenue = parseLocation(event.location || '');

  // Editable fields
  const [summary, setSummary] = useState(event.summary);
  const [description, setDescription] = useState(event.description || '');
  const [venueName, setVenueName] = useState(initialVenue.venueName);
  const [venueAddress, setVenueAddress] = useState(initialVenue.venueAddress);
  const [venueCity, setVenueCity] = useState(initialVenue.venueCity);
  const [venueState, setVenueState] = useState(initialVenue.venueState);
  const [venueCountry, setVenueCountry] = useState(initialVenue.venueCountry);
  const [startDateTime, setStartDateTime] = useState(
    new Date(event.start.dateTime).toISOString().slice(0, 16)
  );
  const [endDateTime, setEndDateTime] = useState(
    new Date(event.end.dateTime).toISOString().slice(0, 16)
  );

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Format time for display
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // Format duration
  const getDuration = () => {
    const start = new Date(event.start.dateTime);
    const end = new Date(event.end.dateTime);
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHours === 0) {
      return `${diffMins} minutes`;
    } else if (diffMins === 0) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ${diffMins} minutes`;
    }
  };

  const handleSave = async () => {
    /**
     * SceneGen shows must never be updated through the Google Calendar
     * event API. This is a final defensive guard in case a SceneGen
     * calendar representation somehow reaches this modal.
     */
    if (event.source === "scenegen" || event.id?.startsWith("show-")) {
      toast.error("SceneGen shows must be edited in the show editor.");
      return;
    }

    if ((!onUpdate || !event.id) && !onCreate) {
      toast.error('Unable to save event');
      return;
    }

    if (!summary.trim()) {
      toast.error('Event title is required');
      return;
    }

    const startDate = new Date(startDateTime);
    const endDate = new Date(endDateTime);

    if (endDate < startDate) {
      toast.error('End date must be on or after start date');
      return;
    }

    setIsSaving(true);

    try {
      // Combine venue fields into a single location string
      const locationParts = [
        venueName?.trim() ?? '',
        venueAddress?.trim() ?? '',
        venueCity.trim(),
        venueState.trim(),
        venueCountry.trim(),
      ].filter(part => part !== ''); // Remove empty parts

      const combinedLocation = locationParts.join(', ');

      const eventData: Partial<CalendarEvent> = {
        summary: summary.trim(),
        description: description.trim(),
        location: combinedLocation,
        start: {
          dateTime: startDate.toISOString(),
          timeZone: event.start.timeZone,
        },
        end: {
          dateTime: endDate.toISOString(),
          timeZone: event.end.timeZone,
        },
      };

      console.log('Saving calendar event with location:', combinedLocation);

      if (event.id && onUpdate) {
        // Update existing event
        await onUpdate(event.id, eventData);
        toast.success('Event updated successfully!');
      } else if (onCreate) {
        // Create new event
        await onCreate(eventData);
        toast.success('Event created successfully!');
      }

      onClose(); // Close modal and return to calendar
    } catch (error) {
      console.error('Failed to save event:', error);
      toast.error('Failed to save event. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!onDelete || !event.id) {
      toast.error('Unable to delete event');
      return;
    }

    const isSceneGenShow = event.source === 'scenegen';
    const confirmMessage = isSceneGenShow
      ? 'Are you sure you want to delete this show? This will remove it from SceneGen.'
      : 'Are you sure you want to delete this event from your Google Calendar?';

    if (!await confirmDialog({
      title: isSceneGenShow ? 'Delete this show?' : 'Delete this calendar event?',
      description: confirmMessage,
      confirmLabel: isSceneGenShow ? 'Delete show' : 'Delete event',
      tone: 'destructive',
    })) {
      return;
    }

    setIsDeleting(true);

    try {
      await onDelete(event.id);
      const successMessage = isSceneGenShow
        ? 'Show deleted successfully!'
        : 'Event deleted successfully!';
      toast.success(successMessage);
      // Refresh sidebar show count immediately
      refreshShows();
      onClose();
    } catch (error) {
      console.error('Failed to delete event:', error);
      const errorMessage = isSceneGenShow
        ? 'Failed to delete show. Please try again.'
        : 'Failed to delete event. Please try again.';
      toast.error(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCancel = () => {
    // Reset fields to original values
    const resetVenue = parseLocation(event.location || '');
    setSummary(event.summary);
    setDescription(event.description || '');
    setVenueName(resetVenue.venueName);
    setVenueAddress(resetVenue.venueAddress);
    setVenueCity(resetVenue.venueCity);
    setVenueState(resetVenue.venueState);
    setVenueCountry(resetVenue.venueCountry);
    setStartDateTime(new Date(event.start.dateTime).toISOString().slice(0, 16));
    setEndDateTime(new Date(event.end.dateTime).toISOString().slice(0, 16));
    setIsEditing(false);
  };

  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isEditing) {
          handleCancel();
        } else {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isEditing, onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="sticky top-0 bg-background border-b border-border-subtle p-6 flex items-start justify-between">
          <div className="flex-1 mr-4">
            {isEditing ? (
              <input
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                className="text-2xl font-bold w-full px-2 py-1 border border-border-subtle rounded focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="Event title"
                autoFocus
              />
            ) : (
              <h2 className="text-2xl font-bold text-foreground">{event.summary}</h2>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isEditing && onUpdate && (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 hover:bg-surface-elevated rounded-lg transition-colors"
                title="Edit event"
              >
                <Edit2 size={18} />
              </button>
            )}

            {!isEditing && onDelete && (
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors disabled:opacity-50"
                title="Delete event"
              >
                {isDeleting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-destructive"></div>
                ) : (
                  <Trash2 size={18} />
                )}
              </button>
            )}

            <button
              onClick={isEditing ? handleCancel : onClose}
              className="inline-flex min-h-12 shrink-0 items-center gap-2 px-3 hover:bg-surface-elevated rounded-lg transition-colors"
              aria-label="Close" type="button"
            >
              <X size={20} aria-hidden="true" /><span>Close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Date & Time */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 text-text-tertiary flex-shrink-0" size={20} />
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-1">Start Date</label>
                      <input
                        type="date"
                        value={startDateTime.slice(0, 10)}
                        onChange={(e) => setStartDateTime(e.target.value + 'T' + startDateTime.slice(11, 16))}
                        className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">End Date</label>
                      <input
                        type="date"
                        value={endDateTime.slice(0, 10)}
                        onChange={(e) => setEndDateTime(e.target.value + 'T' + endDateTime.slice(11, 16))}
                        className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="font-medium">{formatDate(event.start.dateTime)}</div>
                    <div className="text-text-tertiary mt-1">
                      {formatTime(event.start.dateTime)} - {formatTime(event.end.dateTime)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {!isEditing && (
              <div className="flex items-center gap-3">
                <Clock className="text-text-tertiary flex-shrink-0" size={20} />
                <div className="text-text-tertiary">{getDuration()}</div>
              </div>
            )}
          </div>

          {/* Location / Venue Details */}
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 text-text-tertiary flex-shrink-0" size={20} />
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-3">
                    {/* Venue Name with Autocomplete */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Venue Name</label>
                      <PlacesAutocomplete
                        value={venueName}
                        onChange={setVenueName}
                        useFullAddress={false}
                        onPlaceSelect={(place) => {
                          console.log('Selected place:', place);
                          // Auto-fill address fields from selected place
                          if (place.formatted_address) {
                            const addressComponents = place.address_components;
                            if (addressComponents) {
                              // Extract street address
                              const streetNumber = addressComponents.find(c => c.types.includes('street_number'))?.long_name || '';
                              const route = addressComponents.find(c => c.types.includes('route'))?.long_name || '';
                              const street = `${streetNumber} ${route}`.trim();

                              // Extract city
                              const city = addressComponents.find(c => c.types.includes('locality'))?.long_name || '';

                              // Extract state
                              const state = addressComponents.find(c => c.types.includes('administrative_area_level_1'))?.short_name || '';

                              // Extract country
                              const country = addressComponents.find(c => c.types.includes('country'))?.long_name || '';

                              if (street) setVenueAddress(street);
                              if (city) setVenueCity(city);
                              if (state) setVenueState(state);
                              if (country) setVenueCountry(country);
                            }
                          }
                        }}
                        placeholder="Search for a venue"
                        className="w-full"
                      />
                    </div>

                    {/* Street Address */}
                    <div>
                      <label className="block text-sm font-medium mb-1">Street Address</label>
                      <input
                        type="text"
                        value={venueAddress}
                        onChange={(e) => setVenueAddress(e.target.value)}
                        className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                        placeholder="e.g., 123 Main St"
                      />
                    </div>

                    {/* City, State, Country in a grid */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">City</label>
                        <input
                          type="text"
                          value={venueCity}
                          onChange={(e) => setVenueCity(e.target.value)}
                          className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">State</label>
                        <input
                          type="text"
                          value={venueState}
                          onChange={(e) => setVenueState(e.target.value)}
                          className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="State"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Country</label>
                        <input
                          type="text"
                          value={venueCountry}
                          onChange={(e) => setVenueCountry(e.target.value)}
                          className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="Country"
                        />
                      </div>
                    </div>
                  </div>
                ) : event.location ? (
                  <div className="text-foreground">{event.location}</div>
                ) : (
                  <div className="text-text-tertiary italic">No location specified</div>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="block text-sm font-medium">Description</label>
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-border-subtle rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                placeholder="Add description"
              />
            ) : event.description ? (
              <div className="text-text-tertiary whitespace-pre-wrap">{event.description}</div>
            ) : (
              <div className="text-text-tertiary italic">No description</div>
            )}
          </div>

          {/* Edit Actions */}
          {isEditing && (
            <div className="flex gap-3 pt-4 border-t border-border-subtle">
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 font-medium"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="px-4 py-2.5 border border-border-subtle rounded-lg hover:bg-surface-elevated transition-colors disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
