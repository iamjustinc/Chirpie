"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ConversationThread } from "@/components/digest/ConversationThread";
import { mockDigest } from "@/lib/mock-data";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { ArrowRight } from "lucide-react";

export default function DemoPage() {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--chirpie-background)" }}
    >
      {/* Demo banner */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-4 border-b"
        style={{
          backgroundColor: "var(--chirpie-muted)",
          borderColor: "var(--chirpie-border)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">🐦</span>
          <p className="text-xs font-semibold text-foreground truncate">
            Demo Digest — this is what Chirpie looks like.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <ThemeSwitcher size="sm" />
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Link
              href="/sign-up"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-pill text-xs font-semibold transition-all"
              style={{
                backgroundColor: "var(--chirpie-primary)",
                color: "var(--chirpie-primary-foreground)",
              }}
            >
              Get started
              <ArrowRight size={12} />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Demo digest — full height, no auth required */}
      <div className="flex-1 max-w-2xl mx-auto w-full" style={{ height: "calc(100vh - 57px)" }}>
        <ConversationThread digest={mockDigest} />
      </div>
    </div>
  );
}
