"use client";

export function Logo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span className="pulse-dot" aria-hidden />
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 800,
          letterSpacing: "-0.03em",
          fontSize: 22,
        }}
      >
        dormify <span style={{ color: "var(--accent)" }}>ai</span>
      </span>
    </div>
  );
}
