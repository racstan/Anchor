# Anchor

Anchor is a calm, local-first workspace for the ideas, principles, and decisions you want to keep close. The same React frontend runs on the web and inside the Tauri 2 desktop/mobile shell.

## Run it

```bash
npm install
npm run dev
```

Validation and production build:

```bash
npm run lint
npm test
npm run build
```

The live web app is deployed at [anchor-chi-eight.vercel.app](https://anchor-chi-eight.vercel.app).

## First launch

Anchor asks what to call you once, stores that profile on the device, and uses it for greetings and your avatar. You can change it later from the profile button in the bottom-left sidebar or from Settings.

Onboarding also lets you start with a blank workspace or keep the gentle starter examples. An optional 4–6 digit device PIN adds a local lock on the next visit; the PIN is stored only as a SHA-256 digest. If it is forgotten, the recovery action resets local Anchor data.

## AI connection

Open **Settings → AI connection**, choose a provider, enter its credentials, discover or type a model ID, and save the connection. Anchor supports OpenAI-compatible providers, Gemini, and Cloudflare Workers AI through the adapters in `src/lib/ai.ts`.

Browser requests use `/api/anchor-ai`, a short-lived Vercel/server development relay that avoids provider CORS restrictions. The relay does not persist keys or decision context. API credentials remain in the browser's local storage, so use a private device and deploy your own relay for a production setup with stricter secrets management.

## Workspace backups

**Settings → Workspace data** can export anchors, projects, decisions, and your profile to a readable JSON file. API keys are deliberately excluded. Imports are validated and can either merge records by ID or replace the current workspace. Older state-only JSON backups are accepted too.

Starter wellbeing anchors are evidence-informed rather than medical prescriptions. They link to public guidance from WHO, CDC, NCCIH, and MedlinePlus, and remind people to seek qualified care for symptoms or treatment decisions.

## Project structure

- `src/App.tsx` — responsive application shell and views
- `src/App.css` — shared visual system and responsive styles
- `src/lib/anchors.ts` — anchor/project/decision models and local persistence
- `src/lib/workspace.ts` — profile persistence and validated backup format
- `src/lib/ai.ts` — provider adapters and live model discovery
- `api/anchor-ai.ts` — Vercel production AI relay
- `vite-ai-proxy.ts` — local development/preview AI relay
- `src-tauri/` — Tauri 2 packaging shell

## Template research

Anchor stays on Vite + React because that keeps the web, desktop, Android, and iOS builds on one frontend. A wholesale copy of a Next.js or Tailwind admin template would make the Tauri build and the existing calm visual identity harder to maintain.

The most useful references reviewed were:

- [shadcn/ui](https://ui.shadcn.com/) — accessible, copy-in components under the MIT license
- [shadcn dashboard landing template](https://github.com/shadcnstore/shadcn-dashboard-landing-template) — MIT Vite/React dashboard reference
- [modern-desktop-app-template](https://github.com/elibroftw/modern-desktop-app-template) — CC0 Tauri 2 + React 19 shell reference

Anchor uses those as implementation references rather than importing an unrelated admin shell wholesale.
