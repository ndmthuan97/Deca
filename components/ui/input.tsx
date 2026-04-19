import * as React from "react"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        // Vercel input: shadow-border instead of CSS border, focus → blue ring
        "flex h-9 w-full min-w-0 rounded-[6px] bg-white dark:bg-[#1a1a1a]",
        "px-3 py-1 text-[14px] font-normal text-[#171717] dark:text-[#f5f5f5]",
        "placeholder:text-[#999999] dark:placeholder:text-[#666666]",
        // shadow-border
        "shadow-[rgba(0,0,0,0.08)_0px_0px_0px_1px] dark:shadow-[rgba(255,255,255,0.08)_0px_0px_0px_1px]",
        // focus: Vercel blue ring
        "outline-none focus:shadow-[0_0_0_2px_hsla(212,100%,48%,1)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "transition-shadow",
        className
      )}
      {...props}
    />
  )
}

export { Input }
