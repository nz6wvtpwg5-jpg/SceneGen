import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-full text-sm font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff5a36]/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#ff5a36] text-white shadow-[0_10px_24px_rgba(255,90,54,0.2)] hover:-translate-y-0.5 hover:bg-[#e94a28] hover:shadow-[0_14px_30px_rgba(255,90,54,0.26)]",
        destructive:
          "bg-semantic-error/10 border border-semantic-error/20 text-semantic-error hover:bg-semantic-error/20",
        outline:
          "border border-black/15 bg-transparent text-foreground hover:border-black/30 hover:bg-white/50",
        secondary:
          "border border-[#11140f] bg-[#11140f] text-[#f7f2e8] hover:bg-[#292d26]",
        ghost: "text-text-secondary hover:bg-black/5 hover:text-foreground",
        link: "text-[#e54525] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-12 px-6 py-3",
        sm: "h-10 px-4 py-2 text-xs",
        lg: "h-14 px-8 py-4 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
