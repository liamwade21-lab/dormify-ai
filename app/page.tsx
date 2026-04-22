"use client";

import { useEffect, useMemo, useState } from "react";
import type { DesignResponse } from "@/lib/types";
import { resizeToBase64 } from "@/lib/image";
import { UploadZone } from "@/components/UploadZone";
import { Chip } from "@/components/Chip";
import { LoadingOrb } from "@/components/LoadingOrb";
import { PricePin } from "@/components/PricePin";
import { ProductCard } from "@/components/ProductCard";
import { MoodCard } from "@/components/MoodCard";
import { Counter } from "@/components/Counter";
import { Logo } from "@/components/Logo";

interface VibePreset {
  emoji: string;
  label: string;
}

const VIBE_PRESETS: VibePreset[] = [
  { emoji: "📚", label: "dark academia" },
  { emoji: "✨", label: "clean minimal" },
  { emoji: "🎮", label: "gaming setup" },
  { emoji: "🌾", label: "cozy cottagecore" },
  { emoji: "💿", label: "y2k cyber" },
  { emoji: "🎍", label: "japandi zen" },
  { emoji: "🌵", label: "boho desert" },
  { emoji: "🎀", label: "soft girl pastel" },
];

const BUDGET_PRESETS = [
  { label: "under $100", value: 100 },
  { label: "under $300", value: 300 },
  { label: "under $500", value: 500 },
  { label: "under $1k", value: 1000 },
];

type Phase = "idle" | "loading-design" | "results" | "error";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [resizing, setResizing] = useState(false);

  const [vibe, setVibe] = useState<string>("");
  const [customVibe, setCustomVibe] = useState<string>("");
  const [budget, setBudget] = useState<number | null>(null);
  const [customBudget, setCustomBudget] = useState<string>("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [design, setDesign] = useState<DesignResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pinsReady, setPinsReady] = useState(false);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function handleFile(f: File) {
    setFile(f);
    setBase64(null);
    setResizing(true);
    try {
      const b64 = await resizeToBase64(f, 1024, 0.85);
      setBase64(b64);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "could not read that image");
      setFile(null);
      setPreview(null);
    } finally {
      setResizing(false);
    }
  }

  const effectiveVibe = customVibe.trim() || vibe;
  const effectiveBudget = (() => {
    const n = parseFloat(customBudget);
    if (!Number.isNaN(n) && n > 0) return n;
    return budget ?? 0;
  })();

  const canGenerate =
    !!base64 && effectiveVibe.length > 0 && effectiveBudget > 0 && !resizing && phase !== "loading-design";

  async function handleGenerate() {
    if (!base64 || !effectiveVibe || !effectiveBudget) return;
    setErrorMsg(null);
    setDesign(null);
    setPinsReady(false);
    setPhase("loading-design");

    try {
      const designRes = await fetch("/api/design", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          image: base64,
          vibe: effectiveVibe,
          budget: effectiveBudget,
        }),
      });
      if (!designRes.ok) {
        const err = await safeError(designRes);
        throw new Error(err);
      }
      const designJson = (await designRes.json()) as DesignResponse;
      setDesign(designJson);
      setPhase("results");
    } catch (err) {
      setPhase("error");
      setErrorMsg(err instanceof Error ? err.message : String(err));
    }
  }

  function handleReset() {
    setFile(null);
    setPreview(null);
    setBase64(null);
    setVibe("");
    setCustomVibe("");
    setBudget(null);
    setCustomBudget("");
    setDesign(null);
    setPhase("idle");
    setErrorMsg(null);
    setPinsReady(false);
  }

  const total = useMemo(() => {
    if (!design) return 0;
    return design.items.reduce((s, it) => s + it.price, 0);
  }, [design]);

  return (
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "24px 20px 80px",
        minHeight: "100vh",
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 28,
        }}
        className="reveal"
      >
        <Logo />
        {phase === "results" || phase === "error" ? (
          <button type="button" onClick={handleReset} className="btn-ghost spring">
            start over
          </button>
        ) : null}
      </header>

      {phase === "idle" ? (
        <IdleView
          preview={preview}
          resizing={resizing}
          vibe={vibe}
          setVibe={setVibe}
          customVibe={customVibe}
          setCustomVibe={setCustomVibe}
          budget={budget}
          setBudget={setBudget}
          customBudget={customBudget}
          setCustomBudget={setCustomBudget}
          onFile={handleFile}
          canGenerate={canGenerate}
          onGenerate={handleGenerate}
        />
      ) : null}

      {phase === "loading-design" ? <LoadingOrb step="design" /> : null}

      {phase === "error" ? (
        <div
          className="reveal"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-strong)",
            borderRadius: 18,
            padding: 24,
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 800,
              fontSize: 22,
              marginBottom: 8,
            }}
          >
            something glitched. tap generate again.
          </div>
          {errorMsg ? (
            <div
              style={{
                fontSize: 12,
                color: "var(--text-dim)",
                marginBottom: 16,
                fontFamily: "monospace",
                wordBreak: "break-word",
              }}
            >
              {errorMsg}
            </div>
          ) : null}
          <button className="btn-primary spring" onClick={handleGenerate}>
            retry
          </button>
        </div>
      ) : null}

      {phase === "results" && design ? (
        <ResultsView
          design={design}
          originalImage={preview}
          total={total}
          pinsReady={pinsReady}
          setPinsReady={setPinsReady}
          debugError={errorMsg}
        />
      ) : null}
    </main>
  );
}

