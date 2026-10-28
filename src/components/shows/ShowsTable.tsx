"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { Show, ShowStatus } from "@/types/show";
import { CalendarSyncButton } from "./CalendarSyncButton";

interface ShowsTableProps {
  shows: Show[];
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  onCancelShow: (showId: string) => void;
  onEditShow?: (show: Show) => void;
  onDeleteShow?: (showId: string) => void;
  onRefresh?: () => void; // Callback to refetch shows
}

/**
 * ShowsTable Component
 * Implements BUILD_PLAN Week 7, Task 7.3
 * Features:
 * - Checkbox selection on each row
 * - Select all checkbox in header
 * - Track selected show IDs
 */
export default function ShowsTable({
  shows,
  selectedIds,
  onSelectionChange,
  onCancelShow,
  onEditShow,
  onDeleteShow,
  onRefresh
}: ShowsTableProps) {
  const router = useRouter();
  const allSelected = shows.length > 0 && selectedIds.length === shows.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const handleSelectAll = () => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(shows.map(s => s.id));
    }
  };

  const handleSelectShow = (showId: string) => {
    if (selectedIds.includes(showId)) {
      onSelectionChange(selectedIds.filter(id => id !== showId));
    } else {
      onSelectionChange([...selectedIds, showId]);
    }
  };

  const getStatusBadge = (status: ShowStatus) => {
    const styles: Record<ShowStatus, string> = {
      draft: 'bg-surface-elevated text-foreground',
      pending_invite: 'bg-primary/10 text-primary',
      pending_acceptance: 'state-warning-subtle text-semantic-warning',
      confirmed: 'state-success-subtle text-semantic-success',
      tentative: 'state-warning-subtle text-semantic-warning',
      cancelled: 'bg-destructive/10 text-destructive'
    };

    return (
      <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ring-current/20 ${styles[status]}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {shows.map((show) => (
        <div
          key={show.id}
          className={`rounded-xl border border-border-subtle bg-surface-elevated p-5 md:p-6 transition-colors hover:bg-accent/20 ${
            selectedIds.includes(show.id) ? 'ring-1 ring-primary/40 bg-accent/15' : ''
          }`}
        >
          <div className="flex items-start gap-4">
            {/* Checkbox */}
            <div className="pt-1">
              <input
                type="checkbox"
                checked={selectedIds.includes(show.id)}
                onChange={() => handleSelectShow(show.id)}
                className="h-5 w-5 cursor-pointer accent-primary"
              />
            </div>

            {/* Show Details */}
            <div className="flex-1">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-xl font-semibold">{show.venueName || show.venueCity || 'Location TBC'}</h3>
                    {getStatusBadge(show.status)}
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${show.readinessPercentage === 100 ? 'bg-[#eff5d9] text-[#526817]' : 'bg-[#f2ebe0] text-[#686258]'}`}>{show.readinessPercentage || 0}% advanced</span>
                  </div>
                  <p className="text-text-tertiary">
                    {new Date(show.showDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/shows/${show.id}`)}
                    className="h-9 px-3 text-sm font-medium rounded-md bg-[#171713] text-white shadow-sm transition hover:bg-[#ff5738]"
                  >
                    Day sheet
                  </button>
                  <button
                    onClick={() => onEditShow?.(show)}
                    className="h-9 px-3 text-sm font-medium rounded-md border border-input bg-background shadow-sm transition hover:bg-accent hover:text-accent-foreground"
                  >
                    Edit
                  </button>
                  <CalendarSyncButton
                    show={show}
                    variant="outline"
                    size="sm"
                    onSyncSuccess={onRefresh}
                  />
                  <button
                    onClick={() => onDeleteShow?.(show.id)}
                    className="h-9 px-3 text-sm font-medium rounded-md border border-destructive/40 bg-background text-destructive shadow-sm transition hover:bg-destructive hover:text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-tertiary">Location</p>
                  <p className="font-medium">
                    {show.venueCity || 'City TBC'}, {show.venueState || 'Region TBC'}, {show.venueCountry || 'Country TBC'}
                  </p>
                </div>
                {show.showTime && (
                  <div>
                    <p className="text-text-tertiary">Show Time</p>
                    <p className="font-medium">{show.showTime}</p>
                  </div>
                )}
                {show.doorsTime && (
                  <div>
                    <p className="text-text-tertiary">Doors</p>
                    <p className="font-medium">{show.doorsTime}</p>
                  </div>
                )}
                {show.setLength && (
                  <div>
                    <p className="text-text-tertiary">Set Length</p>
                    <p className="font-medium">{show.setLength}</p>
                  </div>
                )}
                {show.guarantee != null && (
                  <div>
                    <p className="text-text-tertiary">Guarantee</p>
                    <p className="font-medium">
                      {show.currency ? `${show.currency} ` : ''}
                      {(() => {
                        try {
                          const guaranteeValue = show.guarantee;
                          const num = typeof guaranteeValue === 'number'
                            ? guaranteeValue
                            : parseFloat(String(guaranteeValue));
                          const amount = isNaN(num) ? '0.00' : num.toFixed(2);
                          return show.currency ? amount : `${amount} (currency not set)`;
                        } catch (e) {
                          return show.currency ? '0.00' : '0.00 (currency not set)';
                        }
                      })()}
                    </p>
                  </div>
                )}
                {show.dealType && (
                  <div>
                    <p className="text-text-tertiary">Deal Type</p>
                    <p className="font-medium">{show.dealType.replace('_', ' ')}</p>
                  </div>
                )}
              </div>

              {show.notes && (
                <div className="mt-4 pt-4 border-t border-border-subtle">
                  <p className="text-sm text-text-tertiary">Notes</p>
                  <p className="text-sm mt-1">{show.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
