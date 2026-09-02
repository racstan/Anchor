# AGENTS.md — Anchor

This guide is for AI coding agents (and humans) working in this repo. Keep it tight, local-first, and harbor-calm.

## Project: Anchor
- **What:** Calm, local-first workspace for ideas/principles/decisions. Same React frontend runs on web (Vite) + Tauri 2 desktop/mobile shell.
- **Stack:** Vite + React 19 + TypeScript + Tauri 2. No Next.js, no Tailwind admin wholesale — shadcn/ui and Tauri templates were *references* only.
- **Repo:** `https://github.com/racstan/Anchor.git` (branch `main` is source of truth)

## Deployment — We Ship on Vercel

> **We are posting this on Vercel.** Web frontend is live, auto-deployed from GitHub.

### Live
- **Production URL:** https://anchor-chi-eight.vercel.app
- **Vercel Dashboard:** project `anchor` inside team `team_RaBdby6PWRtCaP15UcTzs0uH`
- **Vercel Project ID:** `prj_HjjwL9De2cjQj6VjgMVVUUqUZSz2`
- **Vercel Org/Team ID:** `team_RaBdby6PWRtCaP15UcTzs0uH`
- **Local link file:** `.vercel/project.json` (gitignored — do not commit)

### Build Config (vercel.json)
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [{ "source": "/dropbox/callback", "destination": "/" }]
}
```
- **Build command:** `npm run build` → `tsc -b && vite build`
- **Output:** `dist/`
- **Framework preset:** `vite`
- **Node:** Vercel default (uses `package.json` engines if set)
- **Install:** `npm install`

### Git Integration (Auto-Deploy)
- **Connected repo:** `racstan/Anchor` → `main` branch
- **Auto-deploy:** Every `git push` to `origin/main` triggers a production build on Vercel. Preview deployments for PRs/branches.
- **Manual trigger (if linked):**
  ```bash
  vercel --prod        # requires `vercel link` already done
  # or
  vercel deploy --prebuilt --prod
  ```
- **Link status:** Already linked locally (`.vercel/project.json` exists). Do NOT re-link unless moved.

### API Relay
- **Route:** `/api/anchor-ai` → `api/anchor-ai.ts` (Vercel Serverless Function)
- **Dev/Preview parity:** `vite-ai-proxy.ts` mounts same handler via Vite plugin `anchorAIProxy()` for `vite dev` + `vite preview`
- **What it does:** Forwards POST `{ url, method, headers, body }` to HTTPS provider (OpenAI-compatible / Gemini / Cloudflare Workers AI). No persistence, no key storage — keys stay in browser `localStorage`.
- **CORS:** Relay avoids browser CORS; never expose keys in logs.
- **Local test:**
  ```bash
  npm run dev   # http://localhost:5173, proxy at /api/anchor-ai
  ```

### Environment
- **No required env vars for basic deploy.** AI credentials are user-supplied at runtime (Settings → AI connection) and stored client-side.
- **Local:** `.env.local` is gitignored. Do not commit secrets. If you need preview secrets, set them in Vercel Dashboard → Settings → Environment Variables (Production/Preview).

### Verify Deployment
```bash
npm run build          # must pass locally first (runs tsc -b)
vercel --prod --yes    # or just git push and watch Vercel
curl -I https://anchor-chi-eight.vercel.app
# check Vercel logs: vercel logs --follow
```

### Common Pitfalls for Agents
- **Don't commit `.vercel/`** — in `.gitignore`. It holds team/project IDs.
- **Don't change `outputDirectory`/`buildCommand`** without updating `vercel.json`.
- **Keep `api/` ESM-compatible** — handler exports default function `(req, res) => handleAIProxy(req,res)`.
- **Tauri ≠ Vercel:** `src-tauri/` is never built on Vercel. Only `dist/` ships.

## Releases — GitHub (Windows / Linux / macOS / Android)

> Desktop + Android ship via GitHub Releases (Tauri), separate from Vercel web.

- **Workflow:** `.github/workflows/release.yml`
- **Trigger:** `git tag vX.Y.Z && git push origin vX.Y.Z` (or `workflow_dispatch` in GitHub UI)
- **What builds:**
  - `publish-desktop` (matrix): `windows-latest` → `msi`+`nsis`, `ubuntu-22.04` → `deb`+`AppImage`, `macos-latest` → `dmg` for both `aarch64` and `x86_64`
  - `android` (ubuntu): `tauri android build --ci --apk true --aab true` → signed universal release `apk` + `aab`. Android is distributed as a direct APK today; the in-app Tauri updater is desktop-only by design.
- **Tooling:** `tauri-apps/tauri-action@v0`, `dtolnay/rust-toolchain@stable`, `actions/setup-node@v4`, `actions/setup-java@v4` + `android-actions/setup-android@v3`
- **Release creation:** Tauri action creates GitHub Release `vX.Y.Z` and attaches desktop bundles; the Android job uses `gh release upload` to append the signed `apk/aab`. It also uploads `anchor-android-apk-aab` as a workflow artifact.
- **Version source:** `src-tauri/tauri.conf.json` (`version`) + `package.json` (`version`) + `src-tauri/Cargo.toml` — keep them in sync before tagging (currently `0.1.9`).
- **Local test before tag:**
  ```bash
  npm run build                      # must pass
  npm run tauri build                # dry-run desktop bundler locally (linux only)
  npm run tauri android build        # needs Android SDK + JDK 17 + rust android targets
  ```
- **Cut a release:**
  ```bash
  npm version patch|minor|major --no-git-tag-version  # or edit package.json/tauri.conf.json/Cargo.toml manually, keep sync
  git add package.json src-tauri/tauri.conf.json src-tauri/Cargo.toml
  git commit -m "chore(release): v0.1.0"
  git tag v0.1.0
  git push origin main --follow-tags      # pushes commit + tag → Actions builds → Release appears in ~15-25 min
  # or trigger manually: gh workflow run release.yml -f tag=v0.1.0
  ```
- **Signing:** Desktop updater artifacts are signed with `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` GitHub Secrets. Android release artifacts are signed with `ANDROID_KEY_BASE64`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD`; the keystore is reconstructed only in CI and never committed.

