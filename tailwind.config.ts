import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Semantic theme tokens — read from CSS variables
        background: "var(--chirpie-background)",
        foreground: "var(--chirpie-foreground)",
        card: {
          DEFAULT: "var(--chirpie-card)",
          foreground: "var(--chirpie-card-foreground)",
        },
        primary: {
          DEFAULT: "var(--chirpie-primary)",
          foreground: "var(--chirpie-primary-foreground)",
        },
        accent: {
          DEFAULT: "var(--chirpie-accent)",
          foreground: "var(--chirpie-accent-foreground)",
        },
        muted: {
          DEFAULT: "var(--chirpie-muted)",
          foreground: "var(--chirpie-muted-foreground)",
        },
        border: "var(--chirpie-border)",
        input: "var(--chirpie-input)",
        ring: "var(--chirpie-ring)",
        chip: {
          DEFAULT: "var(--chirpie-chip)",
          foreground: "var(--chirpie-chip-foreground)",
        },
        bubble: {
          user: "var(--chirpie-bubble-user)",
          "user-fg": "var(--chirpie-bubble-user-foreground)",
          assistant: "var(--chirpie-bubble-assistant)",
          "assistant-fg": "var(--chirpie-bubble-assistant-foreground)",
        },
        // Static palette for non-themed elements
        sky: {
          50: "#f0f9ff",
          100: "#e0f2fe",
          200: "#bae6fd",
          300: "#7dd3fc",
          400: "#38bdf8",
          500: "#0ea5e9",
        },
        blush: {
          50: "#fdf2f8",
          100: "#fce7f3",
          200: "#fbcfe8",
          300: "#f9a8d4",
          400: "#f472b6",
          500: "#ec4899",
        },
        cream: {
          50: "#fffbeb",
          100: "#fef3c7",
          200: "#fde68a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "monospace"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.25rem",
        "3xl": "1.5rem",
        "4xl": "2rem",
        pill: "9999px",
      },
      boxShadow: {
        soft: "0 2px 16px 0 var(--chirpie-shadow)",
        card: "0 4px 24px 0 var(--chirpie-shadow)",
        bubble: "0 2px 8px 0 var(--chirpie-shadow)",
        sticker: "3px 4px 0 0 var(--chirpie-border)",
      },
      animation: {
        "float-slow": "float 8s ease-in-out infinite",
        "float-medium": "float 6s ease-in-out infinite",
        "bounce-soft": "bounceSoft 0.6s ease-in-out",
        "rise-fade": "riseFade 0.5s ease-out forwards",
        "typing-dot": "typingDot 1.4s ease-in-out infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px) translateX(0px)" },
          "33%": { transform: "translateY(-12px) translateX(4px)" },
          "66%": { transform: "translateY(-6px) translateX(-4px)" },
        },
        bounceSoft: {
          "0%": { transform: "scale(1)" },
          "40%": { transform: "scale(1.07)" },
          "70%": { transform: "scale(0.97)" },
          "100%": { transform: "scale(1)" },
        },
        riseFade: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        typingDot: {
          "0%, 60%, 100%": { transform: "translateY(0)", opacity: "0.4" },
          "30%": { transform: "translateY(-6px)", opacity: "1" },
        },
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.34, 1.56, 0.64, 1)",
      },
    },
  },
  plugins: [],
};

export default config;
