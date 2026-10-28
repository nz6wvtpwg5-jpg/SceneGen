"use client";

import { cn } from "@/lib/utils";

/**
 * Skeleton Component
 * Implements BUILD_PLAN Week 8, Task 8.1
 * Loading skeleton for content placeholders
 */
interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-elevated", className)}
      {...props}
    />
  );
}

/**
 * ShowCardSkeleton
 * Loading skeleton for show cards
 */
export function ShowCardSkeleton() {
  return (
    <div className="border border-border-subtle rounded-lg p-6">
      <div className="flex items-start gap-4">
        <Skeleton className="h-5 w-5" />
        <div className="flex-1">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-5 w-24" />
              </div>
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * TourCardSkeleton
 * Loading skeleton for tour cards
 */
export function TourCardSkeleton() {
  return (
    <div className="border border-border-subtle rounded-lg p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64 mb-3" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-20" />
        </div>
      </div>
    </div>
  );
}

/**
 * ContactCardSkeleton
 * Loading skeleton for contact cards
 */
export function ContactCardSkeleton() {
  return (
    <div className="border border-border-subtle rounded-lg p-4">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}

/**
 * TableRowSkeleton
 * Loading skeleton for table rows
 */
export function TableRowSkeleton({ columns = 4 }: { columns?: number }) {
  return (
    <div className="border-b border-border-subtle py-4">
      <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}

/**
 * ListSkeleton
 * Generic list loading skeleton
 */
export function ListSkeleton({ 
  count = 3, 
  ItemSkeleton = ShowCardSkeleton 
}: { 
  count?: number;
  ItemSkeleton?: React.ComponentType;
}) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <ItemSkeleton key={i} />
      ))}
    </div>
  );
}