## Local Dev (agents)
```bash
npm install
npm run dev      # Vite on :5173, Tauri host handling via TAURI_DEV_HOST
npm run lint     # oxlint
npm test         # vitest run
npm run build    # tsc -b && vite build → dist/
```

## Repo Layout
- `src/App.tsx` — shell + views (sidebar, home, anchors, projects, decide, settings)
- `src/App.css` — harbor design system, responsive + collapsed sidebar
- `src/lib/anchors.ts`, `workspace.ts`, `ai.ts`, `security.ts`
- Workspace records carry stable IDs, readable per-type serials (`A-0001`, `P-0001`, `N-0001`, `D-0001`, `M-0001`), and timestamps; `normalizeAnchorState` migrates older local/backup data. Sync/export also carries profile, appearance, and non-secret AI preferences; API keys, provider credentials, and device PINs remain local.
- `api/anchor-ai.ts` — prod relay
- `vite-ai-proxy.ts` — dev relay logic
- `src-tauri/` — Tauri 2 shell
- `vercel.json`, `.vercel/project.json` — deploy config

## Recent Fixes to Remember
- **Sidebar collapsed:** hide nav labels/counts (`span`/`small`) when `.sidebar-collapsed` — prevents “hideous” clipped text. See `src/App.css` @ `min-width: 701px`.
- **Settings stacked:** `settings-layout` is now single centered column (`760px`), linear order `01 Profile → 02 Appearance → 03 Security → 04 AI → 05 Privacy → 06 Data` — no side-by-side cards or inner grids. See `src/App.tsx` `SettingsView` + `src/App.css` `.settings-layout`.

---
*If you change deployment (domain, framework, env), update this file + `README.md` + `vercel.json` together.*
