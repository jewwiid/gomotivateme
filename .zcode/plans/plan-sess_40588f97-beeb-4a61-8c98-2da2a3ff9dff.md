# Brand unification & assets for GoMotivateMe

## Goal
Unify the app under one canonical brand — **GoMotivateMe** — across every surface (wordmark, logo mark, metadata, favicon, package name, internal IDs), and ship a real, reusable SVG logo based on the brand kit's upward-momentum mark. Also fix the broken `--color-gold` / `--color-bg-card` CSS variables that currently make ~22 usages render incorrectly.

The canonical brand name in code is `gomotivateme` (lowercase, as today's CSS comment already states and the README already uses). "GoMotivateMe" is the styled/display form.

---

## Step 1 — Fix the broken color tokens first (foundation)

`app/globals.css`:
- Add `--color-gold` to `:root` (brand kit gold ~`#f0b429`) and to `.dark-surface` (a brighter gold for dark).
- Add `--color-bg-card` as an alias of `--color-card` in both `:root` and `.dark-surface` (the ~12 usages of `--color-bg-card` currently resolve to nothing). This is non-breaking and makes existing code correct.

This alone fixes every broken gradient (progress bars, supporter avatars, completion banner, organizer card, header mark).

## Step 2 — Create the real brand assets

**`components/Logo.tsx`** (new) — a single source of truth with:
- `<LogoMark />`: inline SVG of the upward-momentum/chevron mark in the kit's rounded-square tile, gradient cobalt→sky with a gold spark. Accepts `className`/`size`.
- `<Logo />`: `<LogoMark/>` + the wordmark `gomotivateme` (uses the existing `--font-jakarta` variable, `tracking-tight`). Accepts `variant` (`"light" | "dark"`) and `showWordmark`.
- Replaces the copy-pasted `<div>m</div>` blocks in `Header.tsx`, `app/(auth)/layout.tsx`, `app/page.tsx`.

**Static SVG icons under `app/`** (Next.js App Router metadata conventions — auto-detected, no config):
- `app/icon.svg` — the momentum mark in a rounded tile (favicon, 32×32).
- `app/apple-icon.png` — derived tile at 180×180 (PNG; I'll generate via a tiny node script using the SVG, or hand-author a static PNG-safe equivalent).
- `app/opengraph-image` — already exists as a PNG; I'll keep it but also ensure the landing/OG generator references the new wordmark consistently (Step 3).

**`public/brand/`** — canonical raw assets for external use (social, pitch decks):
- `public/brand/logo-mark.svg` — mark only.
- `public/brand/logo-full.svg` — mark + wordmark, light bg.
- `public/brand/logo-full-dark.svg` — dark-bg variant.

## Step 3 — Replace every brand string with the canonical name

Mechanical find/replace across these files (verified by grep, exact lines known):

User-facing strings → `gomotivateme` (display `GoMotivateMe` where it's a headline):
- `app/layout.tsx` (metadata title/description/OG — already `gomotivateme`, keep)
- `components/Header.tsx` — wordmark now from `<Logo/>`; "About gomotivateme" kept.
- `app/(auth)/layout.tsx` — **`myodyssey` → `gomotivateme`** + swap mark for `<Logo/>`.
- `app/(auth)/login/page.tsx` — `odyssey` → `gomotivateme`.
- `app/(auth)/signup/page.tsx` — `odyssey` → `gomotivateme`.
- `lib/useVisitorKey.ts` — **migration-safe**: read both old `myodyssey.visitorKey` and new `gomotivateme.visitorKey`, write the new key, so existing visitor IDs aren't orphaned.

Internal identifiers:
- `package.json` — `name: "myodyssey"` → `"gomotivateme"`.
- `convex/schema.ts` comment, `.env.local.example`, `README.md` — already `gomotivateme`; no change needed (verified).

## Step 4 — Wire `<Logo/>` everywhere the old `<div>m</div>` appeared

Replace the hardcoded mark blocks in: `Header.tsx`, `app/(auth)/layout.tsx`, `app/page.tsx` landing nav. Keeps the surrounding layout/animation untouched.

## Step 5 — Verify

- `npm run typecheck` passes.
- `npm run build` succeeds (favicon/icon metadata is picked up at build).
- Grep confirms zero remaining `myodyssey`/bare `odyssey` brand strings in `app/`, `components/`, `lib/`.

---

## Files touched
**New:** `components/Logo.tsx`, `app/icon.svg`, `app/apple-icon.png`, `public/brand/logo-mark.svg`, `public/brand/logo-full.svg`, `public/brand/logo-full-dark.svg`
**Edited:** `app/globals.css`, `components/Header.tsx`, `app/(auth)/layout.tsx`, `app/(auth)/login/page.tsx`, `app/(auth)/signup/page.tsx`, `app/page.tsx`, `lib/useVisitorKey.ts`, `package.json`

## Not in scope (flagging)
- The ~10 `from-accent to-gold` *gradient* usages on progress bars/avatars will now render correctly once `--color-gold` exists; I'm not redesigning those components, just fixing the missing token.
- Replacing PNG illustrations (`public/illustrations/*`) with on-brand versions — those are content illustrations, separate from the brand mark. Happy to do that as a follow-up.