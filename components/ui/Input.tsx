import { cn } from "@/lib/utils";
import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
            {label}
          </label>
        )}
        <input
          id={inputId}
          ref={ref}
          className={cn(
            "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800",
            "placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent",
            "disabled:bg-slate-50 disabled:cursor-not-allowed",
            error && "border-red-400 focus:ring-red-400",
            className
          )}
          {...props}
        />
        {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
