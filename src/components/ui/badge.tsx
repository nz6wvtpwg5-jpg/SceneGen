import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border transition-colors focus:outline-none focus:ring-2 focus:ring-interactive-primary/50",
  {
    variants: {
      variant: {
        default: "bg-surface-elevated text-text-secondary border-border-subtle",
        active: "bg-interactive-primary/20 text-interactive-primary border-interactive-primary/30",
        success: "bg-semantic-success/20 text-semantic-success border-semantic-success/30",
        warning: "bg-semantic-warning/20 text-semantic-warning border-semantic-warning/30",
        error: "bg-semantic-error/20 text-semantic-error border-semantic-error/30",
        purple: "bg-accent-purple/20 text-accent-purple border-accent-purple/30",
        outline: "border-border-subtle text-text-secondary bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
