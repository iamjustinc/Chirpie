"use client";

import { motion } from "framer-motion";

interface Cloud {
  id: number;
  x: string;
  y: string;
  scale: number;
  duration: number;
  delay: number;
  opacity: number;
}

const clouds: Cloud[] = [
  { id: 1, x: "8%", y: "12%", scale: 1.2, duration: 9, delay: 0, opacity: 0.7 },
  { id: 2, x: "72%", y: "8%", scale: 0.9, duration: 7, delay: 1.5, opacity: 0.55 },
  { id: 3, x: "40%", y: "18%", scale: 0.7, duration: 11, delay: 0.8, opacity: 0.4 },
  { id: 4, x: "85%", y: "28%", scale: 1.0, duration: 8, delay: 2, opacity: 0.5 },
  { id: 5, x: "20%", y: "35%", scale: 0.6, duration: 13, delay: 3, opacity: 0.3 },
  { id: 6, x: "60%", y: "40%", scale: 0.8, duration: 10, delay: 1, opacity: 0.35 },
];

function CloudShape({ scale = 1, opacity = 0.6 }: { scale?: number; opacity?: number }) {
  return (
    <svg
      width={140 * scale}
      height={60 * scale}
      viewBox="0 0 140 60"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
    >
      <ellipse cx="70" cy="42" rx="70" ry="18" fill="white" />
      <ellipse cx="50" cy="34" rx="32" ry="22" fill="white" />
      <ellipse cx="88" cy="36" rx="28" ry="20" fill="white" />
      <ellipse cx="70" cy="28" rx="22" ry="18" fill="white" />
    </svg>
  );
}

export function HeroClouds() {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {clouds.map((cloud) => (
        <motion.div
          key={cloud.id}
          className="absolute cloud-blur"
          style={{ left: cloud.x, top: cloud.y }}
          animate={{
            y: [0, -14, -6, 0],
            x: [0, 6, -4, 0],
          }}
          transition={{
            duration: cloud.duration,
            delay: cloud.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <CloudShape scale={cloud.scale} opacity={cloud.opacity} />
        </motion.div>
      ))}

      {/* Soft gradient sky */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(186, 230, 255, 0.35) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}
