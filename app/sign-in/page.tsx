"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { HeroClouds } from "@/components/landing/HeroClouds";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Simulate auth — replace with real auth later
    await new Promise((r) => setTimeout(r, 1000));
    router.push("/digest");
  }

  function handleMagicLink() {
    if (!email) return;
    setMagicSent(true);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ backgroundColor: "var(--chirpie-background)" }}
    >
      <HeroClouds />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        {/* Card */}
        <div
          className="rounded-3xl border p-8 card-shadow"
          style={{
            backgroundColor: "var(--chirpie-card)",
            borderColor: "var(--chirpie-border)",
          }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <Image src="/bird-logo.png" alt="Chirpie" width={88} height={88} className="w-22 h-22 object-contain mx-auto mb-3" />
            <h1 className="text-xl font-bold text-foreground">Welcome back</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your digest is waiting.
            </p>
          </div>

          {magicSent ? (
            <div
              className="text-center py-6 px-4 rounded-2xl"
              style={{ backgroundColor: "var(--chirpie-muted)" }}
            >
              <span className="text-3xl block mb-3">📬</span>
              <p className="font-semibold text-foreground text-sm">
                Magic link sent
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Check {email} for your sign-in link.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                  style={{
                    backgroundColor: "var(--chirpie-input)",
                    borderColor: "var(--chirpie-border)",
                    color: "var(--chirpie-foreground)",
                  }}
                />
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => router.push("#forgot")}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all pr-10"
                    style={{
                      backgroundColor: "var(--chirpie-input)",
                      borderColor: "var(--chirpie-border)",
                      color: "var(--chirpie-foreground)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading || !email || !password}
                whileHover={{ scale: loading ? 1 : 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-3 rounded-pill text-sm font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                style={{
                  backgroundColor: "var(--chirpie-primary)",
                  color: "var(--chirpie-primary-foreground)",
                }}
              >
                {loading ? (
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-1.5 h-1.5 rounded-full bg-white"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={15} />
                  </>
                )}
              </motion.button>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ backgroundColor: "var(--chirpie-border)" }} />
                <span className="text-[11px] text-muted-foreground">or</span>
                <div className="flex-1 h-px" style={{ backgroundColor: "var(--chirpie-border)" }} />
              </div>

              {/* Magic link */}
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={!email}
                className="w-full py-2.5 rounded-pill border text-sm font-medium transition-all disabled:opacity-40 hover:opacity-80"
                style={{
                  borderColor: "var(--chirpie-border)",
                  color: "var(--chirpie-foreground)",
                  backgroundColor: "transparent",
                }}
              >
                Send magic link instead
              </button>
            </form>
          )}

          {/* Sign up link */}
          <p className="text-center text-xs text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link
              href="/sign-up"
              className="font-semibold hover:underline"
              style={{ color: "var(--chirpie-accent)" }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
