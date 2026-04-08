"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import Image from "next/image";
import { landingPageChat } from "@/lib/mock-data";

function TypingBubble() {
  return (
    <div className="flex gap-1 items-center px-4 py-3 rounded-2xl rounded-bl-sm bg-white shadow-bubble max-w-[80px]">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-2 h-2 rounded-full bg-muted-foreground typing-dot"
          style={{ animation: `typingDot 1.4s ease-in-out infinite`, animationDelay: `${i * 160}ms` }}
        />
      ))}
    </div>
  );
}

export function PhoneMockup() {
  const [visibleMessages, setVisibleMessages] = useState<typeof landingPageChat>([]);
  const [showTyping, setShowTyping] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    let index = 0;

    function showNext() {
      if (index >= landingPageChat.length) {
        // Reset after a pause
        timeout = setTimeout(() => {
          setVisibleMessages([]);
          setShowTyping(false);
          index = 0;
          showNext();
        }, 3500);
        return;
      }

      const msg = landingPageChat[index];

      if (msg.role === "assistant") {
        setShowTyping(true);
        timeout = setTimeout(() => {
          setShowTyping(false);
          setVisibleMessages((prev) => [...prev, msg]);
          index++;
          timeout = setTimeout(showNext, 800);
        }, 900);
      } else {
        setVisibleMessages((prev) => [...prev, msg]);
        index++;
        timeout = setTimeout(showNext, 900);
      }
    }

    timeout = setTimeout(showNext, 600);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <div className="relative mx-auto" style={{ width: 260, height: 520 }}>
      {/* Phone shell */}
      <div
        className="absolute inset-0 rounded-[2.5rem] border-[6px] border-gray-200 shadow-2xl overflow-hidden"
        style={{ backgroundColor: "var(--chirpie-background)" }}
      >
        {/* Status bar */}
        <div
          className="flex items-center justify-between px-5 py-2 text-[9px] font-medium"
          style={{ color: "var(--chirpie-muted-foreground)" }}
        >
          <span>9:41</span>
          <div className="w-16 h-4 bg-black/10 rounded-full mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
          <span>●●●</span>
        </div>

        {/* Chat header */}
        <div
          className="flex items-center gap-2 px-4 py-2 border-b"
          style={{ borderColor: "var(--chirpie-border)" }}
        >
          {/* Logo lockup — includes wordmark, no separate text needed */}
          <Image
            src="/chirpie-logo.png"
            alt="Chirpie"
            width={64}
            height={26}
            className="h-[28px] w-auto object-contain"
          />
          <span
            className="ml-auto text-[9px] px-1.5 py-0.5 rounded-pill font-medium"
            style={{
              backgroundColor: "var(--chirpie-chip)",
              color: "var(--chirpie-chip-foreground)",
            }}
          >
            Daily
          </span>
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-2 p-3 overflow-hidden h-full">
          <AnimatePresence initial={false}>
            {visibleMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className="max-w-[85%] px-3 py-2 rounded-2xl text-[10px] leading-relaxed shadow-bubble"
                  style={{
                    backgroundColor:
                      msg.role === "user"
                        ? "var(--chirpie-bubble-user)"
                        : "var(--chirpie-bubble-assistant)",
                    color:
                      msg.role === "user"
                        ? "var(--chirpie-bubble-user-foreground)"
                        : "var(--chirpie-bubble-assistant-foreground)",
                    borderRadius:
                      msg.role === "user"
                        ? "1rem 1rem 0.25rem 1rem"
                        : "1rem 1rem 1rem 0.25rem",
                  }}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}

            {showTyping && (
              <motion.div
                key="typing"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-start"
              >
                <TypingBubble />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Reflection shine */}
      <div
        className="absolute top-8 left-4 w-1 h-24 rounded-full bg-white/40 rotate-12 pointer-events-none"
      />
    </div>
  );
}
