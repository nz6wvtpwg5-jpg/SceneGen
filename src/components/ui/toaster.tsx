"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "next-themes";

/**
 * Toaster Component
 * Implements BUILD_PLAN Week 8, Task 8.2
 * Toast notification wrapper using Sonner
 */
export function Toaster() {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme as "light" | "dark" | "system"}
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border-subtle group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-text-tertiary",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-surface-elevated group-[.toast]:text-text-tertiary",
          error: "group-[.toast]:bg-destructive group-[.toast]:text-destructive-foreground",
          success: "group-[.toast]:bg-semantic-success group-[.toast]:text-white",
          warning: "group-[.toast]:bg-semantic-warning group-[.toast]:text-white",
          info: "group-[.toast]:bg-blue-500 group-[.toast]:text-white",
        },
      }}
    />
  );
}
