import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "green" | "red" | "yellow" | "blue" | "gray";
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "gray", children, className }: BadgeProps) {
  const variants = {
    green:  "bg-green-100 text-green-800",
    red:    "bg-red-100 text-red-800",
    yellow: "bg-yellow-100 text-yellow-800",
    blue:   "bg-blue-100 text-blue-800",
    gray:   "bg-slate-100 text-slate-700",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", variants[variant], className)}>
      {children}
    </span>
  );
}
