"use client";

import { useState, useEffect, useRef } from "react";
import type { DesignItem } from "@/lib/types";
import { storeUrl, storePillClass } from "@/lib/store";

interface PricePinProps {
  item: DesignItem;
  index: number;
  ready: boolean;
}

export function PricePin({ item, index, ready }: PricePinProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const href = storeUrl(item.store, item.searchQuery);
  const price = Math.round(item.price);

  return (
    <div
      ref={ref}
      className="price-pin"
      style={{
        left: `${item.placement.x}%`,
        top: `${item.placement.y}%`,
        opacity: ready ? undefined : 0,
        animation: ready
          ? `pin-drop 0.65s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.12 * index}s both`
          : undefined,
      }}
    >
      {open ? (
        <div className="price-pin-expanded" onMouseLeave={() => setOpen(false)}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 18 }} aria-hidden>
              {item.emoji}
            </span>
            <span className={storePillClass(item.store)}>{item.store}</span>
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              lineHeight: 1.25,
              marginBottom: 4,
            }}
          >
            {item.name}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 10,
              lineHeight: 1.35,
            }}
          >
            {item.placement.note}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span
              className="counter-num"
              style={{ fontSize: 15, color: "var(--accent)" }}
            >
              ${item.price.toFixed(2)}
            </span>
            <a
              href={href}
              target="_blank"
              rel="noreferrer noopener"
              style={{
                background: "var(--accent)",
                color: "#0a0907",
                padding: "6px 12px",
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 12,
                textDecoration: "none",
              }}
            >
              shop
            </a>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="price-pin-dot spring"
          onClick={(e) => {
            e.stopPropagation();
            setOpen(true);
          }}
          onMouseEnter={() => setOpen(true)}
          aria-label={`${item.name}, $${item.price.toFixed(2)}`}
        >
          ${price}
        </button>
      )}
    </div>
  );
}
