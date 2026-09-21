import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "amem-press inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "amem-btn-ritual rounded-full",
        ritual: "amem-btn-ritual rounded-full",
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 rounded-full",
        outline:
          "amem-btn-ghost-porcelain rounded-full border-0 hover:bg-secondary hover:text-secondary-foreground",
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80 rounded-full",
        soft: "rounded-full bg-[color:var(--amem-wine-060)] text-[color:var(--amem-wine)] hover:bg-[color:var(--amem-wine-100)]",
        // gold kept for W0 a11y contract; visually = premium (wine+brass hairline)
        gold: "amem-btn-premium rounded-full",
        premium: "amem-btn-premium rounded-full",
        neutral: "amem-btn-neutral rounded-full",
        ghost: "amem-btn-ghost-porcelain rounded-full hover:bg-secondary",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 min-h-11 px-4 py-2",
        sm: "h-9 min-h-9 rounded-md px-3 text-xs",
        lg: "h-12 min-h-12 rounded-full px-8 text-[15px]",
        icon: "h-11 w-11 min-h-11 min-w-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
