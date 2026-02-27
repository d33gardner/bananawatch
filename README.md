# BananaWatch Monorepo

Medical MVP: track 28 “patients” (bananas) to simulate wound healing. Mobile scanner (Expo) + web dashboard (Next.js), shared types, Supabase backend.

## Structure

- **`/mobile`** — Expo SDK 54, Expo Router (TypeScript). Entry: `app/index.tsx` (camera view coming next).
- **`/web`** — Next.js 14 App Router (TypeScript, Tailwind). Dashboard layout + single page for grid.
- **`/packages/types`** — Shared `@bananawatch/types` (Database, Patient, Scan interfaces).
- **`/supabase`** — `seed.sql` for `patients` and `scans` tables + RLS (public read/write for MVP).

## Prerequisites

- Node 18+
- pnpm: `npm install -g pnpm`

## Setup

1. **Install dependencies (from repo root):**
   ```bash
   pnpm install
   ```
   Then align Expo packages to SDK 54 (from repo root or `mobile/`):
   ```bash
   cd mobile && npx expo install --fix
   ```

2. **Environment:** Supabase keys are in root `.env.local`. For local dev:
   - **Web:** Next.js loads `.env.local` from the **web** directory. Copy root `.env.local` to `web/.env.local` (or symlink), or run from root and ensure `NEXT_PUBLIC_*` are set.
   - **Mobile:** Expo loads env from the **mobile** directory. Copy root `.env.local` to `mobile/.env.local` so `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` are available.

3. **Supabase:** Tables are already applied. To reseed another environment, run `supabase/seed.sql` in the Supabase SQL editor.

## Run

From repo root:

- **Mobile:** `pnpm mobile` or `cd mobile && pnpm start`
- **Web:** `pnpm web` or `cd web && pnpm dev`

## Shared types

In both apps:

```ts
import type { Database, PatientRow, ScanRow } from "@bananawatch/types";
```

Types match the DB: `patients` (id, status, decay_score, last_scan_date), `scans` (id, patient_id, image_url, analysis_result, created_at).

---

## Deploy dashboard to Vercel (MVP)

Deploy only the **web dashboard** so you can share a link (phone, iPad, small group). Supabase stays as-is; no code changes needed there.

### 1. Push the project to GitHub

- Create a new repository on [GitHub](https://github.com/new) (e.g. `bananawatch`). Do **not** add a README or .gitignore (you already have them).
- In your project folder, run:
  ```bash
  git init
  git add .
  git commit -m "Initial commit"
  git branch -M main
  git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
  git push -u origin main
  ```
- Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name.

### 2. Create a Vercel project and connect the repo

- Go to [vercel.com](https://vercel.com) and sign in (you already have an account).
- Click **Add New** → **Project**.
- **Import** your GitHub repository. Authorize Vercel to access GitHub if asked.
- Select the repo and click **Import**.

### 3. Configure the monorepo (important)

The app lives in the `web` folder and depends on `packages/types`. Set:

| Setting | Value |
|--------|--------|
| **Root Directory** | `web` |
| **Framework Preset** | Next.js (auto-detected) |
| **Install Command** | `cd .. && pnpm install` |
| **Build Command** | `pnpm build` |
| **Output Directory** | (leave default) |

- Click **Edit** next to “Root Directory” and choose `web`.
- Under **Build and Output Settings**, override **Install Command** to: `cd .. && pnpm install`.
- Leave **Build Command** as `pnpm build` (or the default “next build” if it runs from `web`).

### 4. Add environment variables

In the same screen (or **Settings → Environment Variables**), add:

| Name | Value |
|------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL (e.g. `https://xxxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

Use the same values as in your local `web/.env.local`. Do **not** commit `.env.local`; these are set only in Vercel.

### 5. Deploy

- Click **Deploy**. Vercel will install from the repo root (so `@bananawatch/types` resolves), build the Next.js app in `web`, and give you a URL like `https://your-project.vercel.app`.
- Open that URL on your phone or iPad to use the dashboard. Share the link only with your small group.

### Later: self-hosting

When you move off Vercel, you can run the same app on your own server (e.g. Docker, Node on a VPS). You’ll need to:

- Build: from repo root run `pnpm install` then `pnpm --filter @bananawatch/web build`.
- Run: `cd web && pnpm start` (or serve the `web/.next` output with a Node server).
- Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in the host environment.
- Put a reverse proxy (e.g. Nginx) in front with HTTPS if needed.
