"use client";

import type { DesignItem } from "@/lib/types";
import { storeUrl, storePillClass } from "@/lib/store";

interface ProductCardProps {
  item: DesignItem;
  delay: number;
}

export function ProductCard({ item, delay }: ProductCardProps) {
  const href = storeUrl(item.store, item.searchQuery);

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer noopener"
      className="product-card reveal"
      style={{
        display: "flex",
        gap: 14,
        padding: 16,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 16,
        textDecoration: "none",
        color: "inherit",
        animationDelay: `${delay}s`,
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: 14,
          background: "var(--bg-elevated)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 28,
          flexShrink: 0,
          border: "1px solid var(--border)",
        }}
        aria-hidden
      >
        {item.emoji}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
            flexWrap: "wrap",
          }}
        >
          <span className={storePillClass(item.store)}>{item.store}</span>
          <span
            className="counter-num"
            style={{ fontSize: 15, color: "var(--accent)", fontWeight: 800 }}
          >
            ${item.price.toFixed(2)}
          </span>
        </div>
        <div
          style={{
            fontWeight: 700,
            fontSize: 15,
            lineHeight: 1.3,
            marginBottom: 4,
          }}
        >
          {item.name}
        </div>
        <div style={{ color: "var(--text-muted)", fontSize: 13, lineHeight: 1.4 }}>
          {item.description}
        </div>
      </div>
    </a>
  );
}
