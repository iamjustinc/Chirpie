"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    q: "Is Chirpie replacing real journalism?",
    a: "No. Chirpie synthesizes and reformats coverage from real news outlets, then links directly to them. Every story comes with visible attribution and a one-tap path to the original article. Chirpie is a starting point, not a replacement.",
  },
  {
    q: "How is my digest personalized?",
    a: "You choose your interests, preferred tone (casual, professional, Gen Z, minimal), and how long your digest should be. Over time, Chirpie learns from what you tap, save, and skip — and adjusts accordingly.",
  },
  {
    q: "Can I ask Chirpie follow-up questions?",
    a: "Yes. After each story, you'll see follow-up prompts like 'Why does this matter?' or 'Tell me more about the Fed decision.' You can tap those or type your own — Chirpie will respond in the same conversational style.",
  },
  {
    q: "What happens after I finish the digest?",
    a: "Chirpie will offer to dig deeper on any story, or it'll let you know when your next digest is scheduled. You can always explore past stories, check your saved items, or adjust your preferences.",
  },
  {
    q: "How often does Chirpie update?",
    a: "Daily digests are generated each morning. Weekly digests arrive on the day you choose. You can switch between frequencies anytime in your preferences.",
  },
  {
    q: "Is finance advice included?",
    a: "Chirpie covers finance news — company moves, market context, economic signals — but never gives investment advice or price predictions. Finance content uses a calmer, more factual tone than other categories.",
  },
  {
    q: "Can I change my theme?",
    a: "Yes. Themes can be changed anytime from your account page or the nav bar. Classic Chat, Pixel Sky, Retro Pink, and Night Mode are available now — with more coming.",
  },
];

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border-b"
      style={{ borderColor: "var(--chirpie-border)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full py-4 text-left gap-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
      >
        <span className="font-medium text-sm text-foreground">{q}</span>
        <div
          className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center"
          style={{
            backgroundColor: "var(--chirpie-muted)",
            color: "var(--chirpie-muted-foreground)",
          }}
        >
          {open ? <Minus size={12} /> : <Plus size={12} />}
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p className="pb-4 text-sm text-muted-foreground leading-relaxed">
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQ() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-3">
            Questions worth asking
          </h2>
          <p className="text-muted-foreground text-balance">
            Honest answers about how Chirpie works.
          </p>
        </div>

        <div>
          {faqs.map((faq) => (
            <FAQItem key={faq.q} q={faq.q} a={faq.a} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer
      className="border-t py-10 px-4"
      style={{
        borderColor: "var(--chirpie-border)",
        backgroundColor: "var(--chirpie-muted)",
      }}
    >
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <Image src="/bird-logo.png" alt="" width={20} height={20} className="w-5 h-5 object-contain" />
          <span className="font-bold text-foreground">Chirpie</span>
          <span className="text-xs text-muted-foreground ml-2">
            © 2025 Chirpie Inc.
          </span>
        </div>

        <nav className="flex items-center gap-5 flex-wrap justify-center">
          {["Privacy", "Terms", "Contact", "Sign in", "Sign up"].map((link) => (
            <a
              key={link}
              href="#"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {link}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
