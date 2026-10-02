"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Tabs as TabsPrimitive } from "radix-ui"

function Tabs({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "flex flex-col gap-it-4",
        className
      )}
      {...props}
    />
  )
}

const tabsListVariants = cva(
  "inline-flex flex-wrap w-fit items-center rounded-it-lg p-it-1 bg-it-surface-elevated text-it-text-muted",
  {
    variants: {
      variant: {
        default: "bg-it-surface-elevated",
        line: "gap-it-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
  VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "inline-flex min-h-it-control-md flex-1 items-center justify-center gap-it-2 rounded-it-md px-it-4 py-it-2 text-it-sm font-it-medium whitespace-nowrap text-it-text-muted transition-colors duration-it-fast hover:text-it-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-it-ring disabled:pointer-events-none disabled:opacity-50",
        "bg-transparent",
        "data-active:bg-it-surface data-active:text-it-accent-text data-active:shadow-it-sm",
        "transition-colors duration-it-fast",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn("flex-1 text-it-base outline-none space-y-it-4 pt-it-4", className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
