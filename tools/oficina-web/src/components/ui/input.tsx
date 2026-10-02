import * as React from "react";
import { cn } from "cn";
import { INPUT_RECIPES } from "@imobiturbo/design-system/recipes";
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return <input type={type} data-slot="input" data-it-component="Input" className={cn(INPUT_RECIPES.base, INPUT_RECIPES.sizes.md, className)} {...props} />;
}
export { Input };
