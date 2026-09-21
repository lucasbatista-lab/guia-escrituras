import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 min-h-11 w-full rounded-xl border border-input bg-[color:var(--amem-surface)] px-3.5 py-2 text-base shadow-sm",
          "transition-[border-color,box-shadow] duration-[var(--amem-dur-fast)] ease-[var(--amem-ease-soft)]",
          "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
          "placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-wine/30",
          "disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "aria-[invalid=true]:border-destructive/60 aria-[invalid=true]:ring-destructive/30",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