async function safeError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: string };
    if (body?.error) return body.error;
  } catch {
    // ignore
  }
  return `request failed (${res.status})`;
}

interface IdleProps {
  preview: string | null;
  resizing: boolean;
  vibe: string;
  setVibe: (v: string) => void;
  customVibe: string;
  setCustomVibe: (v: string) => void;
  budget: number | null;
  setBudget: (v: number | null) => void;
  customBudget: string;
  setCustomBudget: (v: string) => void;
  onFile: (f: File) => void;
  canGenerate: boolean;
  onGenerate: () => void;
}

function IdleView(props: IdleProps) {
  const {
    preview,
    resizing,
    vibe,
    setVibe,
    customVibe,
    setCustomVibe,
    budget,
    setBudget,
    customBudget,
    setCustomBudget,
    onFile,
    canGenerate,
    onGenerate,
  } = props;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      <section className="reveal reveal-1">
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 44,
            letterSpacing: "-0.035em",
            lineHeight: 1.02,
            margin: 0,
          }}
        >
          your room but{" "}
          <span className="italic-serif" style={{ color: "var(--accent)" }}>
            better
          </span>
        </h1>
        <p
          style={{
            color: "var(--text-muted)",
            fontSize: 16,
            lineHeight: 1.45,
            marginTop: 12,
            marginBottom: 0,
          }}
        >
          snap a pic, pick a vibe, set a budget. we handle the rest.
        </p>
      </section>

      <section className="reveal reveal-2">
        <SectionLabel n={1} title="drop your room" />
        <UploadZone onFile={onFile} preview={preview} />
        {resizing ? (
          <div style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 10 }}>
            compressing...
          </div>
        ) : null}
      </section>

      {preview ? (
        <section className="reveal reveal-3">
          <SectionLabel n={2} title="pick a vibe" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {VIBE_PRESETS.map((v) => (
              <Chip
                key={v.label}
                label={`${v.emoji} ${v.label}`}
                active={vibe === v.label && customVibe.trim() === ""}
                onClick={() => {
                  setVibe(v.label);
                  setCustomVibe("");
                }}
              />
            ))}
          </div>
          <input
            type="text"
            value={customVibe}
            onChange={(e) => setCustomVibe(e.target.value)}
            placeholder="or type your own vibe..."
            style={{
              width: "100%",
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "12px 16px",
              fontSize: 14,
              color: "var(--text)",
            }}
          />
        </section>
      ) : null}

      {preview && (vibe || customVibe.trim()) ? (
        <section className="reveal reveal-4">
          <SectionLabel n={3} title="set a budget" />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
            {BUDGET_PRESETS.map((b) => (
              <Chip
                key={b.value}
                label={b.label}
                active={budget === b.value && customBudget === ""}
                onClick={() => {
                  setBudget(b.value);
                  setCustomBudget("");
                }}
              />
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ color: "var(--text-muted)", fontSize: 14 }}>$</span>
            <input
              type="number"
              inputMode="numeric"
              value={customBudget}
              onChange={(e) => setCustomBudget(e.target.value)}
              placeholder="or set a custom number"
              style={{
                flex: 1,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "12px 16px",
                fontSize: 14,
                color: "var(--text)",
              }}
            />
          </div>
        </section>
      ) : null}

      <section className="reveal reveal-5">
        <button
          type="button"
          className="btn-primary"
          disabled={!canGenerate}
          onClick={onGenerate}
        >
          generate my new room →
        </button>
      </section>
    </div>
  );
}

