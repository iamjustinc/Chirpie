"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { cn } from "@/lib/utils";
import { BookOpen, Home, User, Sparkles } from "lucide-react";

const navItems = [
  { href: "/digest", label: "Digest", icon: BookOpen },
  { href: "/account", label: "Account", icon: User },
];

// ─── Public Nav (landing page) ────────────────────────────────────────────────

export function PublicNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto flex items-center justify-between h-20">
        {/* Logo */}
        <Link href="/" className="flex items-center group">
          {/* Logo includes wordmark — no separate text needed */}
          <Image src="/chirpie-logo.png" alt="Chirpie" width={200} height={80} className="h-26 w-auto object-contain" />
        </Link>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Link
            href="/sign-in"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/sign-up"
              className="px-4 py-2 rounded-pill text-sm font-semibold transition-all"
              style={{
                backgroundColor: "var(--chirpie-primary)",
                color: "var(--chirpie-primary-foreground)",
              }}
            >
              Get started
            </Link>
          </motion.div>
        </div>
      </div>
    </nav>
  );
}

// ─── App Nav (authenticated) ──────────────────────────────────────────────────

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        backgroundColor: "var(--chirpie-background)",
        borderColor: "var(--chirpie-border)",
      }}
    >
      <div className="max-w-2xl mx-auto flex items-center justify-between px-4 h-20">
        {/* Logo */}
        <Link href="/digest" className="flex items-center">
          {/* Logo includes wordmark — no separate text needed */}
          <Image src="/chirpie-logo.png" alt="Chirpie" width={250} height={104} className="h-26 w-auto object-contain" />
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
                style={
                  active
                    ? { backgroundColor: "var(--chirpie-muted)" }
                    : {}
                }
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </div>

        {/* Theme switcher */}
        <ThemeSwitcher size="sm" />
      </div>
    </nav>
  );
}
