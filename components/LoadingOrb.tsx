"use client";

import { useEffect, useState } from "react";

const MESSAGES = [
  "reading your room...",
  "mixing mood boards...",
  "hunting for deals...",
  "making it cute...",
  "almost there...",
];

interface LoadingOrbProps {
  step: "design" | "render";
}

export function LoadingOrb({ step }: LoadingOrbProps) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setIdx((i) => (i + 1) % MESSAGES.length);
    }, 1800);
    return () => clearInterval(id);
  }, []);

  const stepLabel =
    step === "design" ? "reading your room & picking products" : "painting your new space";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "60px 20px",
        gap: 28,
      }}
    >
      <div style={{ position: "relative", width: 120, height: 120 }}>
        <div className="loading-orb" style={{ position: "absolute", inset: 0 }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.01em",
            marginBottom: 6,
          }}
        >
          {MESSAGES[idx]}
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 14 }}>{stepLabel}</div>
      </div>
    </div>
  );
}
