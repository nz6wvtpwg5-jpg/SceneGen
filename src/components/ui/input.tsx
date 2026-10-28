import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex min-w-0 max-w-full w-full rounded-[14px] border border-black/15 bg-white px-4 py-3 text-base text-[#151713] shadow-sm placeholder:text-[#92958c] focus-visible:border-[#ff5a36]/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ff5a36]/10 disabled:bg-muted disabled:cursor-not-allowed disabled:opacity-50 transition-all file:border-0 file:bg-transparent file:text-sm file:font-medium",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
