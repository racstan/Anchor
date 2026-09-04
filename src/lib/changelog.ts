export interface AppChangelogEntry {
  version: string
  title: string
  summary: string
  highlights: string[]
  releasedAt?: string
  releaseUrl?: string
}

/**
 * The curated story of Anchor. Release metadata can add newer chapters at
 * runtime, while this local history means the journey still reads beautifully
 * when GitHub is unavailable or a native updater only returns one release.
 */
export const APP_CHANGELOG: readonly AppChangelogEntry[] = [
  {
    version: '0.1.0',
    title: 'A steady place to begin',
    releasedAt: '2026-08-31',
    summary: 'Anchor opened as a calm, local-first home for the ideas, principles, and decisions worth keeping close.',
    highlights: [
      'Anchors, projects, and decision space in one focused workspace',
      'The same React experience on the web and inside the Tauri desktop/mobile shell',
      'Local-first storage from the very first thought',
    ],
  },
  {
    version: '0.1.1',
    title: 'A release path for every screen',
    releasedAt: '2026-09-01',
    summary: 'The first cross-platform release foundation made Anchor ready to travel with you.',
    highlights: [
      'Signed release pipeline for Windows, Linux, macOS, and Android',
      'A small shell around a shared, responsive workspace',
      'A foundation for calm updates without giving up local ownership',
    ],
  },
  {
    version: '0.1.2',
    title: 'Anchors become yours',
    releasedAt: '2026-09-01',
    summary: 'Capturing and tending your context became a complete, fluid loop.',
    highlights: [
      'Full create, edit, pin, and delete flows for anchors and projects',
      'More capable multi-turn AI conversations',
      'Responsive navigation and a quieter collapsed sidebar',
    ],
  },
  {
    version: '0.1.3',
    title: 'A clearer way to connect',
    releasedAt: '2026-09-01',
    summary: 'Anchor learned how to meet you where your workspace already lives, and made room for a little wisdom.',
    highlights: [
      'One-click Dropbox connection for workspace sync',
      'Wisdom & Philosophy dashboard with offline thoughts',
      'Cleaner sync and authorization guidance',
    ],
  },
  {
    version: '0.1.4',
    title: 'Private sync, thoughtfully handled',
    releasedAt: '2026-09-02',
    summary: 'Cloud continuity arrived without making your workspace feel less like your own.',
    highlights: [
      'PKCE-based Dropbox authorization',
      'More deliberate release and sync polish',
      'Credentials remain local while your chosen vault carries workspace context',
    ],
  },
  {
    version: '0.1.5',
    title: 'More room to think',
    releasedAt: '2026-09-02',
    summary: 'Notes joined anchors and decisions, giving unfinished thoughts a place to wait.',
    highlights: [
      'Flexible notes for rough thoughts, lists, drafts, and references',
      'Notes can flow directly into Decision space',
      'A fuller contextual decision workspace',
    ],
  },
  {
    version: '0.1.6',
    title: 'AI across the workspace',
    releasedAt: '2026-09-02',
    summary: 'Anchor became a more useful thinking companion while keeping every AI action opt-in.',
    highlights: [
      'Contextual AI tools across dashboards, projects, anchors, and decisions',
      'Writing help that keeps your meaning intact',
      'Provider choices and relay support for browser-safe requests',
    ],
  },
  {
    version: '0.1.7',
    title: 'A workspace you can trust',
    releasedAt: '2026-09-02',
    summary: 'Every record gained a stable identity, so your context stays recognizable as it grows.',
    highlights: [
      'Readable serials such as A-0001, P-0001, and D-0001',
      'Stable IDs through edits, backups, and sync',
      'Created and updated timestamps on workspace records',
    ],
  },
  {
    version: '0.1.8',
    title: 'Writing without a ceiling',
    releasedAt: '2026-09-02',
    summary: 'Anchors made more room for the nuance that makes a principle useful.',
    highlights: [
      'Removed unnecessary writing limits',
      'More space for context while keeping cards readable',
      'Small refinements to editing and reading flows',
    ],
  },
  {
    version: '0.1.9',
    title: 'Preferences follow you',
    releasedAt: '2026-09-02',
    summary: 'Your chosen way of working became part of the safe, portable workspace preferences.',
    highlights: [
      'Safe appearance and workspace preferences can sync',
      'More resilient merge behavior for multi-device work',
      'Manual exports continue to leave secrets out',
    ],
  },
  {
    version: '0.1.10',
    title: 'Restore without starting over',
    releasedAt: '2026-09-02',
    summary: 'A new device can now become home without asking you to rebuild what already matters.',
    highlights: [
      'Dropbox restore during onboarding',
      'Notification preferences and schedules',
      'Safer recovery when a remote vault is unavailable',
    ],
  },
  {
    version: '0.1.11',
    title: 'Ready for pocket and desktop',
    releasedAt: '2026-09-02',
    summary: 'Native releases learned the small details that make a workspace feel at home on every screen.',
    highlights: [
      'Android safe-area support',
      'Native Dropbox OAuth handoff',
      'Smoother cross-platform shell behavior',
    ],
  },
  {
    version: '0.1.12',
    title: 'Anchor details, kept close',
    releasedAt: '2026-09-03',
    summary: 'An anchor can now open into its own quiet space, with optional context when the thought needs less explanation.',
    highlights: [
      'Dedicated anchor detail pages',
      'Optional anchor context for lighter captures',
      'Clearer paths between projects and their anchors',
    ],
  },
  {
    version: '0.1.13',
    title: 'Smoother journeys',
    releasedAt: '2026-09-03',
    summary: 'Moving around Anchor became easier, especially when the workspace is in your hand.',
    highlights: [
      'Improved mobile navigation',
      'More dependable sync and restore transitions',
      'A refreshed app icon across native releases',
    ],
  },
  {
    version: '0.1.14',
    title: 'Updates you can see',
    releasedAt: '2026-09-03',
    summary: 'Native updates became more understandable from the first click through the final install step.',
    highlights: [
      'Android update installation support',
      'Clearer update permissions and handoff',
      'Signed release artifacts for safer installs',
    ],
  },
  {
    version: '0.1.15',
    title: 'Drafts that wait for you',
    releasedAt: '2026-09-03',
    summary: 'Half-finished thoughts stopped disappearing just because life interrupted the capture.',
    highlights: [
      'Autosaved unfinished anchor, project, note, and decision drafts',
      'Gentle restore and discard controls',
      'Draft state remains local to the device',
    ],
  },
  {
    version: '0.1.16',
    title: 'A fuller harbor',
    releasedAt: '2026-09-03',
    summary: 'Anchors, notes, and decisions gained more ways to help you return to what matters.',
    highlights: [
      'Expanded anchor, note, and decision tools',
      'Clearer daily focus and navigation themes',
      'Small visual improvements across the workspace',
    ],
  },
  {
    version: '0.1.17',
    title: 'Sync revisions, serialized',
    releasedAt: '2026-09-04',
    summary: 'Dropbox writes became more deliberate, reducing the chance of a quiet revision being overwritten.',
    highlights: [
      'Correctly serialized Dropbox update revisions',
      'More predictable sync retries',
      'A calmer multi-device handoff',
    ],
  },
  {
    version: '0.1.18',
    title: 'Decision space, less crowded',
    releasedAt: '2026-09-04',
    summary: 'The decision workspace now compresses gracefully when you need more room for the situation itself.',
    highlights: [
      'Collapsed “Set the scene” sidebar stays compact',
      'Better responsive layout for two-pane decision work',
      'Less visual friction while moving through a decision',
    ],
  },
  {
    version: '0.1.19',
    title: 'AI that shows its work',
    releasedAt: '2026-09-04',
    summary: 'Anchor’s workspace agent became transparent: you can see the context it received and review every proposed change before it touches your anchors.',
    highlights: [
      'Anchor AI shows supplied context and omitted records',
      'Git-style red removals and green additions for every proposed edit',
      'Review, select, add, update, or safely remove anchors with explicit approval',
      'Attachment-only anchors, image previews, and video players',
    ],
  },
  {
    version: '0.1.20',
    title: 'Every update tells its story',
    releasedAt: '2026-09-04',
    summary: 'Updates now arrive with a warm welcome and the complete Anchor journey, so no improvement gets lost between releases.',
    highlights: [
      'Update notices open automatically when a newer release is found',
      'Beautiful cumulative changelog from the first Anchor release to today',
      'Release history still reads offline from the local curated fallback',
    ],
  },
  {
    version: '0.1.21',
    title: 'Context that names itself',
    releasedAt: '2026-09-04',
    summary: 'Anchor references now tell you where an anchor belongs, while new reminders stay out of Today until you choose to pin them.',
    highlights: [
      'Scope-aware references such as GLOBAL-ANCHOR-0001 and PROJECT-TRADING-ANCHOR-0002',
      'New anchors start outside the daily rotation',
      'A concise walkthrough with exact actions and workspace-aware AI help',
    ],
  },
  {
    version: '0.1.22',
    title: 'Shorter names, same context',
    releasedAt: '2026-09-04',
    summary: 'Project anchors now use compact lowercase initials, so Trading Rulebook anchors read as tr-0001 instead of a long project label.',
    highlights: [
      'Project anchor references use the first letter of each project-name word',
      'Existing legacy A-0001 searches continue to work',
      'Anchor references stay unique through stable workspace serials',
    ],
  },
]
