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

3. **Supabase:** Tables are already applied. To reseed another environment, run `supabase/seed.sql` in the Supabase SQL editor. For the survey (questionnaire + photo upload), run `supabase/migrations/20260218000000_add_questionnaire_response.sql` in the SQL editor to add `questionnaire_response` and the `survey-photos` storage bucket.

4. **Multi-org (optional):** To enable organizations, auth, and RLS, run in order in the Supabase SQL editor:
   - `supabase/migrations/20260227000000_multi_org_schema.sql` — creates organizations, patient_templates, profiles; adds org_id and contact fields to patients; renames patient ids to DEMO-… and assigns to Demo org.
   - `supabase/migrations/20260227000001_multi_org_rls.sql` — replaces permissive RLS with org-scoped and anon (survey) policies.
   - `supabase/migrations/20260228000000_add_scan_questionnaire_response.sql` — adds questionnaire_response and submitted_at to scans (survey response per photo).
   - `supabase/migrations/20260228100000_staff_and_patient_links.sql` — adds staff_join_links, patient_links, patients.linked_user_id, and RPC for patient link by token.
   Then seed a **super_admin** profile (Option C): insert a placeholder row, then after your first sign-up replace with your auth user id:
   ```sql
   -- Insert placeholder (use any UUID for user_id initially)
   INSERT INTO public.profiles (user_id, org_id, role)
   VALUES ('00000000-0000-0000-0000-000000000000'::uuid, NULL, 'super_admin')
   ON CONFLICT (user_id) DO NOTHING;
   ```
   After signing up in the app, get your user id from Supabase Dashboard → Authentication → Users, then run:
   ```sql
   UPDATE public.profiles
   SET user_id = '<your-auth-user-uuid>'
   WHERE role = 'super_admin' AND org_id IS NULL;
   ```
   (Delete the placeholder row first if you prefer, then insert with your real user_id.)

5. **Assign yourself to an org (for Add patient):** The Add Patient page needs your profile to have an `org_id` so it can build patient IDs (e.g. `DEMO-20260227-0001`). Run in the SQL editor (replace `<your-auth-user-uuid>` with the same UUID you used above):
   ```sql
   UPDATE public.profiles
   SET org_id = (SELECT id FROM public.organizations WHERE code = 'DEMO' LIMIT 1)
   WHERE user_id = '<your-auth-user-uuid>';
   ```
   You can use `role = 'org_admin'` or keep `super_admin`; both can add patients when they have an org.

6. **Edge Functions (staff and patient links):** Deploy the Supabase Edge Functions so staff join and patient activation work:
   - `supabase/functions/create-staff-from-link` — creates auth user and profile from a staff join link token.
   - `supabase/functions/activate-patient-link` — creates auth user and links to patient from a patient link token.
   Deploy with **JWT verification disabled** so the join/activate pages (which only send the anon key) can call them; the functions still validate the one-time link token inside the code:
   ```bash
   npx supabase functions deploy create-staff-from-link --no-verify-jwt
   npx supabase functions deploy activate-patient-link --no-verify-jwt
   ```
   If you get a 401 when submitting the join form, redeploy with `--no-verify-jwt`. Also ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `web/.env.local` match your project (Dashboard → Settings → API). Optional: set `SUPABASE_PROJECT_REF` in `web/.env.local` to your project’s reference ID (the subdomain from your Supabase URL, or Dashboard → Settings → General → Reference ID) so that `npx supabase link --project-ref $SUPABASE_PROJECT_REF` can target the right project when deploying functions.

## Users and organizations (no in-app email)

- **Dashboard** and **Admin** are shown only to staff (users with a profile: super_admin, org_admin, org_member). **Patients** (users linked via a patient link) see only the **patient portal** (`/portal`): their info and a button to open the survey. After login, patients are redirected to `/portal`; staff to the dashboard.
- **Super-admin:** In the header, use **Admin** to create organizations and **staff join links**. Each staff link is a copyable URL (expires in 3 days). You send it yourself (email or text). Recipients open `/join?token=...`, enter email and password, and can then sign in as staff.
- **Org dropdown:** On the Dashboard and Admin pages, super_admin sees an organization dropdown with search to filter by org (Dashboard: filter patients; Admin: choose org for staff links).
- **Patient links:** From a patient’s detail page, staff can create a **patient link** (copyable URL). The patient opens `/survey/link/TOKEN`: if not yet activated, they enter email and password to create their account; then they can open the survey or sign in to the portal. The link works until staff **deactivates** it; staff can **reactivate** it. Links expire 3 days after creation if not activated.

## Run

From repo root:

- **Mobile:** `pnpm mobile` or `cd mobile && pnpm start`
- **Web:** `pnpm web` or `cd web && pnpm dev`

### Survey on your phone (same WiFi)

To open the survey on your phone while developing:

1. **Start the web app so it’s reachable on your network:** from repo root run `pnpm web` with the LAN script, or from `web/`: `pnpm run dev:lan`. The dev server will listen on all interfaces instead of just localhost.
2. **Find your PC’s IP address** (the one on your WiFi):
   - **Windows:** open Command Prompt or PowerShell and run `ipconfig`. Look for “IPv4 Address” under your WiFi adapter (e.g. `192.168.1.105`).
   - **macOS/Linux:** run `ip addr` or `ifconfig` and use the inet address of your Wi‑Fi interface.
3. **On your phone** (connected to the same WiFi), open in the browser: `http://<YOUR_IP>:3000/survey/<patientId>` (e.g. `http://192.168.1.105:3000/survey/20260218-001`). Use a patient ID that exists in your dashboard.

If the page doesn’t load, check that Windows Firewall allows inbound connections on port 3000 for Node/Next.js, or temporarily allow the app through the firewall.

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
