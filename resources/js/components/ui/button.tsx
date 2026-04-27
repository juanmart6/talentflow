import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]/40 focus-visible:ring-offset-2 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default:
          "bg-[#2563eb] text-white shadow-sm shadow-[#2563eb]/20 hover:bg-[#1d4ed8] hover:shadow-md hover:shadow-[#2563eb]/25",
        destructive:
          "bg-destructive text-white shadow-xs hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        search:
          "min-w-32 border border-slate-300 bg-slate-100 text-slate-700 shadow-xs hover:bg-slate-200 focus-visible:border-slate-400 focus-visible:ring-0 focus-visible:ring-offset-0 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700",
        outline:
          "border border-[#2563eb]/25 bg-white text-[#1d4ed8] shadow-xs hover:border-[#2563eb]/40 hover:bg-[#2563eb]/6 hover:text-[#1d4ed8] dark:border-[#2563eb]/35 dark:bg-slate-950 dark:text-sky-300 dark:hover:bg-[#2563eb]/12",
        secondary:
          "bg-[#2563eb]/10 text-[#1e40af] shadow-xs hover:bg-[#2563eb]/15 dark:bg-[#2563eb]/15 dark:text-sky-200 dark:hover:bg-[#2563eb]/22",
        ghost:
          "text-[#1d4ed8] hover:bg-[#2563eb]/8 hover:text-[#1d4ed8] dark:text-sky-300 dark:hover:bg-[#2563eb]/16",
        link: "text-[#2563eb] underline-offset-4 hover:text-[#1d4ed8] hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
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
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
