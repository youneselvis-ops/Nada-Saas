import * as React from "react";
import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "flex min-h-11 w-full border-b border-ink/20 bg-transparent px-1 py-2 text-base text-ink outline-none placeholder:text-fade focus-visible:border-nopal disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
