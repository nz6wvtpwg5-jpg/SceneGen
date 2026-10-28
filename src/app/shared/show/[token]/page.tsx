'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import type { Show } from '@/types/show';

export default function SharedShowPage() {
  const params = useParams();
  const token = params.token as string;

  const [show, setShow] = useState<Show | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    notes: '',
  });

  useEffect(() => {
    loadShow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const loadShow = async () => {
    try {
      const response = await fetch(`/api/shared/show/${token}`);

      if (!response.ok) {
        throw new Error('Share link not found or expired');
      }

      const data = await response.json();
      setShow(data.show);
      setCanEdit(data.canEdit);
      setFormData({
        contactName: data.show.contactName || '',
        contactEmail: data.show.contactEmail || '',
        contactPhone: data.show.contactPhone || '',
        notes: data.show.notes || '',
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load show');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/shared/show/${token}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to update show');
      }

      await loadShow();
      setIsEditing(false);
      toast.success('Show updated successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update show');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-accent-cyan/20 border-t-accent-cyan rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading show details...</p>
        </div>
      </div>
    );
  }

  if (error || !show) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center panel-dark p-8">
          <div className="w-16 h-16 bg-semantic-error/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-semantic-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Link Not Found</h1>
          <p className="text-text-secondary">{error || 'This share link may have expired or been revoked.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="panel-dark p-8 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gradient-accent mb-2">
                {show.venueName || show.venueCity || 'Location TBC'}
              </h1>
              <p className="text-lg text-text-tertiary">
                {new Date(show.showDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
            {canEdit && !isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="px-4 py-2 bg-accent-cyan/20 border border-accent-cyan/30 text-accent-cyan rounded-lg font-medium hover:bg-accent-cyan/30 transition-all"
              >
                Edit Details
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-6 mt-6">
            <div>
              <p className="text-text-tertiary text-sm mb-1">Location</p>
              <p className="text-foreground font-semibold">{show.venueAddress}</p>
              <p className="text-text-secondary text-sm">{show.venueCity}, {show.venueState}</p>
            </div>
            <div>
              <p className="text-text-tertiary text-sm mb-1">Show Time</p>
              <p className="text-foreground font-semibold">{show.showTime || 'TBD'}</p>
              <p className="text-text-secondary text-sm">Doors: {show.doorsTime || 'TBD'}</p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="panel-dark p-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Contact Information</h2>

          {!isEditing ? (
            <div className="space-y-4">
              <div>
                <p className="text-text-tertiary text-sm mb-1">Name</p>
                <p className="text-foreground font-semibold">{show.contactName || 'TBD'}</p>
              </div>
              <div>
                <p className="text-text-tertiary text-sm mb-1">Email</p>
                <p className="text-foreground font-semibold">{show.contactEmail || 'TBD'}</p>
              </div>
              <div>
                <p className="text-text-tertiary text-sm mb-1">Phone</p>
                <p className="text-foreground font-semibold">{show.contactPhone || 'TBD'}</p>
              </div>
              {show.notes && (
                <div>
                  <p className="text-text-tertiary text-sm mb-1">Notes</p>
                  <p className="text-foreground">{show.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border-subtle rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent-cyan/50"
                  placeholder="Enter contact name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Contact Email
                </label>
                <input
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border-subtle rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent-cyan/50"
                  placeholder="contact@venue.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border-subtle rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent-cyan/50"
                  placeholder="+1 555 0100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-3 bg-surface-elevated border border-border-subtle rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-accent-cyan/50 resize-none"
                  rows={4}
                  placeholder="Add any notes..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-[#ff5a36] via-[#f05a32] to-[#c8f135] text-foreground rounded-xl font-semibold hover:shadow-glow-lg hover:scale-[1.02] transition-all disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setFormData({
                      contactName: show.contactName || '',
                      contactEmail: show.contactEmail || '',
                      contactPhone: show.contactPhone || '',
                      notes: show.notes || '',
                    });
                  }}
                  className="px-6 py-3 bg-surface-elevated border border-border-subtle text-foreground rounded-xl font-semibold hover:bg-surface-hover transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {!canEdit && (
          <div className="mt-6 p-4 bg-surface-elevated rounded-xl border border-border-subtle text-center">
            <p className="text-text-secondary text-sm">
              This is a view-only link. You cannot edit show details.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
