import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(isoString: string): string {
  const now = new Date();
  const date = new Date(isoString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "yesterday";
  return `${diffDays}d ago`;
}

export function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    general: "General",
    "pop-culture": "Pop Culture",
    finance: "Finance",
    sports: "Sports",
    technology: "Technology",
    world: "World",
  };
  return labels[category] ?? category;
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    general: "bg-sky-100 text-sky-700",
    "pop-culture": "bg-pink-100 text-pink-700",
    finance: "bg-teal-100 text-teal-700",
    sports: "bg-orange-100 text-orange-700",
    technology: "bg-violet-100 text-violet-700",
    world: "bg-amber-100 text-amber-700",
  };
  return colors[category] ?? "bg-muted text-muted-foreground";
}
