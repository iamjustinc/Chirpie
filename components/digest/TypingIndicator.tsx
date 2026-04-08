"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.25 }}
      className="flex items-start gap-2"
    >
      {/* Avatar */}
      <div
        className="w-13 h-13 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 overflow-hidden"
        style={{ backgroundColor: "var(--chirpie-muted)" }}
      >
        <Image src="/bird-logo.png" alt="" width={44} height={44} className="w-11 h-11 object-contain" />
      </div>

      {/* Typing bubble */}
      <div
        className="flex gap-1.5 items-center px-4 py-3.5 rounded-2xl rounded-bl-sm"
        style={{
          backgroundColor: "var(--chirpie-bubble-assistant)",
          boxShadow: "0 2px 12px 0 var(--chirpie-shadow)",
        }}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: "var(--chirpie-muted-foreground)" }}
            animate={{
              y: [0, -6, 0],
              opacity: [0.4, 1, 0.4],
            }}
            transition={{
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.18,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}
