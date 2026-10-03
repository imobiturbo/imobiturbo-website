import * as React from "react"
import { cn } from "@/lib/utils"
import { Checkbox as CheckboxPrimitive } from "radix-ui"
import { CheckIcon } from "lucide-react"

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-it-5 shrink-0 items-center justify-center rounded-it-sm border border-it-border bg-it-surface transition-colors duration-it-fast outline-none after:absolute after:-inset-it-3 focus-visible:ring-2 focus-visible:ring-it-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-it-danger data-checked:border-it-accent data-checked:bg-it-accent data-checked:text-it-accent-fg",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon className="size-it-4"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
