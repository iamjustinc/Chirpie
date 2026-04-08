"use client";

import { AppNav } from "./NavBar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl";
  padTop?: boolean;
}

const maxWidthMap = {
  sm: "max-w-sm",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
};

export function AppShell({
  children,
  className,
  maxWidth = "md",
  padTop = true,
}: AppShellProps) {
  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--chirpie-background)" }}
    >
      <AppNav />
      <main
        className={cn(
          "mx-auto px-4",
          padTop && "pt-16",
          maxWidthMap[maxWidth],
          className
        )}
      >
        {children}
      </main>
    </div>
  );
}
