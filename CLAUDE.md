# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server at http://localhost:5173/
npm run build      # Production build → dist/  (sets NODE_ENV=production)
npm run preview    # Preview the production build locally
```

There are no tests or linters configured.

## Architecture

This is a **Vite + Vanilla JS** single-page application — no framework. The original prototype was a single HTML file (`base`, kept for reference); it was modularised into ES modules under `src/`.

### Startup sequence (`src/main.js`)

`init()` runs in order:
1. `initConfig()` — fetches `public/config.json` (admin-controlled release schedule)
2. `initState()` — hydrates mutable `state` object from `localStorage`
3. `initAuth()` — connects to Supabase if env vars are present, loads roadmap list
4. Renders the Gantt chart

All functions called from inline `onclick` attributes in dynamically generated HTML are explicitly assigned to `window` in `main.js`. This is intentional — do not move them to module-only scope.

### State (`src/state.js`)

A single mutable `state` object is the source of truth:
```js
state.workstreams  // array of { id, name, color }
state.features     // array of { id, ws, name, start, end, status }
state.nextId       // auto-increment for new features
state.currentRoadmapId / currentRoadmapName
```

Every mutation must call `persistState()` afterward. It writes to `localStorage` and (when Supabase is configured) `saveRoadmap()` syncs to the database. The 7 mutation sites are: `saveFeature`, `deleteFeature`, `saveWorkstream`, `deleteWorkstream`, `dropOn`, `stopResize`, `cellClick`.

### Configuration (`public/config.json` + `src/config.js`)

Release schedule, statuses, months, and column dimensions live in `public/config.json`. Admins edit this file and redeploy — CSMs never touch it. `getConfig()` is imported everywhere constants are needed; never hardcode these values.

Month indices are 0–11 (FEB=0 … JAN=11). Feature `start`/`end` fields are month indices.

### Supabase (`src/auth.js`)

Supabase is **optional** — the app runs fully offline using `localStorage` when `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are absent. When configured:
- Auth: magic link (OTP) via `supabase.auth.signInWithOtp`; session is verified server-side via `supabase.auth.getUser()` (not `getSession()`)
- Table: `roadmaps` — workstreams and features stored as JSONB columns
- RLS: four per-operation policies scoped to `created_by = auth.uid()`; users can only read/write their own roadmaps
- Realtime: subscribed per roadmap UUID via `subscribeRealtime(id)`; live updates overwrite local state and re-render
- Schema: `supabase/schema.sql` — already applied to the dev project via MCP migration; run manually in the SQL editor for new environments. Also enable Realtime on the `roadmaps` table in the Supabase dashboard (Table Editor → roadmaps → Realtime → Enable) — this cannot be done via SQL.

### Export

- **PowerPoint** (`src/export/exportPptx.js`): Uses `pptxgenjs` entirely in-browser. Slide layout constants are at the top of the file (inches). Overflow to a second slide is handled recursively via `buildSlide()`.
- **Google Slides** (`src/export/exportGoogleSlides.js`): Loads `gapi` and `google.accounts.oauth2` at runtime via script tags. Requires `VITE_GOOGLE_CLIENT_ID`. Gracefully alerts if the env var is missing. The slide content is built as a `batchUpdate` request list using EMU units (1 inch = 914400 EMU).

### Deployment

GitHub Actions (`.github/workflows/deploy.yml`) builds on push to `main` and deploys `dist/` to the `gh-pages` branch. The three env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_GOOGLE_CLIENT_ID`) must be set as GitHub repository secrets before deploying.

`vite.config.js` sets `base: '/deployment-roadmap-builder/'` in production so assets resolve correctly on GitHub Pages.
