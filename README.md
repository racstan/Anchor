# Anchor

**Version: 0.1.21**

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

Anchor asks what to call you once, stores a local copy of that profile, and uses it for greetings and your avatar. If you already set up Anchor elsewhere, onboarding can load the saved profile and workspace from Dropbox before asking you to start over. You can change the name later from the profile button in the bottom-left sidebar or from Settings.

Onboarding also lets you start with a blank workspace or keep the gentle starter examples. An optional 4–6 digit device PIN adds a local lock on the next visit; the PIN is stored only as a SHA-256 digest. If it is forgotten, the recovery action resets local Anchor data.

## AI connection

Open **Settings → AI connection**, choose a provider, enter its credentials, discover or type a model ID, and save the connection. Anchor supports OpenAI-compatible providers, Gemini, and Cloudflare Workers AI through the adapters in `src/lib/ai.ts`.

Browser requests use `/api/anchor-ai`, a short-lived Vercel/server development relay that avoids provider CORS restrictions. The relay does not persist keys or decision context. API credentials remain in the browser's local storage, and are copied into the sync vault only when cloud sync is enabled, so use a private device and a sync provider you trust.

Once connected, AI is available throughout the workspace:

- **Dashboard:** ask for patterns, priorities, or one small next step across projects, anchors, notes, and decision rooms.
- **Projects:** generate a project brief, uncover missing context, or turn project anchors into a realistic seven-day plan.
- **Anchors:** draft or polish an anchor while writing, reflect on an existing anchor, find blind spots, make reminders more actionable, and ask the transparent workspace agent to propose reviewed red/green diffs for safe edits, additions, or cleanup.
- **Decision space:** continue the full contextual decision conversation as before.
- **Walkthrough:** follow exact actions for common tasks and ask Anchor questions about the app or your workspace.

These actions are opt-in: Anchor does not silently analyze or auto-send workspace data. Each action shows what context is being used and sends it only to the provider you configured.

When a newer Anchor release is available, the app checks on launch and opens a cumulative, scrollable changelog—from v0.1.0 through the waiting release—before offering the platform-specific update action. The release history remains available from the update prompt even if GitHub history cannot be reached.

## Workspace backups

**Settings → Workspace data** can export anchors, projects, decisions, notes, your profile, and safe preferences to a readable JSON file. AI provider/model preferences, appearance, and notification schedules sync with the workspace when cloud sync is enabled; the AI API key is included in the cloud-sync vault so another device can use the connection, while manual exports still omit it. Dropbox/WebDAV credentials and the device PIN remain device-only. Imports are validated and can either merge records by ID or replace the current workspace. Older state-only JSON backups are accepted too.

**Notes** are a flexible place for rough thoughts, lists, drafts, and reference material. From Decision space, any recent note can be added directly to the situation or more-context field before asking Anchor to think it through.

## Record identity and editing

Every workspace record has a stable machine ID and a readable reference. Global anchors use references such as `GLOBAL-ANCHOR-0001`; project anchors include their project name, such as `PROJECT-TRADING-ANCHOR-0002`, so they cannot be confused with anchors in another space. Projects, notes, decision rooms, and chat messages retain compact serials such as `P-0001`, `N-0001`, `D-0001`, and `M-0001`. References remain unique through local backups and sync, and older workspaces are handled automatically on the next open. New anchors start outside the daily rotation; pin one when you want it on Today.

## Dropbox sync

The released web app is preconfigured with Anchor's public Dropbox App Key. Users only open **Settings → Cloud sync**, choose **Dropbox**, click **Connect Dropbox**, and approve access. They do not create an app, paste an access token, or create a folder. OAuth uses the browser-compatible PKCE code flow; access and refresh tokens stay in that device's local storage. The vault syncs workspace data plus preferences, including notification choices and the AI API key, so another device can use the configured decision companion. Every sync is serialized and runs pull → merge → push; a failed pull never overwrites the remote vault. Use a Dropbox vault you trust; provider access tokens and device-only locks remain local.

Desktop releases use Tauri's signed updater and can install updates from inside Anchor. Android releases download the signed APK inside Anchor and open Android's installer; Android may ask once for permission to install apps from Anchor, and the final install confirmation is always controlled by Android. The workflow also produces a signed AAB that is ready for Play Store submission when distribution is configured. The direct-APK installer permission is intended for sideloaded releases; review Google Play's `REQUEST_INSTALL_PACKAGES` policy before using the AAB there.

The Dropbox app owner must configure an **App folder** app with `account_info.read`, `files.metadata.read`, `files.content.read`, and `files.content.write`, and register the exact callback `https://anchor-chi-eight.vercel.app/dropbox/callback`. On native releases, Anchor opens Dropbox in the system browser and hands the result back through its `anchor://` app link; the custom URI does not need to be added to Dropbox. Anchor creates a folder named after the vault automatically, then stores the workspace JSON at `/Anchor/anchor-vault.json` inside the Dropbox app folder. Decisions, anchors, notes, profile data, AI connection settings including the API key, and notification choices are included; Dropbox access tokens are not.

## Notifications

Open **Settings → Notifications** to opt in to AI-response notices and scheduled anchor or thought reminders. Choose hourly, daily, weekday, or weekly delivery and a local time. Android schedules can fire while the app is closed; web and desktop reminders run while Anchor is open. Permission is requested only after you choose to enable notifications.

Starter wellbeing anchors are evidence-informed rather than medical prescriptions. They link to public guidance from WHO, CDC, NCCIH, and MedlinePlus, and remind people to seek qualified care for symptoms or treatment decisions.

## Project structure

- `src/App.tsx` — responsive application shell and views
- `src/App.css` — shared visual system and responsive styles
- `src/lib/anchors.ts` — anchor/project/decision models and local persistence
- `src/lib/workspace.ts` — profile persistence and validated backup format
- `src/lib/ai.ts` — provider adapters and live model discovery
- `src/lib/notifications.ts` — opt-in OS/browser notifications and reminder schedules
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