function SectionLabel({ n, title }: { n: number; title: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        marginBottom: 12,
      }}
    >
      <span
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--text-muted)",
        }}
      >
        {n}
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </span>
    </div>
  );
}

interface ResultsProps {
  design: DesignResponse;
  originalImage: string | null;
  total: number;
  pinsReady: boolean;
  setPinsReady: (v: boolean) => void;
  debugError: string | null;
}

function ResultsView(props: ResultsProps) {
  const {
    design,
    originalImage,
    total,
    pinsReady,
    setPinsReady,
    debugError,
  } = props;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div
        className="reveal"
        style={{
          position: "relative",
          borderRadius: 20,
          overflow: "hidden",
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          boxShadow: "0 30px 60px rgba(0, 0, 0, 0.45)",
        }}
      >
        {originalImage ? (
          <img
            src={originalImage}
            alt="your room"
            style={{ width: "100%", display: "block" }}
            onLoad={() => setPinsReady(true)}
          />
        ) : (
          <div
            style={{
              width: "100%",
              aspectRatio: "4 / 3",
              background: "var(--bg-elevated)",
            }}
          />
        )}
        {originalImage
          ? design.items.map((item, i) => (
              <PricePin
                key={`${item.name}-${i}`}
                item={item}
                index={i}
                ready={pinsReady}
              />
            ))
          : null}
      </div>

      <MoodCard design={design} />

      <section className="reveal reveal-2">
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 800,
              letterSpacing: "-0.02em",
              margin: 0,
            }}
          >
            shopping list
          </h2>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-muted)",
            }}
          >
            total{" "}
            <Counter
              value={total}
              prefix="$"
              decimals={2}
              className="counter-num"
              style={{ color: "var(--accent)", fontSize: 18, marginLeft: 6 }}
            />
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {design.items.map((item, i) => (
            <ProductCard
              key={`${item.name}-${i}`}
              item={item}
              delay={0.05 * i}
            />
          ))}
        </div>
      </section>

      <section className="reveal reveal-3">
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 22,
            fontWeight: 800,
            letterSpacing: "-0.02em",
            margin: "0 0 12px",
          }}
        >
          where each thing goes
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {design.items.map((item, i) => (
            <div
              key={`${item.name}-note-${i}`}
              className="reveal"
              style={{
                display: "flex",
                gap: 14,
                padding: 14,
                background: "var(--bg-card)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                animationDelay: `${0.05 * i}s`,
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "var(--bg-elevated)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
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
                    fontWeight: 700,
                    fontSize: 14,
                    lineHeight: 1.3,
                    marginBottom: 4,
                  }}
                >
                  {item.name}
                </div>
                <div
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 13,
                    lineHeight: 1.4,
                  }}
                >
                  {item.placement.note
                    ? item.placement.note.toLowerCase()
                    : "place this where it feels right in the space."}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {design.changesNeeded.length > 0 ? (
        <section className="reveal reveal-4">
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              fontWeight: 700,
              color: "var(--text-muted)",
              margin: "0 0 10px",
              letterSpacing: "-0.01em",
              textTransform: "lowercase",
            }}
          >
            while you're at it
          </h3>
          <ul
            style={{
              margin: 0,
              padding: 0,
              listStyle: "none",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {design.changesNeeded.map((c, i) => (
              <li
                key={`${c}-${i}`}
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  padding: "10px 14px",
                  color: "var(--text-muted)",
                  fontSize: 13,
                  lineHeight: 1.4,
                }}
              >
                {c.toLowerCase()}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {debugError && process.env.NODE_ENV !== "production" ? (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-dim)",
            fontFamily: "monospace",
            wordBreak: "break-word",
          }}
        >
          debug: {debugError}
        </div>
      ) : null}

      <div
        className="reveal"
        style={{
          fontSize: 11,
          color: "var(--text-dim)",
          textAlign: "center",
          lineHeight: 1.4,
          marginTop: 8,
        }}
      >
        as an amazon associate, dormify earns from qualifying purchases.
      </div>
    </div>
  );
}
