"use client";

import type { DesignResponse } from "@/lib/types";

interface MoodCardProps {
  design: DesignResponse;
}

export function MoodCard({ design }: MoodCardProps) {
  return (
    <div
      className="reveal reveal-1"
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 18,
        padding: 22,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          flexWrap: "wrap",
          marginBottom: 8,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 30,
            letterSpacing: "-0.025em",
            lineHeight: 1,
          }}
        >
          {design.vibeName.toLowerCase()}
        </div>
        <div className="italic-serif" style={{ fontSize: 20, color: "var(--text-muted)" }}>
          {design.tagline.toLowerCase()}
        </div>
      </div>

      <p
        style={{
          color: "var(--text-muted)",
          fontSize: 14,
          lineHeight: 1.5,
          marginBottom: 18,
        }}
      >
        {design.description.toLowerCase()}
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 18 }}>
        {design.moodWords.map((w, i) => (
          <span
            key={`${w}-${i}`}
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              padding: "5px 10px",
              borderRadius: 999,
              fontSize: 12,
              color: "var(--text)",
              fontWeight: 500,
            }}
          >
            {w.toLowerCase()}
          </span>
        ))}
      </div>

      <div>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            marginBottom: 8,
            fontWeight: 700,
          }}
        >
          palette
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {design.colorPalette.map((c, i) => (
            <div
              key={`${c.hex}-${i}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                padding: "6px 10px 6px 6px",
                borderRadius: 999,
              }}
            >
              <span
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 999,
                  background: c.hex,
                  border: "1px solid var(--border-strong)",
                  display: "inline-block",
                }}
                aria-hidden
              />
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {c.name.toLowerCase()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
