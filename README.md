# Dormify AI

An AI powered room redesign tool for college students and young renters. Upload a photo of your room, pick a vibe and budget, and get back an AI generated image of your redesigned room with tappable price tag pins plus a full shopping list with real product links.

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Anthropic Claude Sonnet 4.5 (the brain)
- Google Gemini 2.5 Flash Image (the visual)
- Framer Motion (animations)
- Deploy target: Vercel

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Add your API keys

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Then fill in your keys:

```
ANTHROPIC_API_KEY=sk-ant-...
GEMINI_API_KEY=...
```

Get keys from:
- Anthropic: https://console.anthropic.com/
- Google AI Studio: https://aistudio.google.com/app/apikey

### 3. Run locally

```bash
npm run dev
```

Open http://localhost:3000

### 4. Deploy to Vercel

Push this repo to GitHub, then import it at https://vercel.com/new. Add the two environment variables in the Vercel dashboard under Project Settings, Environment Variables. Deploy.

That's it. One click after the keys are in.

## Project Structure

```
app/
  api/
    design/route.ts   Claude Sonnet call, returns structured JSON
    render/route.ts   Gemini 2.5 Flash Image call, returns base64 image
  globals.css         Theme, fonts, animations
  layout.tsx          Root layout with fonts
  page.tsx            Single page app
components/
  UploadZone.tsx      Image drop zone
  Chip.tsx            Vibe and budget chips
  LoadingOrb.tsx      Conic gradient loader with rotating messages
  PricePin.tsx        Tappable price pin overlay
  ProductCard.tsx     Shopping list card
  MoodCard.tsx        Vibe info card
lib/
  image.ts            Client side resize helper
  store.ts            Store URL builder and tint colors
  types.ts            Shared types for the JSON contract
```

## How it works

1. User uploads a room photo. The client resizes it to 1024px JPEG at 85 percent quality.
2. POST to `/api/design` with the image, vibe, and budget. Claude returns strict JSON with vibe name, mood board, shopping list, and an `imagePrompt`.
3. POST to `/api/render` with the image and `imagePrompt`. Gemini returns a base64 image of the redesigned room.
4. Frontend renders the Gemini image with absolute positioned price pins at the x and y coordinates Claude picked. Below the image sits the shopping list and a "while you're at it" cleanup section.

If Gemini fails, the app falls back to the mood board and shopping list without the generated image.

## Scripts

- `npm run dev` start dev server
- `npm run build` production build
- `npm run start` run production build
- `npm run lint` lint
- `npm run typecheck` TypeScript check
