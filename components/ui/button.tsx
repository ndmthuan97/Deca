"use client"

import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Vercel base: 14px font-medium, 6px radius, no border, 150ms transition
  "group/button inline-flex shrink-0 items-center justify-center rounded-[6px] border-0 bg-clip-padding text-[14px] font-medium whitespace-nowrap transition-all outline-none select-none active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        // Vercel Primary Dark: #171717 bg, white text, no border
        default:
          "bg-[#171717] text-white hover:opacity-85 focus-visible:shadow-[0_0_0_2px_hsla(212,100%,48%,1)] dark:bg-[#f5f5f5] dark:text-[#171717]",
        // Vercel Secondary: white + shadow-ring-light
        outline:
          "bg-white text-[#171717] shadow-[rgb(235,235,235)_0px_0px_0px_1px] hover:shadow-[rgba(0,0,0,0.12)_0px_0px_0px_1px] focus-visible:shadow-[0_0_0_2px_hsla(212,100%,48%,1)] dark:bg-[#1a1a1a] dark:text-[#f5f5f5] dark:shadow-[rgba(255,255,255,0.1)_0px_0px_0px_1px]",
        secondary:
          "bg-[#fafafa] text-[#171717] shadow-[rgb(235,235,235)_0px_0px_0px_1px] hover:bg-[#f5f5f5] dark:bg-[#1a1a1a] dark:text-[#f5f5f5]",
        ghost:
          "hover:bg-[#fafafa] hover:text-[#171717] dark:hover:bg-white/5 dark:hover:text-[#f5f5f5]",
        destructive:
          "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30",
        link: "text-[#0072f5] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 gap-1.5 px-3",
        xs:      "h-6 gap-1 px-2 text-[12px] rounded-[4px] [&_svg:not([class*='size-'])]:size-3",
        sm:      "h-7 gap-1 px-2.5 text-[13px] [&_svg:not([class*='size-'])]:size-3.5",
        lg:      "h-9 gap-1.5 px-4",
        icon:    "size-8",
        "icon-xs": "size-6 rounded-[4px] [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
