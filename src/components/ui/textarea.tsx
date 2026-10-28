import * as React from "react"

import { cn } from "@/lib/utils"

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[112px] w-full rounded-[14px] border border-black/15 bg-white px-4 py-3 text-base text-[#151713] shadow-sm placeholder:text-[#92958c] focus-visible:border-[#ff5a36]/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ff5a36]/10 disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[96px] sm:text-sm",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Textarea.displayName = "Textarea"

export { Textarea }
