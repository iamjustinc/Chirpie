"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface DigestIntroMessageProps {
  greeting: string;
}

export function DigestIntroMessage({ greeting }: DigestIntroMessageProps) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-2.5">
      {/* Date badge */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex justify-center"
      >
        <span
          className="px-3 py-1 rounded-pill text-[10px] font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: "var(--chirpie-muted)",
            color: "var(--chirpie-muted-foreground)",
          }}
        >
          {today}
        </span>
      </motion.div>

      {/* Greeting bubble */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="flex items-end gap-2.5"
      >
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
          style={{ backgroundColor: "var(--chirpie-muted)" }}
        >
          <Image src="/bird-logo.png" alt="" width={28} height={28} className="w-6 h-6 object-contain" />
        </div>
        <div
          className="px-4 py-3 rounded-2xl rounded-bl-sm max-w-[82%]"
          style={{
            backgroundColor: "var(--chirpie-bubble-assistant)",
            color: "var(--chirpie-bubble-assistant-foreground)",
            boxShadow: "0 3px 14px 0 var(--chirpie-shadow)",
          }}
        >
          <p className="text-sm font-semibold">{greeting}</p>
        </div>
      </motion.div>
    </div>
  );
}
