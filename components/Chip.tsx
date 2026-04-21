"use client";

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

export function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`chip ${active ? "chip-active" : ""}`}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}
