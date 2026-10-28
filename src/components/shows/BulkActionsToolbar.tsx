"use client";

/**
 * BulkActionsToolbar Component
 * Implements BUILD_PLAN Week 7, Task 7.4
 * Features:
 * - Display count of selected shows
 * - Actions: Add to Tour, Remove from Tour, Delete
 * - Simple toolbar, no fancy animations
 */
interface BulkActionsToolbarProps {
  selectedCount: number;
  onAddToTour: () => void;
  onRemoveFromTour: () => void;
  onClearSelection: () => void;
}

export default function BulkActionsToolbar({
  selectedCount,
  onAddToTour,
  onRemoveFromTour,
  onClearSelection
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground rounded-lg shadow-lg p-4 flex items-center gap-4 z-40">
      <span className="font-medium">
        {selectedCount} show{selectedCount !== 1 ? 's' : ''} selected
      </span>
      
      <div className="flex gap-2">
        <button
          onClick={onAddToTour}
          className="px-4 py-2 bg-primary-foreground text-primary rounded hover:bg-primary-foreground/90 text-sm font-medium"
        >
          Add to Tour
        </button>
        
        <button
          onClick={onRemoveFromTour}
          className="px-4 py-2 bg-primary-foreground text-primary rounded hover:bg-primary-foreground/90 text-sm font-medium"
        >
          Remove from Tour
        </button>
        
        <button
          onClick={onClearSelection}
          className="px-4 py-2 border border-primary-foreground text-primary-foreground rounded hover:bg-primary-foreground/10 text-sm font-medium"
        >
          Clear Selection
        </button>
      </div>
    </div>
  );
}
