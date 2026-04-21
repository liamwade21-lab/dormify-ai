"use client";

import { useCallback, useRef, useState } from "react";

interface UploadZoneProps {
  onFile: (file: File) => void;
  preview: string | null;
}

export function UploadZone({ onFile, preview }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLButtonElement>) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        onFile(file);
      }
    },
    [onFile],
  );

  return (
    <button
      type="button"
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`w-full rounded-card border-2 border-dashed bg-[var(--bg-card)] transition-colors spring ${
        dragging ? "border-[var(--accent)]" : "border-[var(--border-strong)]"
      }`}
      style={{
        aspectRatio: preview ? "4 / 3" : "4 / 3",
        overflow: "hidden",
        padding: 0,
        cursor: "pointer",
        position: "relative",
      }}
      aria-label="upload a photo of your room"
    >
      {preview ? (
        <>
          {}
          <img
            src={preview}
            alt="your room"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          <span
            style={{
              position: "absolute",
              bottom: 12,
              right: 12,
              background: "rgba(10, 9, 7, 0.75)",
              backdropFilter: "blur(8px)",
              padding: "8px 14px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text)",
              border: "1px solid var(--border-strong)",
            }}
          >
            tap to replace
          </span>
        </>
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            height: "100%",
            padding: 24,
            color: "var(--text-muted)",
          }}
        >
          <div
            style={{
              fontSize: 40,
              filter: "grayscale(0.2)",
            }}
            aria-hidden
          >
            📷
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              fontSize: 20,
              color: "var(--text)",
            }}
          >
            tap to upload a photo
          </div>
          <div style={{ fontSize: 13 }}>or drag one in. jpg, png, webp.</div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="visually-hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </button>
  );
}
