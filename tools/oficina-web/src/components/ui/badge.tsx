import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";
import { BADGE_RECIPES } from "@imobiturbo/design-system/recipes";
const badgeVariants = cva(BADGE_RECIPES.base, { variants: { variant: BADGE_RECIPES.variants, size: BADGE_RECIPES.sizes }, defaultVariants: BADGE_RECIPES.defaults });
function Badge({ className, variant = "default", size = "sm", asChild = false, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
 const Comp = asChild ? Slot.Root : "span";
 return <Comp data-slot="badge" data-it-component="Badge" data-variant={variant} data-size={size} className={cn(badgeVariants({variant, size}), className)} {...props} />;
}
export { Badge, badgeVariants };
