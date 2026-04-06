"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ConversationThread } from "@/components/digest/ConversationThread";
import { mockDigest } from "@/lib/mock-data";
import { ThemeSwitcher } from "@/components/theme/ThemeSwitcher";
import { ArrowRight, Sparkles, Loader2, WifiOff } from "lucide-react";
import { getLiveDemoDigest } from "@/lib/demo/get-live-demo-digest";
import type { Digest } from "@/lib/types";

// ─── Mode types ───────────────────────────────────────────────────────────────

type DemoMode = "mock" | "loading" | "live" | "error";

// ─── Mode badge ───────────────────────────────────────────────────────────────

interface ModeBadgeProps {
  mode: DemoMode;
  onTryLive: () => void;
}

function ModeBadge({ mode, onTryLive }: ModeBadgeProps) {
  if (mode === "mock") {
    return (
      <motion.button
        onClick={onTryLive}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.96 }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold border transition-colors"
        style={{
          backgroundColor: "var(--chirpie-card)",
          color: "var(--chirpie-primary)",
          borderColor: "var(--chirpie-primary)",
        }}
      >
        <Sparkles size={11} />
        Try live AI
      </motion.button>
    );
  }

  if (mode === "loading") {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold border"
        style={{
          backgroundColor: "var(--chirpie-muted)",
          color: "var(--chirpie-muted-foreground)",
          borderColor: "var(--chirpie-border)",
        }}
      >
        <Loader2 size={11} className="animate-spin" />
        Transforming…
      </div>
    );
  }

  if (mode === "live") {
    return (
      <div
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold"
        style={{
          backgroundColor: "var(--chirpie-primary)",
          color: "var(--chirpie-primary-foreground)",
        }}
      >
        <span className="relative flex h-2 w-2">
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ backgroundColor: "var(--chirpie-primary-foreground)" }}
          />
          <span
            className="relative inline-flex rounded-full h-2 w-2"
            style={{ backgroundColor: "var(--chirpie-primary-foreground)" }}
          />
        </span>
        Live AI
      </div>
    );
  }

  // error state
  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-pill text-xs font-semibold border"
      style={{
        backgroundColor: "var(--chirpie-card)",
        color: "var(--chirpie-muted-foreground)",
        borderColor: "var(--chirpie-border)",
      }}
    >
      <WifiOff size={11} />
      AI unavailable
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DemoPage() {
  const [mode, setMode] = useState<DemoMode>("mock");
  const [liveDigest, setLiveDigest] = useState<Digest | null>(null);

  const handleTryLive = useCallback(async () => {
    setMode("loading");
    try {
      const digest = await getLiveDemoDigest();
      setLiveDigest(digest);
      setMode("live");
    } catch (err) {
      console.error(
        "[Chirpie Demo] Live transform failed — falling back to mock.",
        err
      );
      setMode("error");
    }
  }, []);

  // Active digest: use live output when available, otherwise mockDigest
  const activeDigest = mode === "live" && liveDigest ? liveDigest : mockDigest;

  const bannerTitle =
    mode === "live"
      ? "Live AI Digest — transformed by Claude just now."
      : "Demo Digest — this is what Chirpie looks like.";

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--chirpie-background)" }}
    >
      {/* ── Banner ───────────────────────────────────────────────────────── */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-4 border-b"
        style={{
          backgroundColor: "var(--chirpie-muted)",
          borderColor: "var(--chirpie-border)",
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base">🐦</span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.p
              key={bannerTitle}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="text-xs font-semibold text-foreground truncate"
            >
              {bannerTitle}
            </motion.p>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <ModeBadge mode={mode} onTryLive={handleTryLive} />
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
              Get started <ArrowRight size={12} />
            </Link>
          </motion.div>
        </div>
      </div>

      {/* ── Thread ───────────────────────────────────────────────────────── */}
      <div
        className="flex-1 max-w-2xl mx-auto w-full"
        style={{ height: "calc(100vh - 57px)" }}
      >
        {/*
          key forces ConversationThread to fully remount + re-animate when
          switching from mock → live so the new stories bubble in fresh.
        */}
        <ConversationThread
          key={mode === "live" && liveDigest ? "live" : "mock"}
          digest={activeDigest}
        />
      </div>
    </div>
  );
}
