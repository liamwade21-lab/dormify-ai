import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        "bg-warm": "var(--bg-warm)",
        "bg-card": "var(--bg-card)",
        "bg-elevated": "var(--bg-elevated)",
        border: "var(--border)",
        "border-strong": "var(--border-strong)",
        text: "var(--text)",
        "text-muted": "var(--text-muted)",
        "text-dim": "var(--text-dim)",
        accent: "var(--accent)",
        "accent-2": "var(--accent-2)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        editorial: ["var(--font-editorial)", "serif"],
        body: ["var(--font-body)", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px var(--accent-glow)",
        "glow-sm": "0 0 20px var(--accent-glow)",
      },
      borderRadius: {
        card: "18px",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.15)" },
        },
        "orb-spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
        "pin-drop": {
          "0%": { opacity: "0", transform: "translate(-50%, -120%) scale(0.5)" },
          "60%": { opacity: "1", transform: "translate(-50%, -40%) scale(1.1)" },
          "80%": { transform: "translate(-50%, -50%) scale(0.95)" },
          "100%": { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        "orb-spin": "orb-spin 2.2s linear infinite",
        "pin-drop": "pin-drop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "fade-up": "fade-up 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
