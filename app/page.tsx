"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { HeroClouds } from "@/components/landing/HeroClouds";
import { PhoneMockup } from "@/components/landing/PhoneMockup";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { TrustSection } from "@/components/landing/TrustSection";
import { ThemePreviewSection } from "@/components/landing/ThemePreviewSection";
import { FAQ, Footer } from "@/components/landing/FAQ";
import { PublicNav } from "@/components/shell/NavBar";

export default function LandingPage() {
  return (
    <div style={{ backgroundColor: "var(--chirpie-background)" }}>
      <PublicNav />

      {/* ─── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 pt-16">
        <HeroClouds />

        <div className="relative z-10 max-w-5xl mx-auto w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-16 py-16">
          {/* Left: copy */}
          <div className="flex-1 text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-pill border mb-6 text-xs font-semibold"
                style={{
                  backgroundColor: "var(--chirpie-card)",
                  borderColor: "var(--chirpie-border)",
                  color: "var(--chirpie-accent)",
                }}>
                <span>✨</span>
                <span>AI-native news companion</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-foreground leading-tight tracking-tight text-balance">
                News, but it{" "}
                <span
                  className="relative inline-block"
                  style={{ color: "var(--chirpie-accent)" }}
                >
                  texts you back.
                </span>
              </h1>

              <p className="mt-6 text-lg text-muted-foreground leading-relaxed max-w-lg text-balance">
                Chirpie turns current events into a personalized, chat-style
                daily digest — delivered in your tone, for the topics you
                actually care about.
              </p>

              {/* CTAs */}
              <div className="mt-8 flex flex-col sm:flex-row items-center lg:items-start gap-3">
                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-pill text-sm font-semibold shadow-soft transition-all"
                    style={{
                      backgroundColor: "var(--chirpie-primary)",
                      color: "var(--chirpie-primary-foreground)",
                    }}
                  >
                    Get started — it's free
                  </Link>
                </motion.div>

                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                  <Link
                    href="/demo"
                    className="inline-flex items-center gap-2 px-7 py-3.5 rounded-pill border text-sm font-semibold transition-all"
                    style={{
                      borderColor: "var(--chirpie-border)",
                      color: "var(--chirpie-foreground)",
                      backgroundColor: "var(--chirpie-card)",
                    }}
                  >
                    View demo digest
                  </Link>
                </motion.div>
              </div>

              {/* Social proof */}
              <p className="mt-6 text-xs text-muted-foreground">
                No credit card · Cancel anytime · Reads in under 3 minutes
              </p>
            </motion.div>
          </div>

          {/* Right: phone mockup */}
          <motion.div
            className="flex-shrink-0"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <PhoneMockup />
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
        >
          <span className="text-xs text-muted-foreground">scroll</span>
          <motion.div
            className="w-0.5 h-8 rounded-full"
            style={{ backgroundColor: "var(--chirpie-border)" }}
            animate={{ scaleY: [1, 0.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
      </section>

      {/* ─── How it works ──────────────────────────────────────────────────── */}
      <HowItWorks />

      {/* ─── Theme previews ────────────────────────────────────────────────── */}
      <ThemePreviewSection />

      {/* ─── Trust / sources ───────────────────────────────────────────────── */}
      <TrustSection />

      {/* ─── FAQ ───────────────────────────────────────────────────────────── */}
      <FAQ />

      {/* ─── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="text-4xl mb-4 block">🐦</span>
          <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-4 text-balance">
            Ready to stay informed without the overwhelm?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto text-balance">
            Set up your digest in under two minutes. Your first chirp lands
            tomorrow morning.
          </p>
          <motion.div
            className="inline-block"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
          >
            <Link
              href="/sign-up"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-pill text-base font-semibold shadow-card transition-all"
              style={{
                backgroundColor: "var(--chirpie-primary)",
                color: "var(--chirpie-primary-foreground)",
              }}
            >
              Start for free
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
