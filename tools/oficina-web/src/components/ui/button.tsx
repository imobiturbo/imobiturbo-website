import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";
import { BUTTON_RECIPES } from "@imobiturbo/design-system/recipes";
const buttonVariants = cva(BUTTON_RECIPES.base, {
  variants: { variant: BUTTON_RECIPES.variants, size: BUTTON_RECIPES.sizes },
  defaultVariants: BUTTON_RECIPES.defaults,
});
function Button({ className, variant = "primary", size = "md", asChild = false, ...props }: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" data-it-component="Button" data-variant={variant} data-size={size} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
export { Button, buttonVariants };
