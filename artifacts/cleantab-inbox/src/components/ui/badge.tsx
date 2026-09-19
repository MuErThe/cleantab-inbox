import * as React from "react"
import { cn } from "@/lib/utils"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "warning" | "success"
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const baseClass = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
  
  const variants = {
    default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
    secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
    destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
    outline: "text-foreground",
    warning: "border-transparent bg-amber-100 text-amber-900 hover:bg-amber-100/80 dark:bg-amber-900 dark:text-amber-100",
    success: "border-transparent bg-emerald-100 text-emerald-900 hover:bg-emerald-100/80 dark:bg-emerald-900 dark:text-emerald-100",
  }

  return (
    <div className={cn(baseClass, variants[variant], className)} {...props} />
  )
}

export { Badge }
