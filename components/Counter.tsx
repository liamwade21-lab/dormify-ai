"use client";

import { useEffect, useRef, useState } from "react";

interface CounterProps {
  value: number;
  duration?: number;
  prefix?: string;
  decimals?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Counter({
  value,
  duration = 900,
  prefix = "",
  decimals = 2,
  className,
  style,
}: CounterProps) {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    fromRef.current = display;
    startRef.current = null;
    let raf = 0;
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const t = Math.min(1, (ts - startRef.current) / duration);
      // ease out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      const next = fromRef.current + (value - fromRef.current) * eased;
      setDisplay(next);
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration]);

  return (
    <span className={className} style={style}>
      {prefix}
      {display.toFixed(decimals)}
    </span>
  );
}
