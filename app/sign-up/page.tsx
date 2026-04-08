"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, ArrowRight, Check } from "lucide-react";
import { HeroClouds } from "@/components/landing/HeroClouds";
import { loadUserPrefs, saveUserPrefs } from "@/lib/user-prefs";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordStrong = password.length >= 8;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordStrong) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1000));
    // Persist identity so the rest of the app can personalize without auth
    const existing = loadUserPrefs();
    saveUserPrefs({ ...existing, name: name.trim(), email: email.trim() });
    router.push("/onboarding");
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden py-12"
      style={{ backgroundColor: "var(--chirpie-background)" }}
    >
      <HeroClouds />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
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
            <h1 className="text-xl font-bold text-foreground">Create your account</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Your digest is two minutes away.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Your name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex"
                required
                className="w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
                style={{
                  backgroundColor: "var(--chirpie-input)",
                  borderColor: "var(--chirpie-border)",
                  color: "var(--chirpie-foreground)",
                }}
              />
            </div>

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
              <label className="block text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
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
              {password.length > 0 && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <div
                    className="flex-1 h-1 rounded-full transition-all"
                    style={{
                      backgroundColor: passwordStrong
                        ? "var(--chirpie-accent)"
                        : "var(--chirpie-border)",
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {passwordStrong ? (
                      <span className="flex items-center gap-1" style={{ color: "var(--chirpie-accent)" }}>
                        <Check size={10} strokeWidth={3} />
                        Good
                      </span>
                    ) : (
                      "Too short"
                    )}
                  </span>
                </div>
              )}
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading || !name || !email || !passwordStrong}
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
                  Create account
                  <ArrowRight size={15} />
                </>
              )}
            </motion.button>

            <p className="text-center text-[11px] text-muted-foreground pt-1">
              By continuing, you agree to our{" "}
              <a href="#" className="underline hover:no-underline">Terms</a> and{" "}
              <a href="#" className="underline hover:no-underline">Privacy Policy</a>.
            </p>
          </form>

          <p className="text-center text-xs text-muted-foreground mt-6">
            Already have an account?{" "}
            <Link
              href="/sign-in"
              className="font-semibold hover:underline"
              style={{ color: "var(--chirpie-accent)" }}
            >
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
