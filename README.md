# Anchor

**Version: 0.1.9**

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

Once connected, AI is available throughout the workspace:

- **Dashboard:** ask for patterns, priorities, or one small next step across projects, anchors, notes, and decision rooms.
- **Projects:** generate a project brief, uncover missing context, or turn project anchors into a realistic seven-day plan.
- **Anchors:** draft or polish an anchor while writing, reflect on an existing anchor, find blind spots, and make reminders more actionable.
- **Decision space:** continue the full contextual decision conversation as before.

These actions are opt-in: Anchor does not silently analyze or auto-send workspace data. Each action shows what context is being used and sends it only to the provider you configured.

## Workspace backups

**Settings → Workspace data** can export anchors, projects, decisions, notes, your profile, and safe preferences to a readable JSON file. AI provider/model preferences and appearance sync with the workspace when cloud sync is enabled; API keys, Dropbox/WebDAV credentials, and the device PIN are deliberately excluded. Imports are validated and can either merge records by ID or replace the current workspace. Older state-only JSON backups are accepted too.

**Notes** are a flexible place for rough thoughts, lists, drafts, and reference material. From Decision space, any recent note can be added directly to the situation or more-context field before asking Anchor to think it through.

## Record identity and editing

Every workspace record has a stable machine ID plus a readable serial such as `A-0001` (anchor), `P-0001` (project), `N-0001` (note), `D-0001` (decision room), and `M-0001` (chat message). Serial numbers survive edits and remain stable through local backups and sync; legacy workspaces receive them automatically on the next open. Cards expose the serial, an ID-copy control, and the last-updated time. Anchors, projects, notes, and decision rooms can be edited or renamed, and each has a deliberate delete action. Hover a timestamp for the exact created/updated time.

## Dropbox sync

The released web app is preconfigured with Anchor's public Dropbox App Key. Users only open **Settings → Cloud sync**, choose **Dropbox**, click **Connect Dropbox**, and approve access. They do not create an app, paste an access token, or create a folder. OAuth uses the browser-compatible PKCE code flow; access and refresh tokens stay in that device's local storage. The vault syncs workspace data plus non-secret preferences, while provider credentials remain device-local.

Desktop releases use Tauri's signed updater and can install updates from inside Anchor. Android does not support Tauri's in-app updater; Android users can download the signed APK from the GitHub release page. The workflow also produces a signed AAB that is ready for Play Store submission when distribution is configured.

The Dropbox app owner must configure an **App folder** app with `account_info.read`, `files.metadata.read`, `files.content.read`, and `files.content.write`, and register the exact callback `https://anchor-chi-eight.vercel.app/dropbox/callback`. Anchor creates a folder named after the vault automatically, then stores the workspace JSON at `/Anchor/anchor-vault.json` inside the Dropbox app folder. Decisions, anchors, projects, notes, and profile data are included; AI provider keys are not.

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
