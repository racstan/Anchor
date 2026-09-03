import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Anchor as AnchorIcon,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Bot,
  Brain,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CirclePlus,
  Cloud,
  Download,
  Command,
  Compass,
  Copy,
  FolderOpen,
  Heart,
  Home,
  KeyRound,
  Layers3,
  Lightbulb,
  Menu,
  MessageCircle,
  Moon,
  MoreHorizontal,
  NotebookPen,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Pin,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  SearchX,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  SlidersHorizontal,
  Sun,
  Trash2,
  TrendingUp,
  Upload,
  UserRound,
  WandSparkles,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  createId,
  filterAnchors,
  formatEntitySerial,
  formatTimestamp,
  formatUpdatedAt,
  matchSearchText,
  getProject,
  getProjectAnchorCount,
  nextSerialNumber,
  readAnchorState,
  writeAnchorState,
} from './lib/anchors'
import type {
  AccentColor,
  Anchor,
  AnchorFilter,
  AnchorScope,
  AnchorState,
  ChatMessage,
  EntitySerialPrefix,
  Decision,
  EvidenceSource,
  Note,
  Project,
} from './lib/anchors'
import {
  AI_PROVIDERS,
  completeAIChat,
  DEFAULT_AI_SETTINGS,
  discoverModels,
  isAIReady,
  parseAIObject,
  readAISettings,
  writeAISettings,
} from './lib/ai'
import type { AIMessage, AIModel, AISettings } from './lib/ai'
import {
  mergeWorkspacePreferences,
  mergeWorkspaceProfile,
  mergeWorkspaceState,
  parseWorkspaceExport,
  readUserProfile,
  serializeWorkspaceExport,
  writeUserProfile,
} from './lib/workspace'
import type { UserProfile, WorkspacePreferences } from './lib/workspace'
import { hashPin, isValidPin, readSecuritySettings, verifyPin, writeSecuritySettings } from './lib/security'
import type { SecuritySettings } from './lib/security'
import { getDailyGreeting } from './lib/greetings'
import {
  checkAppUpdate,
  CURRENT_APP_VERSION,
  getAppPlatform,
  isNativeApp,
} from './lib/updater'
import type { AppUpdateInfo } from './lib/updater'
import {
  completeDropboxOAuth,
  DEFAULT_DROPBOX_APP_KEY,
  DEFAULT_VAULT_NAME,
  executeWorkspaceSync,
  extractDropboxOAuthToken,
  getDropboxNativeCallbackUrl,
  isDropboxNativeCallbackUrl,
  isNativeDropboxOAuthState,
  normalizeSyncSettings,
  readSyncSettings,
  revokeDropboxAccess,
  startDropboxOAuth,
  testDropboxConnection,
  writeSyncSettings,
} from './lib/sync'
import type { SyncProviderType, SyncSettings } from './lib/sync'
import {
  getNextReminderDate,
  normalizeNotificationSettings,
  notificationsHaveReminder,
  notifyAIResponse,
  readNotificationSettings,
  requestNotificationPermission,
  scheduleNativeReminderNotifications,
  sendAppNotification,
  writeNotificationSettings,
} from './lib/notifications'
import type { NotificationContent, NotificationSettings } from './lib/notifications'
import {
  CATEGORY_LABELS,
  downloadAndExpandPhilosophyVault,
  getCachedPhilosophyVault,
  getDailyPhilosophy,
  getRandomPhilosophy,
} from './lib/philosophy'
import type { PhilosophyCategory, PhilosophyThought } from './lib/philosophy'
import './App.css'

type View = 'home' | 'dashboard' | 'all' | 'global' | 'projects' | 'notes' | 'decide' | 'settings'

type AnchorFormData = Pick<Anchor, 'title' | 'body' | 'scope' | 'tag' | 'color' | 'pinned'> & {
  projectId?: string
  evidence?: EvidenceSource
}

type ProjectFormData = Pick<Project, 'name' | 'description' | 'color'>
type Theme = 'light' | 'dark'
type ImportMode = 'replace' | 'merge'

interface AppNotification {
  id: string
  anchorId: string
  title: string
  body: string
  color: AccentColor
  updatedAt: string
  isRead: boolean
}

const THEME_STORAGE_KEY = 'anchor-theme-v1'
const SIDEBAR_STORAGE_KEY = 'anchor-sidebar-collapsed-v1'
const WORKSPACE_PREFERENCES_UPDATED_AT_KEY = 'anchor-workspace-preferences-updated-at-v1'
const NOTIFICATIONS_STORAGE_KEY = 'anchor-read-notifications-v1'
const SPOTLIGHT_STORAGE_KEY = 'anchor-spotlight-v1'

const colorOptions: AccentColor[] = ['coral', 'sage', 'sky', 'gold', 'plum']

const colorLabels: Record<AccentColor, string> = {
  coral: 'Indigo',
  sage: 'Mint',
  sky: 'Azure',
  gold: 'Gold',
  plum: 'Violet',
}

const notificationWeekdays = [
  { value: 1, label: 'Sunday' },
  { value: 2, label: 'Monday' },
  { value: 3, label: 'Tuesday' },
  { value: 4, label: 'Wednesday' },
  { value: 5, label: 'Thursday' },
  { value: 6, label: 'Friday' },
  { value: 7, label: 'Saturday' },
]

function displayName(name: string): string {
  return name.trim() || 'friend'
}

function profileInitial(name: string): string {
  const trimmedName = name.trim()

  return trimmedName ? trimmedName.charAt(0).toUpperCase() : '?'
}

async function copyTextToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value)
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = value
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  document.body.appendChild(textArea)

  try {
    textArea.select()
    if (!document.execCommand('copy')) {
      throw new Error('Clipboard access was not available.')
    }
  } finally {
    textArea.remove()
  }
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    return window.localStorage.getItem(key) === 'true'
  } catch {
    return fallback
  }
}

function readStoredIds(key: string): string[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? '[]')

    return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : []
  } catch {
    return []
  }
}

function readStoredTimestamp(key: string): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  try {
    const value = window.localStorage.getItem(key)
    return value?.trim() || undefined
  } catch {
    return undefined
  }
}

function buildWorkspacePreferences(
  settings: AISettings,
  theme: Theme,
  sidebarCollapsed: boolean,
  notificationSettings: NotificationSettings,
  updatedAt?: string,
): WorkspacePreferences {
  return {
    updatedAt,
    theme,
    sidebarCollapsed,
    notifications: notificationSettings,
    ai: {
      providerId: settings.providerId,
      model: settings.model,
      baseUrl: settings.baseUrl,
      accountId: settings.accountId,
    },
  }
}

function readStoredTheme(): Theme {
  if (typeof window === 'undefined') {
    return 'light'
  }

  try {
    const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY)

    if (storedTheme === 'light' || storedTheme === 'dark') {
      return storedTheme
    }
  } catch {
    return 'light'
  }

  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function isToday(value: string | undefined): boolean {
  return value !== undefined && new Date(value).toDateString() === new Date().toDateString()
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function readSpotlightId(): string | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  try {
    const savedRotation = JSON.parse(window.localStorage.getItem(SPOTLIGHT_STORAGE_KEY) ?? 'null') as { day?: string; anchorId?: string } | null

    return savedRotation?.day === todayKey() ? savedRotation.anchorId : undefined
  } catch {
    return undefined
  }
}

function writeSpotlightId(anchorId: string): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(SPOTLIGHT_STORAGE_KEY, JSON.stringify({ day: todayKey(), anchorId }))
}

function pickRandomAnchorId(anchors: Anchor[], currentId?: string): string | undefined {
  const choices = anchors.filter((anchor) => anchor.id !== currentId)

  if (choices.length === 0) {
    return anchors[0]?.id
  }

  return choices[Math.floor(Math.random() * choices.length)]?.id
}

function getInitialSpotlightId(): string | undefined {
  const savedId = readSpotlightId()

  if (savedId) {
    return savedId
  }

  const pinnedAnchors = readAnchorState().anchors.filter((anchor) => anchor.pinned)
  const randomId = pickRandomAnchorId(pinnedAnchors)

  if (randomId) {
    writeSpotlightId(randomId)
  }

  return randomId
}

function buildNotifications(
  anchors: Anchor[],
  projects: Project[],
  readNotificationIds: string[],
): AppNotification[] {
  return anchors
    .filter((anchor) => anchor.pinned)
    .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
    .map((anchor) => {
      const project = getProject(projects, anchor.projectId)
      const id = `anchor-reminder:${anchor.id}`

      return {
        id,
        anchorId: anchor.id,
        title: anchor.title,
        body: project ? `A reminder from ${project.name}.` : 'A reminder you chose to keep everywhere.',
        color: anchor.color,
        updatedAt: anchor.updatedAt,
        isRead: readNotificationIds.includes(id) || isToday(anchor.lastSeenAt),
      }
    })
}

function buildReminderNotificationContent(
  anchors: Anchor[],
  settings: NotificationSettings,
): NotificationContent | null {
  const pinnedAnchors = anchors.filter((anchor) => anchor.pinned)
  const anchor = settings.anchorReminders && pinnedAnchors.length > 0
    ? pinnedAnchors[Math.floor(Date.now() / 86_400_000) % pinnedAnchors.length]
    : undefined
  const thought = settings.thoughtReminders ? getDailyPhilosophy() : undefined

  if (!anchor && !thought) return null

  if (anchor && thought) {
    return {
      title: 'A gentle moment for you',
      body: `${anchor.title}\n\n${thought.quote} — ${thought.author}`,
    }
  }
  if (anchor) {
    return {
      title: 'A reminder worth returning to',
      body: anchor.title,
    }
  }
  return {
    title: 'A thought for today',
    body: `${thought?.quote ?? ''} — ${thought?.author ?? 'Anchor'}`,
  }
}

interface OnboardingViewProps {
  theme: Theme
  onComplete: (name: string, keepExamples: boolean, pin?: string) => Promise<void>
  onRestoreFromDropbox: () => Promise<void>
  restoreStatus?: SyncSettings['lastSyncStatus']
  restoreMessage?: string
}

function OnboardingView({ theme, onComplete, onRestoreFromDropbox, restoreStatus, restoreMessage }: OnboardingViewProps) {
  const [name, setName] = useState('')
  const [starterChoice, setStarterChoice] = useState<'examples' | 'fresh'>('fresh')
  const [pin, setPin] = useState('')
  const [pinConfirmation, setPinConfirmation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [restoreError, setRestoreError] = useState<string>()
  const [error, setError] = useState<string>()
  const restoreInProgress = isRestoring && restoreStatus !== 'success' && restoreStatus !== 'error'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = name.trim()

    if (!trimmedName) {
      setError('Tell me what to call you, and I’ll remember it.')
      return
    }

    if (pin && !isValidPin(pin)) {
      setError('Your optional PIN must be 4 to 6 digits.')
      return
    }

    if (pin && pin !== pinConfirmation) {
      setError('Those PINs do not match yet.')
      return
    }

    setIsSubmitting(true)
    setError(undefined)

    try {
      await onComplete(trimmedName, starterChoice === 'examples', pin || undefined)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Anchor could not finish setting up this device.')
      setIsSubmitting(false)
    }
  }

  const handleRestoreFromDropbox = async () => {
    setIsRestoring(true)
    setRestoreError(undefined)

    try {
      // Native OAuth stays busy until the deep-link callback updates the status;
      // web OAuth navigates away from this page before this promise resolves.
      await onRestoreFromDropbox()
    } catch (restoreFailure) {
      setRestoreError(restoreFailure instanceof Error ? restoreFailure.message : 'Dropbox could not be opened right now.')
      setIsRestoring(false)
    }
  }

  const isAndroidNative = isNativeApp() && getAppPlatform() === 'android'

  return (
    <div className={`onboarding-shell ${theme === 'dark' ? 'theme-dark' : ''} ${isAndroidNative ? 'native-android' : ''}`}>
      <main className="onboarding-card">
        <div className="onboarding-brand">
          <span className="brand-mark" aria-hidden="true"><AnchorIcon size={19} strokeWidth={2.5} /></span>
          <span>anchor</span>
        </div>
        <div className="onboarding-symbol"><Sparkles size={22} /></div>
        <p className="eyebrow">A steady place to return to</p>
        <h1>Let&apos;s make this yours.</h1>
        <p className="onboarding-copy">Before we put anything down, what should Anchor call you?</p>
        <form className="onboarding-form" onSubmit={handleSubmit}>
          <div className="onboarding-choice-group" role="group" aria-label="Choose how to begin">
            <span className="onboarding-choice-label">How would you like to begin?</span>
            <button
              className={`onboarding-choice ${starterChoice === 'fresh' ? 'selected' : ''}`}
              type="button"
              aria-pressed={starterChoice === 'fresh'}
              onClick={() => setStarterChoice('fresh')}
            >
              <span className="onboarding-choice-mark" />
              <span><strong>A blank room</strong><small>Start with only what matters to you.</small></span>
            </button>
            <button
              className={`onboarding-choice ${starterChoice === 'examples' ? 'selected' : ''}`}
              type="button"
              aria-pressed={starterChoice === 'examples'}
              onClick={() => setStarterChoice('examples')}
            >
              <span className="onboarding-choice-mark" />
              <span><strong>A few examples</strong><small>Keep gentle starter anchors to explore.</small></span>
            </button>
          </div>
          <label className="form-field" htmlFor="onboarding-name">
            <span>Your name</span>
            <input
              id="onboarding-name"
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                setError(undefined)
              }}
              placeholder="e.g. Maya"
              autoComplete="name"
              autoFocus
            />
          </label>
          <label className="form-field" htmlFor="onboarding-pin">
            <span>Device PIN <em>optional · 4–6 digits</em></span>
            <input
              id="onboarding-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                setError(undefined)
              }}
              placeholder="Leave blank to skip"
              autoComplete="new-password"
            />
          </label>
          {pin && (
            <label className="form-field" htmlFor="onboarding-pin-confirmation">
              <span>Confirm your PIN</span>
              <input
                id="onboarding-pin-confirmation"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pinConfirmation}
                onChange={(event) => {
                  setPinConfirmation(event.target.value.replace(/\D/g, '').slice(0, 6))
                  setError(undefined)
                }}
                placeholder="Enter it once more"
                autoComplete="new-password"
              />
            </label>
          )}
          {error && <div className="settings-error" role="alert"><CircleAlert size={14} /> <span>{error}</span></div>}
          <button className="primary-button onboarding-submit" type="submit" disabled={isSubmitting || restoreInProgress}>
            {isSubmitting ? 'Setting up…' : 'Enter my space'} <ArrowUpRight size={16} />
          </button>
        </form>
        <div className="onboarding-restore">
          <div>
            <strong>Already set up on another device?</strong>
            <span>Load your saved profile and workspace from Dropbox.</span>
          </div>
          <button className="secondary-button onboarding-restore-button" type="button" onClick={() => void handleRestoreFromDropbox()} disabled={isSubmitting || restoreInProgress}>
            <Cloud size={15} /> {restoreInProgress ? 'Opening Dropbox…' : 'Load from Dropbox'}
          </button>
          {restoreError && <div className="settings-error" role="alert"><CircleAlert size={14} /> <span>{restoreError}</span></div>}
          {restoreStatus === 'syncing' && !restoreError && <div className="onboarding-restore-status"><RefreshCw className="spin" size={14} /> <span>Loading your saved Anchor workspace…</span></div>}
          {restoreStatus === 'error' && restoreMessage && !restoreError && <div className="settings-error" role="alert"><CircleAlert size={14} /> <span>{restoreMessage}</span></div>}
        </div>
        <p className="onboarding-note"><ShieldCheck size={14} /> Your device PIN and provider credentials stay on this device. Your profile and workspace can travel with your Dropbox vault.</p>
      </main>
    </div>
  )
}

interface PinLockViewProps {
  theme: Theme
  name: string
  onUnlock: (pin: string) => Promise<boolean>
  onReset: () => void
}

function PinLockView({ theme, name, onUnlock, onReset }: PinLockViewProps) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string>()
  const [isChecking, setIsChecking] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isValidPin(pin)) {
      setError('Enter the 4 to 6 digit PIN you set for this device.')
      return
    }

    setIsChecking(true)
    setError(undefined)

    try {
      const unlocked = await onUnlock(pin)

      if (!unlocked) {
        setPin('')
        setError('That PIN did not open this space. Try again.')
      }
    } catch {
      setError('Anchor could not check that PIN. Please try again.')
    } finally {
      setIsChecking(false)
    }
  }

  const isAndroidNative = isNativeApp() && getAppPlatform() === 'android'

  return (
    <div className={`pin-lock-shell onboarding-shell ${theme === 'dark' ? 'theme-dark' : ''} ${isAndroidNative ? 'native-android' : ''}`}>
      <main className="onboarding-card pin-lock-card">
        <div className="onboarding-brand">
          <span className="brand-mark" aria-hidden="true"><AnchorIcon size={19} strokeWidth={2.5} /></span>
          <span>anchor</span>
        </div>
        <div className="onboarding-symbol"><KeyRound size={22} /></div>
        <p className="eyebrow">Welcome back, {displayName(name)}</p>
        <h1>Your space is resting.</h1>
        <p className="onboarding-copy">Enter your optional device PIN to continue. It never leaves this device.</p>
        <form className="onboarding-form" onSubmit={handleSubmit}>
          <label className="form-field" htmlFor="unlock-pin">
            <span>Device PIN</span>
            <input
              id="unlock-pin"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                setError(undefined)
              }}
              autoComplete="current-password"
              autoFocus
            />
          </label>
          {error && <div className="settings-error" role="alert"><CircleAlert size={14} /> <span>{error}</span></div>}
          <button className="primary-button onboarding-submit" type="submit" disabled={isChecking}>
            {isChecking ? 'Checking…' : 'Unlock Anchor'} <ArrowUpRight size={16} />
          </button>
        </form>
        <button className="pin-reset-button" type="button" onClick={onReset}>Forgot your PIN? Reset this device</button>
      </main>
    </div>
  )
}

function App() {
  const [state, setState] = useState<AnchorState>(() => readAnchorState())
  const [profile, setProfile] = useState<UserProfile>(() => readUserProfile())
  const [security, setSecurity] = useState<SecuritySettings>(() => readSecuritySettings())
  const [isLocked, setIsLocked] = useState(() => Boolean(readSecuritySettings().pinHash))
  const [aiSettings, setAISettings] = useState<AISettings>(() => readAISettings())
  const [availableModels, setAvailableModels] = useState<AIModel[]>([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState<string>()
  const [activeView, setActiveView] = useState<View>('home')
  const [activeProjectId, setActiveProjectId] = useState<string>()
  const [activeAnchorId, setActiveAnchorId] = useState<string>()
  const [listFilter, setListFilter] = useState<AnchorFilter>('all')
  const [query, setQuery] = useState('')
  const [spotlightAnchorId, setSpotlightAnchorId] = useState<string | undefined>(() => getInitialSpotlightId())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    readStoredBoolean(SIDEBAR_STORAGE_KEY, false),
  )
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme())
  const [workspacePreferencesUpdatedAt, setWorkspacePreferencesUpdatedAt] = useState<string | undefined>(() =>
    readStoredTimestamp(WORKSPACE_PREFERENCES_UPDATED_AT_KEY),
  )
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() =>
    readStoredIds(NOTIFICATIONS_STORAGE_KEY),
  )
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(() => readNotificationSettings())
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [editingAnchor, setEditingAnchor] = useState<Anchor | undefined>(undefined)
  const [isProjectComposerOpen, setIsProjectComposerOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined)
  const [aiReflectionAnchor, setAIReflectionAnchor] = useState<Anchor | undefined>(undefined)
  const [syncSettings, setSyncSettings] = useState<SyncSettings>(() => readSyncSettings())
  const [syncBusy, setSyncBusy] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo>()
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toast, setToast] = useState<string>()
  const [relativeTimeNow, setRelativeTimeNow] = useState(() => Date.now())
  const topSearchRef = useRef<HTMLInputElement>(null)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const notificationWrapRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef(state)
  const profileRef = useRef(profile)
  const aiSettingsRef = useRef(aiSettings)
  const themeRef = useRef(theme)
  const sidebarCollapsedRef = useRef(sidebarCollapsed)
  const notificationSettingsRef = useRef(notificationSettings)
  const workspacePreferencesUpdatedAtRef = useRef(workspacePreferencesUpdatedAt)
  const syncSettingsRef = useRef(syncSettings)
  const dropboxCallbackHandledRef = useRef(false)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    aiSettingsRef.current = aiSettings
  }, [aiSettings])

  useEffect(() => {
    themeRef.current = theme
  }, [theme])

  useEffect(() => {
    sidebarCollapsedRef.current = sidebarCollapsed
  }, [sidebarCollapsed])

  useEffect(() => {
    notificationSettingsRef.current = notificationSettings
  }, [notificationSettings])

  useEffect(() => {
    workspacePreferencesUpdatedAtRef.current = workspacePreferencesUpdatedAt
  }, [workspacePreferencesUpdatedAt])

  useEffect(() => {
    syncSettingsRef.current = syncSettings
  }, [syncSettings])

  useEffect(() => {
    if (!syncSettings.dropboxAccessToken?.trim() && !syncSettings.dropboxRefreshToken?.trim()) {
      dropboxCallbackHandledRef.current = false
    }
  }, [syncSettings.dropboxAccessToken, syncSettings.dropboxRefreshToken])

  const showToast = (message: string) => {
    setToast(message)
  }

  useEffect(() => {
    writeSyncSettings(syncSettings)
  }, [syncSettings])

  useEffect(() => {
    if (!workspacePreferencesUpdatedAt) return

    try {
      window.localStorage.setItem(WORKSPACE_PREFERENCES_UPDATED_AT_KEY, workspacePreferencesUpdatedAt)
    } catch {
      // Persistence is optional when storage is unavailable.
    }
  }, [workspacePreferencesUpdatedAt])

  useEffect(() => {
    writeNotificationSettings(notificationSettings)
  }, [notificationSettings])

  useEffect(() => {
    const interval = window.setInterval(() => setRelativeTimeNow(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const touchWorkspacePreferences = () => {
    const timestamp = new Date().toISOString()
    workspacePreferencesUpdatedAtRef.current = timestamp
    setWorkspacePreferencesUpdatedAt(timestamp)
  }

  const applyWorkspacePreferences = (preferences: WorkspacePreferences) => {
    if (preferences.theme) {
      setTheme(preferences.theme)
    }
    if (typeof preferences.sidebarCollapsed === 'boolean') {
      setSidebarCollapsed(preferences.sidebarCollapsed)
    }
    if (preferences.ai) {
      const providerId = AI_PROVIDERS.some((provider) => provider.id === preferences.ai?.providerId)
        ? preferences.ai.providerId
        : aiSettingsRef.current.providerId

      setAISettings((currentSettings) => ({
        ...currentSettings,
        providerId,
        apiKey: providerId === currentSettings.providerId ? currentSettings.apiKey : '',
        model: preferences.ai?.model ?? currentSettings.model,
        baseUrl: preferences.ai?.baseUrl ?? currentSettings.baseUrl,
        accountId: preferences.ai?.accountId ?? currentSettings.accountId,
      }))
      setAvailableModels([])
      setModelsError(undefined)
    }
    if (preferences.notifications) {
      setNotificationSettings(normalizeNotificationSettings(preferences.notifications))
    }
    if (preferences.updatedAt) {
      workspacePreferencesUpdatedAtRef.current = preferences.updatedAt
      setWorkspacePreferencesUpdatedAt(preferences.updatedAt)
    }
  }

  const changeTheme = (nextTheme: Theme | ((currentTheme: Theme) => Theme)) => {
    touchWorkspacePreferences()
    setTheme(nextTheme)
  }

  const changeSidebarCollapsed = (nextValue: boolean | ((currentValue: boolean) => boolean)) => {
    touchWorkspacePreferences()
    setSidebarCollapsed(nextValue)
  }

  const restoreFromDropbox = async () => {
    const currentSettings = syncSettingsRef.current
    const appKey = currentSettings.dropboxAppKey?.trim() || DEFAULT_DROPBOX_APP_KEY
    const setupSettings = normalizeSyncSettings({
      ...currentSettings,
      enabled: false,
      provider: 'dropbox',
      dropboxAppKey: appKey,
      lastSyncStatus: 'syncing',
      lastSyncMessage: 'Dropbox authorization started. Your saved workspace will load after sign-in…',
    })

    setSyncSettings(setupSettings)
    writeSyncSettings(setupSettings)
    dropboxCallbackHandledRef.current = false
    await startDropboxOAuth(appKey, false)
  }

  const triggerSync = useCallback(async (isManual = false) => {
    const currentSync = syncSettingsRef.current
    if (!currentSync.enabled || currentSync.provider === 'none') {
      if (isManual) {
        showToast('Enable cloud sync in Settings to sync your vault.')
      }
      return
    }

    setSyncBusy(true)
    setSyncSettings((prev) => ({ ...prev, lastSyncStatus: 'syncing' }))

    try {
      const localPreferences = buildWorkspacePreferences(
        aiSettingsRef.current,
        themeRef.current,
        sidebarCollapsedRef.current,
        notificationSettingsRef.current,
        workspacePreferencesUpdatedAtRef.current,
      )
      const result = await executeWorkspaceSync(stateRef.current, profileRef.current, currentSync, localPreferences)
      if (result.success && result.mergedState) {
        setState(result.mergedState)
        if (result.mergedProfile && result.mergedProfile.name.trim()) {
          setProfile(result.mergedProfile)
        }
        if (result.mergedPreferences) {
          applyWorkspacePreferences(result.mergedPreferences)
        }
        setSyncSettings((prev) => ({
          ...prev,
          ...result.updatedSyncSettings,
          lastSyncedAt: result.timestamp,
          lastSyncStatus: 'success',
          lastSyncMessage: result.message,
        }))
        showToast(result.message)
      } else {
        setSyncSettings((prev) => ({
          ...prev,
          lastSyncStatus: 'error',
          lastSyncMessage: result.message,
        }))
        if (isManual) {
          showToast(`Sync failed: ${result.message}`)
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sync failed.'
      setSyncSettings((prev) => ({
        ...prev,
        lastSyncStatus: 'error',
        lastSyncMessage: msg,
      }))
      if (isManual) {
        showToast(`Sync error: ${msg}`)
      }
    } finally {
      setSyncBusy(false)
    }
  }, [])

  // Auto-sync on startup
  useEffect(() => {
    if (profile.name.trim() && syncSettings.enabled && syncSettings.autoSyncOnStartup && syncSettings.provider !== 'none') {
      const timer = setTimeout(() => {
        void triggerSync(false)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [profile.name, syncSettings.enabled, syncSettings.autoSyncOnStartup, syncSettings.provider, triggerSync])

  // Periodic background auto-sync
  useEffect(() => {
    if (
      !syncSettings.enabled ||
      syncSettings.provider === 'none' ||
      !syncSettings.autoSyncIntervalMinutes ||
      syncSettings.autoSyncIntervalMinutes <= 0
    ) {
      return
    }

    const intervalMs = syncSettings.autoSyncIntervalMinutes * 60 * 1000
    const interval = setInterval(() => {
      void triggerSync(false)
    }, intervalMs)

    return () => clearInterval(interval)
  }, [syncSettings.enabled, syncSettings.provider, syncSettings.autoSyncIntervalMinutes, triggerSync])

  useEffect(() => {
    checkAppUpdate().then((info) => {
      if (info.isAvailable) {
        setUpdateInfo(info)
      }
    })
  }, [])

  // Finish the browser PKCE flow after Dropbox returns to /dropbox/callback.
  // Tokens stay in this device's local storage; no Anchor server sees them.
  useEffect(() => {
    const cleanDropboxCallbackUrl = () => {
      if (
        window.history.replaceState &&
        window.location.pathname.replace(/\/$/, '') === '/dropbox/callback'
      ) {
        window.history.replaceState(null, document.title, '/')
      }
    }

    const applyDropboxToken = async (
      token: string,
      tokenDetails: { refreshToken?: string; expiresAt?: number; accountId?: string } = {},
    ) => {
      const vaultName = syncSettingsRef.current.vaultName || DEFAULT_VAULT_NAME
      const authorizedSettings = normalizeSyncSettings({
        ...syncSettingsRef.current,
        enabled: false,
        provider: 'dropbox',
        dropboxAppKey: syncSettingsRef.current.dropboxAppKey || DEFAULT_DROPBOX_APP_KEY,
        dropboxAccessToken: token,
        dropboxRefreshToken: tokenDetails.refreshToken || syncSettingsRef.current.dropboxRefreshToken,
        dropboxTokenExpiresAt: tokenDetails.expiresAt,
        dropboxAccountId: tokenDetails.accountId || syncSettingsRef.current.dropboxAccountId,
        lastSyncStatus: 'syncing',
        lastSyncMessage: 'Dropbox authorization received. Setting up your Anchor vault…',
      })

      // Persist the authorization before folder setup so a missing Dropbox
      // permission cannot strand the user without a revoke control.
      setSyncSettings(authorizedSettings)
      writeSyncSettings(authorizedSettings)
      const restoringBeforeSetup = !profileRef.current.name.trim()
      if (!restoringBeforeSetup) {
        setActiveView('settings')
        setActiveProjectId(undefined)
        setListFilter('all')
        setQuery('')
        setSearchPaletteOpen(false)
        setNotificationsOpen(false)
        setMobileMenuOpen(false)
      }

      try {
        const connectionMessage = await testDropboxConnection(token, vaultName)
        const connectedSettings = normalizeSyncSettings({
          ...authorizedSettings,
          enabled: true,
          lastSyncStatus: 'syncing',
          lastSyncMessage: `${connectionMessage} Loading your saved Anchor workspace…`,
        })
        const restoreState = restoringBeforeSetup
          ? { anchors: [], projects: [], decisions: [], notes: [] }
          : stateRef.current
        const result = await executeWorkspaceSync(
          restoreState,
          profileRef.current,
          connectedSettings,
          buildWorkspacePreferences(
            aiSettingsRef.current,
            themeRef.current,
            sidebarCollapsedRef.current,
            notificationSettingsRef.current,
            workspacePreferencesUpdatedAtRef.current,
          ),
        )

        if (!result.success || !result.mergedState) {
          throw new Error(result.message)
        }

        setState(result.mergedState)
        if (result.mergedProfile && result.mergedProfile.name.trim()) {
          setProfile(result.mergedProfile)
        }
        if (result.mergedPreferences) {
          applyWorkspacePreferences(result.mergedPreferences)
        }
        setSyncSettings((previous) => ({
          ...previous,
          ...result.updatedSyncSettings,
          enabled: true,
          lastSyncedAt: result.timestamp,
          lastSyncStatus: 'success',
          lastSyncMessage: result.message,
        }))
        if (restoringBeforeSetup && result.mergedProfile?.name.trim()) {
          setActiveView('home')
        }
        showToast(result.message)
      } catch (setupError) {
        const setupMessage = setupError instanceof Error ? setupError.message : 'Dropbox vault setup failed.'
        const connectionMessage = `Dropbox authorized, but vault setup is incomplete: ${setupMessage}`
        setSyncSettings(normalizeSyncSettings({
          ...authorizedSettings,
          enabled: false,
          lastSyncStatus: 'error',
          lastSyncMessage: connectionMessage,
        }))
        showToast(connectionMessage)
      }

      if (window.opener) {
        try {
          window.opener.postMessage({
            type: 'ANCHOR_DROPBOX_AUTH',
            token,
            refreshToken: tokenDetails.refreshToken,
            expiresAt: tokenDetails.expiresAt,
            accountId: tokenDetails.accountId,
          }, window.location.origin)
        } catch {
          // ignore cross-window notification failures
        }
      }
      cleanDropboxCallbackUrl()
    }

    const handleDropboxCallbackUrl = (callbackUrl?: string) => {
      if (dropboxCallbackHandledRef.current) return
      dropboxCallbackHandledRef.current = true
      void completeDropboxOAuth(callbackUrl)
        .then((result) => {
          if (!result) return
          return applyDropboxToken(result.accessToken, result)
        })
        .catch((err) => {
          const message = err instanceof Error ? err.message : 'authorization failed.'
          dropboxCallbackHandledRef.current = false
          setSyncSettings((previous) => ({
            ...previous,
            lastSyncStatus: 'error',
            lastSyncMessage: `Dropbox authorization failed: ${message}`,
          }))
          showToast(`Dropbox connection error: ${message}`)
        })
        .finally(cleanDropboxCallbackUrl)
    }

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      if (event.data?.type !== 'ANCHOR_DROPBOX_AUTH' || typeof event.data.token !== 'string') return
      void applyDropboxToken(event.data.token, {
        refreshToken: typeof event.data.refreshToken === 'string' ? event.data.refreshToken : undefined,
        expiresAt: typeof event.data.expiresAt === 'number' ? event.data.expiresAt : undefined,
        accountId: typeof event.data.accountId === 'string' ? event.data.accountId : undefined,
      }).catch((err) => showToast(`Dropbox connection error: ${err instanceof Error ? err.message : 'authorization failed.'}`))
    }

    window.addEventListener('message', handleMessage)

    let deepLinkUnlisten: (() => void) | undefined
    let deepLinkSetupCancelled = false
    const setupDropboxDeepLink = async () => {
      if (!isNativeApp()) return

      try {
        const { getCurrent, onOpenUrl } = await import('@tauri-apps/plugin-deep-link')
        const handleUrls = (urls: string[]) => {
          const callbackUrl = urls.find((url) => isDropboxNativeCallbackUrl(url))
          if (callbackUrl) handleDropboxCallbackUrl(callbackUrl)
        }

        deepLinkUnlisten = await onOpenUrl(handleUrls)
        if (deepLinkSetupCancelled) {
          deepLinkUnlisten()
          return
        }

        const currentUrls = await getCurrent()
        handleUrls(currentUrls ?? [])
      } catch {
        // Deep-link support is only needed by native OAuth. Web OAuth and the
        // normal callback URL continue to work if the optional bridge is absent.
      }
    }
    void setupDropboxDeepLink()

    const callbackPath = window.location.pathname.replace(/\/$/, '')
    const callbackState = new URLSearchParams(window.location.search).get('state')
    if (callbackPath === '/dropbox/callback' && isNativeDropboxOAuthState(callbackState)) {
      // The HTTPS callback is registered with Dropbox. Bounce native sessions
      // back to the installed app so its local PKCE verifier remains private.
      window.location.replace(getDropboxNativeCallbackUrl(window.location.href))
    } else if (callbackPath === '/dropbox/callback') {
      handleDropboxCallbackUrl()
    } else {
      // Accept a legacy implicit-flow token during the transition to PKCE.
      const token = extractDropboxOAuthToken()
      if (token && !dropboxCallbackHandledRef.current) {
        dropboxCallbackHandledRef.current = true
        void applyDropboxToken(token)
          .catch((err) => showToast(`Dropbox connection error: ${err instanceof Error ? err.message : 'authorization failed.'}`))
          .finally(cleanDropboxCallbackUrl)
      }
    }

    return () => {
      deepLinkSetupCancelled = true
      deepLinkUnlisten?.()
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  const anchorPhilosophyThought = (thought: PhilosophyThought) => {
    const timestamp = new Date().toISOString()
    const newAnchor: Anchor = {
      id: createId('anchor'),
      serialNumber: nextSerialNumber(state.anchors),
      title: `${thought.author}: ${thought.quote.slice(0, 55)}${thought.quote.length > 55 ? '…' : ''}`,
      body: `"${thought.quote}"\n\nTakeaway: ${thought.takeaway || thought.school}`,
      scope: 'global',
      tag: thought.school.replace(/[^a-zA-Z0-9]/g, ''),
      color: 'plum',
      pinned: true,
      createdAt: timestamp,
      updatedAt: timestamp,
      evidence: thought.source
        ? { label: thought.source, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(thought.author)}` }
        : undefined,
    }

    setState((currentState) => ({
      ...currentState,
      anchors: [newAnchor, ...currentState.anchors],
    }))
    showToast(`Anchored "${thought.author}" to your workspace.`)
  }

  const manualCheckUpdate = async () => {
    setIsCheckingUpdate(true)
    try {
      const info = await checkAppUpdate()
      setUpdateInfo(info)
      if (info.isAvailable) {
        setIsUpdateModalOpen(true)
      } else {
        showToast('You are using the latest version of Anchor.')
      }
    } finally {
      setIsCheckingUpdate(false)
    }
  }

  useEffect(() => {
    writeAnchorState(state)
  }, [state])

  useEffect(() => {
    writeUserProfile(profile)
  }, [profile])

  useEffect(() => {
    writeSecuritySettings(security)
  }, [security])

  useEffect(() => {
    writeAISettings(aiSettings)
  }, [aiSettings])

  useEffect(() => {
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(sidebarCollapsed))
    } catch {
      // Persistence is optional when storage is unavailable.
    }
  }, [sidebarCollapsed])

  useEffect(() => {
    try {
      window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(readNotificationIds))
    } catch {
      // Persistence is optional when storage is unavailable.
    }
  }, [readNotificationIds])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.style.colorScheme = theme
    document.body.dataset.theme = theme
    const themeColor = theme === 'dark' ? '#080e1e' : '#f6f7fb'
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', themeColor)

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme)
    } catch {
      // Persistence is optional when storage is unavailable.
    }
  }, [theme])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeout = window.setTimeout(() => setToast(undefined), 3200)

    return () => window.clearTimeout(timeout)
  }, [toast])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setActiveView('all')
        setActiveAnchorId(undefined)
        setActiveProjectId(undefined)
        setListFilter('all')
        setNotificationsOpen(false)
        setSearchPaletteOpen(true)
        window.requestAnimationFrame(() => topSearchRef.current?.focus())
      }

      if (event.key === 'Escape') {
        setSearchPaletteOpen(false)
        setNotificationsOpen(false)
        setMobileMenuOpen(false)
        setActiveAnchorId(undefined)
        setIsComposerOpen(false)
        setIsProjectComposerOpen(false)
        setEditingAnchor(undefined)
        setEditingProject(undefined)
        setIsUpdateModalOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  useEffect(() => {
    if (!searchPaletteOpen && !notificationsOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node

      if (searchPaletteOpen && !searchWrapRef.current?.contains(target)) {
        setSearchPaletteOpen(false)
      }

      if (notificationsOpen && !notificationWrapRef.current?.contains(target)) {
        setNotificationsOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)

    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [notificationsOpen, searchPaletteOpen])

  const pinnedAnchors = useMemo(
    () => state.anchors.filter((anchor) => anchor.pinned),
    [state.anchors],
  )
  const spotlight = pinnedAnchors.find((anchor) => anchor.id === spotlightAnchorId) ?? pinnedAnchors[0]
  const spotlightPosition = Math.max(pinnedAnchors.findIndex((anchor) => anchor.id === spotlight?.id), 0)
  const activeProject = getProject(state.projects, activeProjectId)
  const activeAnchor = state.anchors.find((anchor) => anchor.id === activeAnchorId)
  const notifications = useMemo(
    () => buildNotifications(state.anchors, state.projects, readNotificationIds),
    [readNotificationIds, state.anchors, state.projects],
  )
  const unreadNotifications = notifications.filter((notification) => !notification.isRead)

  useEffect(() => {
    const content = buildReminderNotificationContent(state.anchors, notificationSettings)
    const isAndroidNative = isNativeApp() && getAppPlatform() === 'android'

    if (isAndroidNative) {
      void scheduleNativeReminderNotifications(notificationSettings, content)
      return undefined
    }

    if (!content || !notificationsHaveReminder(notificationSettings)) {
      return undefined
    }

    let cancelled = false
    let timer: number | undefined
    const scheduleNextReminder = () => {
      if (cancelled) return

      const nextReminder = getNextReminderDate(notificationSettings)
      if (!nextReminder) return

      const delay = Math.max(nextReminder.getTime() - Date.now(), 1_000)
      timer = window.setTimeout(async () => {
        if (cancelled) return
        await sendAppNotification(content)
        scheduleNextReminder()
      }, delay)
    }

    scheduleNextReminder()
    return () => {
      cancelled = true
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [notificationSettings, state.anchors])

  useEffect(() => {
    if (pinnedAnchors.length < 2) {
      return
    }

    const rotationTimer = window.setInterval(() => {
      setSpotlightAnchorId((currentId) => {
        const nextAnchorId = pickRandomAnchorId(pinnedAnchors, currentId)

        if (nextAnchorId) {
          writeSpotlightId(nextAnchorId)
        }

        return nextAnchorId
      })
    }, 90_000)

    return () => window.clearInterval(rotationTimer)
  }, [pinnedAnchors])

  const navigate = (view: View, projectId?: string) => {
    setActiveAnchorId(undefined)
    setActiveView(view)
    setActiveProjectId(projectId)
    setListFilter(view === 'global' ? 'global' : 'all')
    setQuery('')
    setSearchPaletteOpen(false)
    setNotificationsOpen(false)
    setMobileMenuOpen(false)
  }

  const changeListFilter = (filter: AnchorFilter) => {
    setActiveAnchorId(undefined)
    setListFilter(filter)
    setActiveView(filter === 'global' ? 'global' : 'all')
    setActiveProjectId(undefined)
    setQuery('')
    setSearchPaletteOpen(false)
  }

  const openAnchorComposer = (projectId?: string) => {
    setActiveAnchorId(undefined)
    setActiveProjectId(projectId)
    setIsComposerOpen(true)
    setSearchPaletteOpen(false)
    setNotificationsOpen(false)
    setMobileMenuOpen(false)
  }

  const refreshModels = async (settingsToLoad: AISettings = aiSettings) => {
    setModelsLoading(true)
    setModelsError(undefined)

    try {
      const models = await discoverModels(settingsToLoad)
      setAvailableModels(models)

      if (models.length > 0 && !settingsToLoad.model) {
        touchWorkspacePreferences()
        setAISettings((currentSettings) =>
          currentSettings.providerId === settingsToLoad.providerId
            ? { ...currentSettings, model: models[0].id }
            : currentSettings,
        )
      }

      showToast(`${models.length} live model${models.length === 1 ? '' : 's'} found.`)
    } catch (error) {
      setAvailableModels([])
      setModelsError(error instanceof Error ? error.message : 'The provider could not be reached.')
    } finally {
      setModelsLoading(false)
    }
  }

  const updateAISettings = (changes: Partial<AISettings>) => {
    if (changes.providerId && changes.providerId !== aiSettings.providerId) {
      setAvailableModels([])
      setModelsError(undefined)
    }

    touchWorkspacePreferences()
    setAISettings((currentSettings) => ({ ...currentSettings, ...changes }))
  }

  const updateNotificationSettings = (changes: Partial<NotificationSettings>) => {
    touchWorkspacePreferences()
    setNotificationSettings((currentSettings) => normalizeNotificationSettings({ ...currentSettings, ...changes }))
  }

  const enableNotifications = async () => {
    const granted = await requestNotificationPermission()
    if (!granted) {
      showToast('Notifications are unavailable or blocked in this browser or device settings.')
      return
    }

    touchWorkspacePreferences()
    setNotificationSettings((currentSettings) => ({ ...currentSettings, enabled: true }))
    await sendAppNotification({
      title: 'Anchor notifications are on',
      body: 'You will hear from Anchor according to the choices you made in Settings.',
    })
    showToast('Anchor notifications are enabled.')
  }

  const saveAISettings = () => {
    writeAISettings(aiSettings)
    showToast('Your AI connection is saved. Provider settings sync when cloud sync is enabled; the key stays on this device.')
    void refreshModels(aiSettings)
  }

  const saveDecision = (decision: Decision) => {
    setState((currentState) => {
      const existingDecision = currentState.decisions.find((savedDecision) => savedDecision.id === decision.id)
      const savedDecision: Decision = {
        ...decision,
        serialNumber: decision.serialNumber ?? existingDecision?.serialNumber ?? nextSerialNumber(currentState.decisions),
      }

      return {
        ...currentState,
        decisions: [
          savedDecision,
          ...currentState.decisions.filter((item) => item.id !== decision.id),
        ],
      }
    })
  }

  const saveNote = (note: Note) => {
    setState((currentState) => {
      const existingNote = currentState.notes.find((savedNote) => savedNote.id === note.id)
      const savedNote: Note = {
        ...note,
        serialNumber: note.serialNumber ?? existingNote?.serialNumber ?? nextSerialNumber(currentState.notes),
      }

      return {
        ...currentState,
        notes: [savedNote, ...currentState.notes.filter((item) => item.id !== note.id)],
      }
    })
    showToast('Note saved.')
  }

  const deleteNote = (noteId: string) => {
    setState((currentState) => ({
      ...currentState,
      notes: currentState.notes.filter((note) => note.id !== noteId),
    }))
    showToast('Note removed.')
  }

  const togglePinned = (anchorId: string) => {
    const timestamp = new Date().toISOString()
    setState((currentState) => ({
      ...currentState,
      anchors: currentState.anchors.map((anchor) =>
        anchor.id === anchorId ? { ...anchor, pinned: !anchor.pinned, updatedAt: timestamp } : anchor,
      ),
    }))
  }

  const markAsRemembered = (anchorId: string) => {
    setState((currentState) => ({
      ...currentState,
      anchors: currentState.anchors.map((anchor) =>
        anchor.id === anchorId ? { ...anchor, lastSeenAt: new Date().toISOString() } : anchor,
      ),
    }))
    setReadNotificationIds((currentIds) => {
      const notificationId = `anchor-reminder:${anchorId}`

      return currentIds.includes(notificationId) ? currentIds : [...currentIds, notificationId]
    })
    showToast('Saved as remembered for today.')
  }

  const addAnchor = (formData: AnchorFormData) => {
    const timestamp = new Date().toISOString()
    const newAnchor: Anchor = {
      ...formData,
      id: createId('anchor'),
      serialNumber: nextSerialNumber(state.anchors),
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    setState((currentState) => ({
      ...currentState,
      anchors: [newAnchor, ...currentState.anchors],
    }))
    setIsComposerOpen(false)
    setActiveView(formData.scope === 'global' ? 'global' : 'projects')
    setActiveProjectId(formData.projectId)
    showToast('Your new anchor is close now.')
  }

  const updateAnchor = (updated: Anchor) => {
    setState((currentState) => ({
      ...currentState,
      anchors: currentState.anchors.map((anchor) =>
        anchor.id === updated.id ? { ...updated, updatedAt: new Date().toISOString() } : anchor,
      ),
    }))
    setEditingAnchor(undefined)
    showToast('Anchor updated.')
  }

  const deleteAnchor = (anchorId: string) => {
    setState((currentState) => ({
      ...currentState,
      anchors: currentState.anchors.filter((anchor) => anchor.id !== anchorId),
    }))
    setEditingAnchor(undefined)
    setActiveAnchorId(undefined)
    setSpotlightAnchorId((currentId) =>
      currentId === anchorId
        ? pickRandomAnchorId(state.anchors.filter((a) => a.id !== anchorId && a.pinned))
        : currentId,
    )
    showToast('Anchor removed.')
  }

  const addProject = (formData: ProjectFormData) => {
    const timestamp = new Date().toISOString()
    const newProject: Project = {
      ...formData,
      id: createId('project'),
      serialNumber: nextSerialNumber(state.projects),
      icon: 'spark',
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    setState((currentState) => ({
      ...currentState,
      projects: [...currentState.projects, newProject],
    }))
    setIsProjectComposerOpen(false)
    navigate('projects', newProject.id)
    showToast('Project created. Give it the context it needs.')
  }

  const updateProject = (updated: Project) => {
    const timestamp = new Date().toISOString()
    setState((currentState) => ({
      ...currentState,
      projects: currentState.projects.map((project) =>
        project.id === updated.id
          ? { ...updated, serialNumber: updated.serialNumber ?? project.serialNumber, updatedAt: timestamp }
          : project,
      ),
    }))
    setEditingProject(undefined)
    showToast('Project updated.')
  }

  const deleteProject = (projectId: string) => {
    setState((currentState) => ({
      ...currentState,
      projects: currentState.projects.filter((project) => project.id !== projectId),
      anchors: currentState.anchors.map((anchor) =>
        anchor.projectId === projectId
          ? { ...anchor, scope: 'global', projectId: undefined, updatedAt: new Date().toISOString() }
          : anchor,
      ),
    }))
    setEditingProject(undefined)
    if (activeProjectId === projectId) {
      setActiveProjectId(undefined)
      setActiveView('projects')
    }
    showToast('Project removed. Its anchors are now in Global context.')
  }

  const deleteDecision = (decisionId: string) => {
    setState((currentState) => ({
      ...currentState,
      decisions: currentState.decisions.filter((decision) => decision.id !== decisionId),
    }))
    showToast('Decision room removed.')
  }

  const markNotificationRead = (notificationId: string) => {
    setReadNotificationIds((currentIds) =>
      currentIds.includes(notificationId) ? currentIds : [...currentIds, notificationId],
    )
  }

  const markAllNotificationsRead = () => {
    setReadNotificationIds(notifications.map((notification) => notification.id))
    setNotificationsOpen(false)
    showToast('Your reminders are clear for now.')
  }

  const openAnchorDetail = (anchor: Anchor) => {
    setActiveAnchorId(anchor.id)
    setIsComposerOpen(false)
    setEditingAnchor(undefined)
    setSearchPaletteOpen(false)
    setNotificationsOpen(false)
    setMobileMenuOpen(false)
  }

  const openNotification = (notification: AppNotification) => {
    markNotificationRead(notification.id)
    setNotificationsOpen(false)
    const anchor = state.anchors.find((item) => item.id === notification.anchorId)

    if (!anchor) {
      return
    }

    if (anchor.scope === 'project' && anchor.projectId) {
      navigate('projects', anchor.projectId)
    } else {
      navigate('global')
    }

    openAnchorDetail(anchor)
  }

  const openSearchResult = (anchor: Anchor) => {
    setQuery('')
    setSearchPaletteOpen(false)

    if (anchor.scope === 'project' && anchor.projectId) {
      navigate('projects', anchor.projectId)
    } else {
      navigate('global')
    }

    openAnchorDetail(anchor)
  }

  const openSettings = () => {
    navigate('settings')
  }

  const openAISettings = () => {
    setIsComposerOpen(false)
    setEditingAnchor(undefined)
    setIsProjectComposerOpen(false)
    setEditingProject(undefined)
    setAIReflectionAnchor(undefined)
    navigate('settings')
  }

  const saveProfile = (nextProfile: UserProfile) => {
    const name = nextProfile.name.trim()

    if (!name) {
      return
    }

    setProfile({ name, updatedAt: new Date().toISOString() })
    showToast(`I’ll call you ${name} from here on.`)
  }

  const savePin = async (pin: string): Promise<void> => {
    const pinHash = await hashPin(pin)

    setSecurity({ pinHash })
    setIsLocked(false)
    showToast('Your device PIN is on. Anchor will ask for it next time.')
  }

  const removePin = () => {
    setSecurity({})
    setIsLocked(false)
    showToast('Your device PIN is off.')
  }

  const unlockWithPin = async (pin: string): Promise<boolean> => {
    if (!security.pinHash) {
      setIsLocked(false)
      return true
    }

    const matches = await verifyPin(pin, security.pinHash)

    if (matches) {
      setIsLocked(false)
    }

    return matches
  }

  const resetDevice = () => {
    if (!window.confirm('Reset Anchor on this device? This removes your workspace, profile, AI settings, and PIN.')) {
      return
    }

    Object.keys(window.localStorage)
      .filter((key) => key.startsWith('anchor-'))
      .forEach((key) => window.localStorage.removeItem(key))
    window.location.reload()
  }

  const exportWorkspace = () => {
    const file = new Blob([
      serializeWorkspaceExport(
        state,
        profile,
        buildWorkspacePreferences(
          aiSettingsRef.current,
          themeRef.current,
          sidebarCollapsedRef.current,
          notificationSettingsRef.current,
          workspacePreferencesUpdatedAtRef.current,
        ),
      ),
    ], { type: 'application/json' })
    const url = URL.createObjectURL(file)
    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)

    link.href = url
    link.download = `anchor-workspace-${date}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    showToast('Your Anchor workspace is ready to keep safe.')
  }

  const importWorkspace = async (file: File, mode: 'replace' | 'merge'): Promise<string> => {
    const imported = parseWorkspaceExport(await file.text())
    const nextState = mode === 'merge' ? mergeWorkspaceState(state, imported.state) : imported.state
    const importedPreferences = mode === 'merge'
      ? mergeWorkspacePreferences(
        buildWorkspacePreferences(
          aiSettingsRef.current,
          themeRef.current,
          sidebarCollapsedRef.current,
          notificationSettingsRef.current,
          workspacePreferencesUpdatedAtRef.current,
        ),
        imported.preferences,
      )
      : imported.preferences

    const importedProfile = mode === 'merge'
      ? mergeWorkspaceProfile(profile, imported.profile)
      : imported.profile

    setState(nextState)
    applyWorkspacePreferences(importedPreferences)

    if (importedProfile.name) {
      setProfile(importedProfile)
    }

    const summary = `${nextState.anchors.length} anchors, ${nextState.projects.length} projects, ${nextState.decisions.length} decisions, and ${nextState.notes.length} notes`
    const message = mode === 'merge' ? `Merged ${summary} into this workspace.` : `Restored ${summary}.`

    showToast(message)
    return message
  }

  if (isLocked && security.pinHash) {
    return <PinLockView theme={theme} name={profile.name} onUnlock={unlockWithPin} onReset={resetDevice} />
  }

  if (!profile.name.trim()) {
    return (
      <OnboardingView
        theme={theme}
        onRestoreFromDropbox={restoreFromDropbox}
        restoreStatus={syncSettings.lastSyncStatus}
        restoreMessage={syncSettings.lastSyncMessage}
        onComplete={async (name, keepExamples, pin) => {
          if (pin) {
            await savePin(pin)
          } else {
            setSecurity({})
            setIsLocked(false)
          }

          setProfile({ name, updatedAt: new Date().toISOString() })
          if (!keepExamples) {
            setState({ anchors: [], projects: [], decisions: [], notes: [] })
            setSpotlightAnchorId(undefined)
          }
        }}
      />
    )
  }

  let pageContent: React.ReactNode

  if (activeAnchorId && activeAnchor) {
    const anchorBackLabel = activeProject ? `Back to ${activeProject.name}` : activeView === 'home' ? 'Back to Today' : 'Back to anchors'

    pageContent = (
      <AnchorDetailView
        anchor={activeAnchor}
        projects={state.projects}
        backLabel={anchorBackLabel}
        onBack={() => setActiveAnchorId(undefined)}
        onEdit={() => setEditingAnchor(activeAnchor)}
        onTogglePinned={togglePinned}
        onAskAI={setAIReflectionAnchor}
      />
    )
  } else if (activeProjectId && activeProject) {
    pageContent = (
      <ProjectView
        project={activeProject}
        anchors={state.anchors}
        decisions={state.decisions}
        notes={state.notes}
        settings={aiSettings}
        onOpenSettings={openAISettings}
        onBack={() => navigate('projects')}
        onAddAnchor={() => openAnchorComposer(activeProject.id)}
        onEditAnchor={setEditingAnchor}
        onOpenAnchor={openAnchorDetail}
        onEditProject={() => setEditingProject(activeProject)}
        onTogglePinned={togglePinned}
        onAskAnchor={setAIReflectionAnchor}
      />
    )
  } else if (activeView === 'home') {
    pageContent = (
      <HomeView
        name={profile.name}
        anchors={state.anchors}
        projects={state.projects}
        spotlight={spotlight}
        pinnedCount={pinnedAnchors.length}
        spotlightIndex={spotlightPosition}
        onNextSpotlight={() => {
          setSpotlightAnchorId((currentId) => {
            const nextAnchorId = pickRandomAnchorId(pinnedAnchors, currentId)

            if (nextAnchorId) {
              writeSpotlightId(nextAnchorId)
            }

            return nextAnchorId
          })
        }}
        onRemember={markAsRemembered}
        onTogglePinned={togglePinned}
        onEditAnchor={setEditingAnchor}
        onOpenAnchor={openAnchorDetail}
        onAddAnchor={() => openAnchorComposer()}
        onOpenAll={() => navigate('all')}
        onOpenProject={(projectId) => navigate('projects', projectId)}
        onOpenProjects={() => navigate('projects')}
        onOpenDecision={() => navigate('decide')}
        onAskAnchor={setAIReflectionAnchor}
      />
    )
  } else if (activeView === 'dashboard') {
    pageContent = (
      <DashboardView
        anchorsCount={state.anchors.length}
        projectsCount={state.projects.length}
        anchors={state.anchors}
        projects={state.projects}
        decisions={state.decisions}
        notes={state.notes}
        settings={aiSettings}
        onOpenSettings={openAISettings}
        onAnchorThought={anchorPhilosophyThought}
        onOpenDecision={() => navigate('decide')}
        onAddAnchor={() => openAnchorComposer()}
      />
    )
  } else if (activeView === 'notes') {
    pageContent = (
      <NotesView
        notes={state.notes}
        onSaveNote={saveNote}
        onDeleteNote={deleteNote}
      />
    )
  } else if (activeView === 'decide') {
    pageContent = (
      <DecisionView
        name={profile.name}
        projects={state.projects}
        anchors={state.anchors}
        notes={state.notes}
        settings={aiSettings}
        decisions={state.decisions}
        onOpenSettings={() => navigate('settings')}
        onSaveDecision={saveDecision}
        onDeleteDecision={deleteDecision}
      />
    )
  } else if (activeView === 'settings') {
    pageContent = (
      <SettingsView
        key={`${profile.name}-${syncSettings.dropboxAccessToken ? 'dropbox-connected' : 'dropbox-disconnected'}`}
        profile={profile}
        security={security}
        settings={aiSettings}
        notificationSettings={notificationSettings}
        availableModels={availableModels}
        modelsLoading={modelsLoading}
        modelsError={modelsError}
        theme={theme}
        onThemeChange={changeTheme}
        onSettingsChange={updateAISettings}
        onNotificationsChange={updateNotificationSettings}
        onEnableNotifications={enableNotifications}
        onSave={saveAISettings}
        onRefreshModels={() => void refreshModels(aiSettings)}
        onReset={() => {
          touchWorkspacePreferences()
          setAISettings({ ...DEFAULT_AI_SETTINGS })
          setAvailableModels([])
          setModelsError(undefined)
          showToast('AI connection settings reset.')
        }}
        onSaveProfile={saveProfile}
        onSavePin={savePin}
        onRemovePin={removePin}
        onLockNow={() => setIsLocked(true)}
        onExportWorkspace={exportWorkspace}
        onImportWorkspace={importWorkspace}
        updateInfo={updateInfo}
        checkingUpdates={isCheckingUpdate}
        onCheckUpdates={manualCheckUpdate}
        onOpenUpdateModal={() => setIsUpdateModalOpen(true)}
        syncSettings={syncSettings}
        syncBusy={syncBusy}
        onSaveSyncSettings={(newSettings) => {
          const normalizedSettings = normalizeSyncSettings(newSettings)
          setSyncSettings(normalizedSettings)
          showToast('Sync settings saved.')
        }}
        onTriggerSync={() => triggerSync(true)}
        onTestDropbox={testDropboxConnection}
        relativeTimeNow={relativeTimeNow}
      />
    )
  } else if (activeView === 'projects') {
    pageContent = (
      <ProjectsView
        projects={state.projects}
        anchors={state.anchors}
        decisions={state.decisions}
        notes={state.notes}
        settings={aiSettings}
        onOpenSettings={openAISettings}
        onOpenProject={(projectId) => navigate('projects', projectId)}
        onAddProject={() => setIsProjectComposerOpen(true)}
        onEditProject={setEditingProject}
      />
    )
  } else {
    pageContent = (
      <AnchorsView
        anchors={state.anchors}
        projects={state.projects}
        settings={aiSettings}
        onOpenSettings={openAISettings}
        filter={activeView === 'global' ? 'global' : listFilter}
        query={query}
        onQueryChange={setQuery}
        onFilterChange={changeListFilter}
        onAddAnchor={() => openAnchorComposer()}
        onEditAnchor={setEditingAnchor}
        onOpenAnchor={openAnchorDetail}
        onTogglePinned={togglePinned}
        onAskAnchor={setAIReflectionAnchor}
      />
    )
  }

  const isDecisionRoute = activeView === 'decide' && !activeProjectId

  const isAndroidNative = isNativeApp() && getAppPlatform() === 'android'

  return (
    <div className={`anchor-app ${theme === 'dark' ? 'theme-dark' : ''} ${isAndroidNative ? 'native-android' : ''}`}>
      <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <button
            className="brand-mark-btn"
            type="button"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Anchor home'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Anchor home'}
            onClick={() => {
              if (sidebarCollapsed) {
                changeSidebarCollapsed(false)
              } else {
                navigate('home')
              }
            }}
          >
            <div className="brand-mark" aria-hidden="true">
              <AnchorIcon size={18} strokeWidth={2.5} />
            </div>
          </button>
          <div className="brand-copy">
            <strong>anchor</strong>
            <span>your steady place</span>
          </div>
          <button
            className="sidebar-toggle"
            type="button"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-expanded={!sidebarCollapsed}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => changeSidebarCollapsed((collapsed) => !collapsed)}
          >
            {sidebarCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          <button
            className="icon-button sidebar-close"
            type="button"
            aria-label="Close menu"
            onClick={() => setMobileMenuOpen(false)}
          >
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-label">Your space</div>
        <nav className="primary-nav" aria-label="Primary navigation">
          <NavItem
            icon={Home}
            label="Today"
            active={activeView === 'home' && !activeProjectId}
            onClick={() => navigate('home')}
          />
          <NavItem
            icon={Compass}
            label="Wisdom & Thoughts"
            active={activeView === 'dashboard' && !activeProjectId}
            onClick={() => navigate('dashboard')}
          />
          <NavItem
            icon={Layers3}
            label="All anchors"
            active={activeView === 'all' && !activeProjectId}
            onClick={() => navigate('all')}
            count={state.anchors.length}
          />
          <NavItem
            icon={Pin}
            label="Global context"
            active={activeView === 'global' && !activeProjectId}
            onClick={() => navigate('global')}
            count={state.anchors.filter((anchor) => anchor.scope === 'global').length}
          />
          <NavItem
            icon={WandSparkles}
            label="Decision space"
            active={activeView === 'decide' && !activeProjectId}
            onClick={() => navigate('decide')}
          />
          <NavItem
            icon={NotebookPen}
            label="Notes"
            active={activeView === 'notes' && !activeProjectId}
            onClick={() => navigate('notes')}
            count={state.notes.length}
          />
          <NavItem
            icon={FolderOpen}
            label="Projects"
            active={activeView === 'projects' && !activeProjectId}
            onClick={() => navigate('projects')}
            count={state.projects.length}
          />
        </nav>

        <div className="sidebar-rule" />
        <div className="sidebar-project-heading">
          <span>Projects</span>
          <button
            className="sidebar-add"
            type="button"
            aria-label="Create project"
            title="Create project"
            onClick={() => setIsProjectComposerOpen(true)}
          >
            <Plus size={15} />
          </button>
        </div>
        <div className="sidebar-projects">
          {state.projects.slice(0, 4).map((project) => (
            <button
              className={`sidebar-project ${activeProjectId === project.id ? 'active' : ''}`}
              key={project.id}
              type="button"
              title={`${formatEntitySerial('P', project.serialNumber)} · ${project.name} · ID ${project.id}`}
              aria-label={`${formatEntitySerial('P', project.serialNumber)} ${project.name}`}
              onClick={() => navigate('projects', project.id)}
            >
              <span className={`project-dot ${project.color}`}>
                <ProjectIcon icon={project.icon} size={13} />
              </span>
              <span>{project.name}</span>
              <span className="sidebar-project-count">
                {getProjectAnchorCount(state.anchors, project.id)}
              </span>
            </button>
          ))}
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-prompt">
            <div className="prompt-icon">
              <Lightbulb size={15} />
            </div>
            <p>The point isn't to remember everything. Just what matters.</p>
          </div>
          <button
            className={`user-row ${activeView === 'settings' ? 'active' : ''}`}
            type="button"
            aria-label="Open account settings"
            onClick={openSettings}
          >
            <span className="avatar">{profileInitial(profile.name)}</span>
            <span className="user-copy">
              <strong>{profile.name}</strong>
              <span>Personal space</span>
            </span>
            <span className="user-more" aria-hidden="true">
              <MoreHorizontal size={17} />
            </span>
          </button>
        </div>
      </aside>

      <div className={`app-main ${isDecisionRoute ? 'decision-app-main' : ''}`}>
        <header className="topbar">
          <button
            className="icon-button mobile-menu-button"
            type="button"
            aria-label="Open menu"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={20} />
          </button>
          <button className="mobile-brand" type="button" onClick={() => navigate('home')}>
            <span className="brand-mark" aria-hidden="true">
              <AnchorIcon size={16} strokeWidth={2.5} />
            </span>
            <strong>anchor</strong>
          </button>
          <div className="breadcrumb" aria-label="Current location">
            <span>Workspace</span>
            <ChevronRight size={14} />
            <strong title={activeAnchor?.title}>
              {activeAnchor?.title ?? activeProject?.name ??
                (activeView === 'home'
                  ? 'Today'
                  : activeView === 'dashboard'
                    ? 'Wisdom & Philosophy'
                    : activeView === 'all'
                      ? 'All anchors'
                      : activeView === 'global'
                        ? 'Global context'
                        : activeView === 'decide'
                          ? 'Decision space'
                          : activeView === 'notes'
                            ? 'Notes'
                            : activeView === 'settings'
                              ? 'Settings'
                              : 'Projects')}
            </strong>
          </div>
          <div className="topbar-actions">
            <div className="top-search-wrap" ref={searchWrapRef}>
              <label
                className={`top-search ${searchPaletteOpen ? 'search-active' : ''}`}
                onClick={() => {
                  if (activeView === 'home') {
                    navigate('all')
                  }
                  setSearchPaletteOpen(true)
                  window.requestAnimationFrame(() => topSearchRef.current?.focus())
                }}
              >
                <Search size={16} />
                <input
                  ref={topSearchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onFocus={() => {
                    setSearchPaletteOpen(true)
                    if (activeView === 'home') {
                      navigate('all')
                      setSearchPaletteOpen(true)
                    }
                  }}
                  placeholder="Search your anchors"
                  aria-label="Search your anchors"
                />
                <kbd>
                  <Command size={11} /> K
                </kbd>
              </label>
              {searchPaletteOpen && (
                <SearchPalette
                  anchors={state.anchors}
                  projects={state.projects}
                  query={query}
                  onQueryChange={setQuery}
                  onSelect={openSearchResult}
                />
              )}
            </div>
            <div className="notification-wrap" ref={notificationWrapRef}>
              {updateInfo?.isAvailable && (
                <button
                  className="update-pill"
                  type="button"
                  onClick={() => setIsUpdateModalOpen(true)}
                  title={`Update to Anchor v${updateInfo.latestVersion}`}
                >
                  <Sparkles size={13} />
                  <span>v{updateInfo.latestVersion}</span>
                </button>
              )}
              <button
                className={`icon-button notification-button ${notificationsOpen ? 'active' : ''}`}
                type="button"
                aria-label={`Notifications${unreadNotifications.length > 0 ? `, ${unreadNotifications.length} unread` : ''}`}
                aria-expanded={notificationsOpen}
                onClick={() => {
                  setNotificationsOpen((open) => !open)
                  setSearchPaletteOpen(false)
                }}
              >
                <Bell size={18} />
                {unreadNotifications.length > 0 && (
                  <span className="notification-badge">
                    {unreadNotifications.length > 9 ? '9+' : unreadNotifications.length}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <NotificationPanel
                  notifications={notifications}
                  onSelect={openNotification}
                  onMarkAllRead={markAllNotificationsRead}
                />
              )}
            </div>
            {syncSettings.enabled && syncSettings.provider !== 'none' && (
              <button
                className={`icon-button sync-button ${syncSettings.lastSyncStatus || 'idle'} ${syncBusy ? 'syncing' : ''}`}
                type="button"
                onClick={() => void triggerSync(true)}
                disabled={syncBusy}
                title={
                  syncBusy
                    ? `Syncing with ${syncSettings.provider}…`
                    : syncSettings.lastSyncedAt
                      ? `Synced with ${syncSettings.provider} (${formatUpdatedAt(syncSettings.lastSyncedAt, relativeTimeNow)}). Click to sync now.`
                      : `Click to sync with ${syncSettings.provider}`
                }
                aria-label="Cloud sync"
              >
                {syncBusy ? <RefreshCw className="spin" size={17} /> : <Cloud size={17} />}
                {syncSettings.lastSyncStatus === 'success' && <span className="sync-status-dot success" />}
                {syncSettings.lastSyncStatus === 'error' && <span className="sync-status-dot error" />}
              </button>
            )}
            <button
              className="icon-button theme-toggle"
              type="button"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              onClick={() => changeTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <button className="top-avatar" type="button" aria-label="Open account settings" onClick={openSettings}>
              {profileInitial(profile.name)}
            </button>
          </div>
        </header>

        <main className={`page-content ${isDecisionRoute ? 'decision-page-content' : ''}`}>{pageContent}</main>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          <MobileNavItem icon={Home} label="Today" active={activeView === 'home' && !activeProjectId} onClick={() => navigate('home')} />
          <MobileNavItem icon={Compass} label="Wisdom" active={activeView === 'dashboard'} onClick={() => navigate('dashboard')} />
          <button className="mobile-add" type="button" aria-label="Add anchor" onClick={() => openAnchorComposer()}>
            <Plus size={21} />
          </button>
          <MobileNavItem icon={Layers3} label="Anchors" active={(activeView === 'all' || activeView === 'global') && !activeProjectId} onClick={() => navigate('all')} />
          <MobileNavItem icon={Settings2} label="More" active={activeView === 'settings'} onClick={openSettings} />
        </nav>
      </div>

      {isComposerOpen && (
        <AnchorComposer
          projects={state.projects}
          defaultProjectId={activeProjectId}
          settings={aiSettings}
          onOpenSettings={openAISettings}
          onClose={() => setIsComposerOpen(false)}
          onSubmit={addAnchor}
        />
      )}
      {editingAnchor && (
        <AnchorEditModal
          anchor={editingAnchor}
          projects={state.projects}
          settings={aiSettings}
          onOpenSettings={openAISettings}
          onClose={() => setEditingAnchor(undefined)}
          onSave={updateAnchor}
          onDelete={deleteAnchor}
        />
      )}
      {isProjectComposerOpen && (
        <ProjectComposer
          settings={aiSettings}
          onOpenSettings={openAISettings}
          onClose={() => setIsProjectComposerOpen(false)}
          onSubmit={addProject}
        />
      )}
      {editingProject && (
        <ProjectEditModal
          project={editingProject}
          settings={aiSettings}
          onOpenSettings={openAISettings}
          onClose={() => setEditingProject(undefined)}
          onSave={updateProject}
          onDelete={deleteProject}
        />
      )}
      {aiReflectionAnchor && (
        <AnchorReflectionModal
          anchor={aiReflectionAnchor}
          project={getProject(state.projects, aiReflectionAnchor.projectId)}
          relatedAnchors={state.anchors}
          settings={aiSettings}
          onOpenSettings={openAISettings}
          onClose={() => setAIReflectionAnchor(undefined)}
        />
      )}
      {isUpdateModalOpen && updateInfo && (
        <UpdateModal
          updateInfo={updateInfo}
          onClose={() => setIsUpdateModalOpen(false)}
        />
      )}
      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
      {toast && (
        <div className="toast" role="status">
          <span className="toast-check">
            <Check size={14} />
          </span>
          {toast}
        </div>
      )}
    </div>
  )
}

interface NavItemProps {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
  count?: number
}

function NavItem({ icon: Icon, label, active, onClick, count }: NavItemProps) {
  return (
    <button className={`nav-item ${active ? 'active' : ''}`} type="button" onClick={onClick} title={label} aria-label={label}>
      <Icon size={17} />
      <span>{label}</span>
      {count !== undefined && <small>{count}</small>}
    </button>
  )
}

interface MobileNavItemProps {
  icon: LucideIcon
  label: string
  active: boolean
  onClick: () => void
}

function MobileNavItem({ icon: Icon, label, active, onClick }: MobileNavItemProps) {
  return (
    <button className={`mobile-nav-item ${active ? 'active' : ''}`} type="button" onClick={onClick}>
      <Icon size={19} />
      <span>{label}</span>
    </button>
  )
}

interface ProjectIconProps {
  icon: Project['icon']
  size?: number
}

function ProjectIcon({ icon, size = 18 }: ProjectIconProps) {
  const Icon =
    icon === 'chart' ? TrendingUp : icon === 'pen' ? PenLine : icon === 'heart' ? Heart : Sparkles

  return <Icon size={size} />
}

interface EntityIdentityProps {
  prefix: EntitySerialPrefix
  serialNumber?: number
  id: string
  createdAt?: string
  updatedAt?: string
  compact?: boolean
  exact?: boolean
}

function EntityIdentity({ prefix, serialNumber, id, createdAt, updatedAt, compact = false, exact = false }: EntityIdentityProps) {
  const [copied, setCopied] = useState(false)

  const copyId = async () => {
    try {
      await copyTextToClipboard(id)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // The full ID remains available through the element title when clipboard access is unavailable.
    }
  }

  const timestampTitle = [
    createdAt ? `Created ${formatTimestamp(createdAt)}` : '',
    updatedAt ? `Updated ${formatTimestamp(updatedAt)}` : '',
  ].filter(Boolean).join(' · ')

  return (
    <div className={`entity-identity ${compact ? 'compact' : ''}`}>
      <span className="entity-serial" title={`Serial ${formatEntitySerial(prefix, serialNumber)} · ID ${id}`}>
        {formatEntitySerial(prefix, serialNumber)}
      </span>
      <button
        className={`entity-id-copy ${copied ? 'copied' : ''}`}
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          void copyId()
        }}
        aria-label={copied ? 'ID copied' : `Copy ${formatEntitySerial(prefix, serialNumber)} ID`}
        title={copied ? 'ID copied' : `Copy ID: ${id}`}
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
      </button>
      {updatedAt && (
        <time className="entity-timestamp" dateTime={updatedAt} title={timestampTitle}>
          {exact ? formatTimestamp(updatedAt) : formatUpdatedAt(updatedAt)}
        </time>
      )}
    </div>
  )
}

interface HighlightedTextProps {
  value: string
  query?: string
}

function HighlightedText({ value, query }: HighlightedTextProps) {
  const match = query ? matchSearchText(value, query) : null

  if (!match || match.indices.length === 0) {
    return <>{value}</>
  }

  const matchedIndices = new Set(match.indices)

  return (
    <>
      {Array.from(value).map((character, index) =>
        matchedIndices.has(index) ? (
          <mark key={`${character}-${index}`}>{character}</mark>
        ) : (
          character
        ),
      )}
    </>
  )
}

interface SearchPaletteProps {
  anchors: Anchor[]
  projects: Project[]
  query: string
  onQueryChange: (query: string) => void
  onSelect: (anchor: Anchor) => void
}

function SearchPalette({ anchors, projects, query, onQueryChange, onSelect }: SearchPaletteProps) {
  const hasQuery = query.trim().length > 0
  const results = filterAnchors(anchors, 'all', undefined, query).slice(0, 6)
  const quickAnchors = anchors.filter((anchor) => anchor.pinned).slice(0, 3)
  const suggestions = ['patience', 'strategy', 'energy']

  return (
    <div className="search-palette" role="dialog" aria-label="Anchor search">
      <div className="search-palette-header">
        <span>
          <Search size={14} />
          {hasQuery ? 'Matching anchors' : 'Quick find'}
        </span>
        <small>{hasQuery ? `${results.length} found` : '⌘ K anytime'}</small>
      </div>
      {hasQuery ? (
        results.length > 0 ? (
          <div className="search-results">
            {results.map((anchor) => {
              const project = getProject(projects, anchor.projectId)

              return (
                <button className="search-result" type="button" key={anchor.id} onClick={() => onSelect(anchor)}>
                  <span className={`search-result-mark ${anchor.color}`} />
                  <span className="search-result-copy">
                    <strong><HighlightedText value={anchor.title} query={query} /></strong>
                    <small>
                      <span className="search-result-id">{formatEntitySerial('A', anchor.serialNumber)}</span>
                      {project?.name ?? 'Global context'} <span>·</span>{' '}
                      <HighlightedText value={anchor.tag} query={query} />
                    </small>
                  </span>
                  <ArrowUpRight size={15} />
                </button>
              )
            })}
          </div>
        ) : (
          <div className="search-palette-empty">
            <div className="search-empty-graphic"><SearchX size={21} /></div>
            <strong>No anchor holds those letters yet.</strong>
            <span>Try a shorter sequence or capture the thought.</span>
          </div>
        )
      ) : (
        <>
          <div className="search-visual">
            <div className="search-visual-core"><Search size={19} /></div>
            <span className="search-visual-ring ring-a" />
            <span className="search-visual-ring ring-b" />
            <span className="search-visual-spark spark-a" />
            <span className="search-visual-spark spark-b" />
          </div>
          <div className="search-palette-message">
            <strong>Search by the letters you remember.</strong>
            <span>Title, context, and tags all count. Exact words aren&apos;t required.</span>
          </div>
          <div className="search-suggestions">
            {suggestions.map((suggestion) => (
              <button type="button" key={suggestion} onClick={() => onQueryChange(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
          {quickAnchors.length > 0 && (
            <div className="search-quick-list">
              <span className="search-quick-label">Keep close</span>
              {quickAnchors.map((anchor) => (
                <button className="search-quick-item" type="button" key={anchor.id} onClick={() => onSelect(anchor)}>
                  <span className={`search-result-mark ${anchor.color}`} />
                  <span className="search-quick-item-copy"><strong>{anchor.title}</strong><small>{formatEntitySerial('A', anchor.serialNumber)}</small></span>
                  <ChevronRight size={13} />
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

interface NotificationPanelProps {
  notifications: AppNotification[]
  onSelect: (notification: AppNotification) => void
  onMarkAllRead: () => void
}

function NotificationPanel({ notifications, onSelect, onMarkAllRead }: NotificationPanelProps) {
  const unreadCount = notifications.filter((notification) => !notification.isRead).length

  return (
    <div className="notification-panel" role="dialog" aria-label="Notifications">
      <div className="notification-panel-header">
        <div>
          <p className="eyebrow">Your reminders</p>
          <h2>Notifications</h2>
        </div>
        <button
          className="mark-read-button"
          type="button"
          disabled={unreadCount === 0}
          onClick={onMarkAllRead}
        >
          <CheckCheck size={14} />
          Mark all read
        </button>
      </div>
      {notifications.length > 0 ? (
        <div className="notification-list">
          {notifications.slice(0, 8).map((notification) => (
            <button
              className={`notification-item ${notification.isRead ? '' : 'unread'}`}
              type="button"
              key={notification.id}
              onClick={() => onSelect(notification)}
            >
              <span className={`notification-item-icon ${notification.color}`}>
                <Bell size={14} />
              </span>
              <span className="notification-item-copy">
                <strong>{notification.title}</strong>
                <small>{notification.body} · {formatUpdatedAt(notification.updatedAt)}</small>
              </span>
              {!notification.isRead && <span className="notification-unread-dot" />}
            </button>
          ))}
        </div>
      ) : (
        <div className="notification-empty">
          <CheckCheck size={23} />
          <strong>Nothing asking for you.</strong>
          <span>Your pinned anchors will appear here when they need a return.</span>
        </div>
      )}
      <div className="notification-panel-footer">
        <ShieldCheck size={13} />
        <span>Notifications are built from what you choose to keep close.</span>
      </div>
    </div>
  )
}

interface HomeViewProps {
  name: string
  anchors: Anchor[]
  projects: Project[]
  spotlight?: Anchor
  pinnedCount: number
  spotlightIndex: number
  onNextSpotlight: () => void
  onRemember: (anchorId: string) => void
  onTogglePinned: (anchorId: string) => void
  onEditAnchor: (anchor: Anchor) => void
  onOpenAnchor: (anchor: Anchor) => void
  onAddAnchor: () => void
  onOpenAll: () => void
  onOpenProject: (projectId: string) => void
  onOpenProjects: () => void
  onOpenDecision: () => void
  onAskAnchor: (anchor: Anchor) => void
}

function HomeView({
  name,
  anchors,
  projects,
  spotlight,
  pinnedCount,
  spotlightIndex,
  onNextSpotlight,
  onRemember,
  onTogglePinned,
  onEditAnchor,
  onOpenAnchor,
  onAddAnchor,
  onOpenAll,
  onOpenProject,
  onOpenProjects,
  onOpenDecision,
  onAskAnchor,
}: HomeViewProps) {
  const [greeting, setGreeting] = useState(() => getDailyGreeting(name))

  const shuffleGreeting = () => {
    setGreeting(getDailyGreeting(name))
  }

  const recentAnchors = anchors.slice(0, 3)
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())
  const dotCount = Math.min(pinnedCount, 5)

  return (
    <div className="home-view page-enter">
      <div className="page-heading home-heading">
        <div className="home-heading-text">
          <p className="eyebrow">{dateLabel}</p>
          <div className="home-title-row">
            <h1>
              {greeting.title}<span className="accent-dot">.</span>
            </h1>
            <button
              className="greeting-shuffle-btn"
              type="button"
              onClick={shuffleGreeting}
              title="Another calm thought"
              aria-label="Another calm thought"
            >
              <RotateCcw size={14} />
            </button>
          </div>
          <p className="page-subtitle">{greeting.subtitle}</p>
        </div>
        <div className="heading-actions">
          <button className="secondary-button decision-shortcut" type="button" onClick={onOpenDecision}>
            <WandSparkles size={16} />
            Think something through
          </button>
          <button className="primary-button" type="button" onClick={onAddAnchor}>
            <Plus size={17} />
            New anchor
          </button>
        </div>
      </div>

      <div className="home-layout">
        <div className="home-primary">
          <section className="spotlight-card">
            <div className="spotlight-orbit orbit-one" />
            <div className="spotlight-orbit orbit-two" />
            <div className="spotlight-content">
              <div className="spotlight-header">
                <span className="eyebrow light-eyebrow">
                  <Sparkles size={13} /> Anchor for now
                </span>
              </div>
              {spotlight ? (
                <>
                  <blockquote>{spotlight.title}</blockquote>
                  <p className="spotlight-body">{spotlight.body}</p>
                  {spotlight.evidence && (
                    <a
                      className="spotlight-evidence"
                      href={spotlight.evidence.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ShieldCheck size={12} />
                      Evidence-informed · {spotlight.evidence.label}
                      <ArrowUpRight size={11} />
                    </a>
                  )}
                  <div className="spotlight-bottom">
                    <div className="spotlight-meta">
                      <span className="spotlight-record">{formatEntitySerial('A', spotlight.serialNumber)}</span>
                      <span className="meta-separator">/</span>
                      <span className="spotlight-scope">
                        {spotlight.scope === 'global' ? 'Global context' : 'Project context'}
                      </span>
                      <span className="meta-separator">/</span>
                      <span>{spotlight.tag}</span>
                    </div>
                    <div className="spotlight-actions">
                      <button
                        className="remember-button"
                        type="button"
                        onClick={() => onRemember(spotlight.id)}
                      >
                        <Check size={15} />
                        I&apos;ve got it
                      </button>
                      <button className="next-anchor spotlight-open-anchor" type="button" onClick={() => onOpenAnchor(spotlight)}>
                        <span>Open anchor</span>
                        <ChevronRight size={15} />
                      </button>
                      <button className="next-anchor" type="button" onClick={onNextSpotlight}>
                        <span>Another one</span>
                        <ArrowUpRight size={15} />
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <EmptyState title="Your first anchor is waiting." actionLabel="Add an anchor" onAction={onAddAnchor} />
              )}
            </div>
            <div className="spotlight-pagination" aria-label={`${spotlightIndex + 1} of ${pinnedCount} pinned anchors`}>
              {Array.from({ length: dotCount }).map((_, index) => (
                <span className={index === spotlightIndex % Math.max(dotCount, 1) ? 'active' : ''} key={index} />
              ))}
            </div>
          </section>

          <div className="section-heading">
            <div>
              <p className="eyebrow">Your memory, externalized</p>
              <h2>Recently added</h2>
            </div>
            <button className="text-button" type="button" onClick={onOpenAll}>
              See all <ArrowUpRight size={15} />
            </button>
          </div>
          <div className="anchor-list compact-list">
            {recentAnchors.map((anchor) => (
              <AnchorListItem
                anchor={anchor}
                projects={projects}
                key={anchor.id}
                onTogglePinned={onTogglePinned}
                onEdit={onEditAnchor}
                onOpen={onOpenAnchor}
                onAskAI={onAskAnchor}
              />
            ))}
          </div>
        </div>

        <aside className="home-secondary">
          <section className="quiet-card">
            <div className="quiet-card-top">
              <div className="quiet-icon">
                <Brain size={18} />
              </div>
              <span className="quiet-label">A softer system</span>
            </div>
            <p>You don&apos;t need a better memory. You need a kinder place to put things.</p>
            <div className="quiet-line" />
            <span className="quiet-footer">Your thoughts can wander. Your context stays.</span>
          </section>

          <section className="mini-projects-card">
            <div className="section-heading mini-heading">
              <div>
                <p className="eyebrow">Keep in context</p>
                <h2>Projects</h2>
              </div>
              <button className="round-link" type="button" onClick={onOpenProjects} aria-label="View all projects">
                <ArrowUpRight size={15} />
              </button>
            </div>
            <div className="mini-project-list">
              {projects.slice(0, 3).map((project) => (
                <button
                  className="mini-project"
                  key={project.id}
                  type="button"
                  onClick={() => onOpenProject(project.id)}
                >
                  <span className={`mini-project-icon ${project.color}`}>
                    <ProjectIcon icon={project.icon} size={16} />
                  </span>
                  <span className="mini-project-copy">
                    <strong>{project.name}</strong>
                    <small>{getProjectAnchorCount(anchors, project.id)} anchors</small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              ))}
            </div>
          </section>

          <div className="home-footnote">
            <ShieldCheck size={15} />
            <span>Private by default. Your anchors stay yours.</span>
          </div>
        </aside>
      </div>
    </div>
  )
}

interface AnchorsViewProps {
  anchors: Anchor[]
  projects: Project[]
  filter: AnchorFilter
  query: string
  onQueryChange: (query: string) => void
  onFilterChange: (filter: AnchorFilter) => void
  onAddAnchor: () => void
  onEditAnchor: (anchor: Anchor) => void
  onOpenAnchor: (anchor: Anchor) => void
  onTogglePinned: (anchorId: string) => void
  settings: AISettings
  onOpenSettings: () => void
  onAskAnchor: (anchor: Anchor) => void
}

function AnchorsView({
  anchors,
  projects,
  filter,
  query,
  onQueryChange,
  onFilterChange,
  onAddAnchor,
  onEditAnchor,
  onOpenAnchor,
  onTogglePinned,
  settings,
  onOpenSettings,
  onAskAnchor,
}: AnchorsViewProps) {
  const filteredAnchors = filterAnchors(anchors, filter, undefined, query)
  const heading =
    filter === 'global' ? 'Global context' : filter === 'projects' ? 'Project anchors' : 'All anchors'
  const description =
    filter === 'global'
      ? 'The reminders that travel with you everywhere.'
      : filter === 'projects'
        ? 'Context that belongs to a particular part of your life.'
        : 'Everything you chose to keep within reach.'

  return (
    <div className="list-view page-enter">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Your memory, externalized</p>
          <h1>{heading}</h1>
          <p className="page-subtitle">{description}</p>
        </div>
        <button className="primary-button" type="button" onClick={onAddAnchor}>
          <Plus size={17} />
          New anchor
        </button>
      </div>

      <div className="list-toolbar">
        <div className="filter-tabs" role="tablist" aria-label="Filter anchors">
          <button
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            type="button"
            role="tab"
            aria-selected={filter === 'all'}
            onClick={() => onFilterChange('all')}
          >
            All · {anchors.length}
          </button>
          <button
            className={`filter-tab ${filter === 'global' ? 'active' : ''}`}
            type="button"
            role="tab"
            aria-selected={filter === 'global'}
            onClick={() => onFilterChange('global')}
          >
            Global · {anchors.filter((anchor) => anchor.scope === 'global').length}
          </button>
          <button
            className={`filter-tab ${filter === 'projects' ? 'active' : ''}`}
            type="button"
            role="tab"
            aria-selected={filter === 'projects'}
            onClick={() => onFilterChange('projects')}
          >
            Projects · {anchors.filter((anchor) => anchor.scope === 'project').length}
          </button>
        </div>
        <label className="inline-search">
          <Search size={16} />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Filter anchors"
            aria-label="Filter anchors"
          />
        </label>
      </div>

      <AIInsightCard
        className="anchors-ai-card"
        eyebrow="Your context, understood"
        title="Make your anchors work harder"
        description="Ask Anchor to spot themes, simplify a group of reminders, or turn what you saved into a practical next step."
        context={limitAIContext(anchors.map(anchorPromptLine).join('\n') || '- No anchors yet.', 12000)}
        prompts={[
          { label: 'Find themes', prompt: 'What themes or tensions show up across these anchors?' },
          { label: 'Make them actionable', prompt: 'Turn the most useful anchors into three small actions for this week.' },
          { label: 'Spot duplicates', prompt: 'Which anchors overlap, and how could I combine them without losing meaning?' },
        ]}
        settings={settings}
        onOpenSettings={onOpenSettings}
      />

      {filteredAnchors.length > 0 ? (
        <div className="anchor-grid">
          {filteredAnchors.map((anchor) => (
            <AnchorListItem
              anchor={anchor}
              projects={projects}
              query={query}
              key={anchor.id}
              onTogglePinned={onTogglePinned}
              onEdit={onEditAnchor}
              onOpen={onOpenAnchor}
              onAskAI={onAskAnchor}
            />
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <div className="empty-panel-icon">
            <Search size={21} />
          </div>
          <h2>No anchors found</h2>
          <p>Try a different word, or write down what&apos;s on your mind.</p>
          <button className="secondary-button" type="button" onClick={onAddAnchor}>
            <Plus size={16} />
            Add an anchor
          </button>
        </div>
      )}
    </div>
  )
}

interface AnchorListItemProps {
  anchor: Anchor
  projects: Project[]
  query?: string
  onOpen: (anchor: Anchor) => void
  onTogglePinned: (anchorId: string) => void
  onEdit?: (anchor: Anchor) => void
  onAskAI?: (anchor: Anchor) => void
}

function AnchorListItem({ anchor, projects, query, onOpen, onTogglePinned, onEdit, onAskAI }: AnchorListItemProps) {
  const [titleExpanded, setTitleExpanded] = useState(false)
  const project = getProject(projects, anchor.projectId)
  const canExpandTitle = anchor.title.length > 72

  const handleCardKeyDown = (event: React.KeyboardEvent<HTMLElement>) => {
    if (event.target !== event.currentTarget) {
      return
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen(anchor)
    }
  }

  return (
    <article
      className={`anchor-item accent-${anchor.color} ${titleExpanded ? 'title-expanded' : ''}`}
      role="link"
      tabIndex={0}
      aria-label={`Open anchor: ${anchor.title}`}
      onClick={() => onOpen(anchor)}
      onKeyDown={handleCardKeyDown}
    >
      <div className="anchor-item-header">
        <div className="anchor-context">
          <span className={`context-dot ${anchor.color}`} />
          <span>{project?.name ?? 'Global context'}</span>
        </div>
        <div className="anchor-item-actions">
          {onEdit && (
            <button
              className="item-action-button"
              type="button"
              aria-label="Edit anchor"
              title="Edit anchor"
              onClick={(event) => {
                event.stopPropagation()
                onEdit(anchor)
              }}
            >
              <PenLine size={14} />
            </button>
          )}
          {onAskAI && (
            <button
              className="item-action-button ai-item-action"
              type="button"
              aria-label="Reflect on anchor with AI"
              title="Reflect on anchor with AI"
              onClick={(event) => {
                event.stopPropagation()
                onAskAI(anchor)
              }}
            >
              <Sparkles size={14} />
            </button>
          )}
          <button
            className={`pin-button ${anchor.pinned ? 'pinned' : ''}`}
            type="button"
            aria-label={anchor.pinned ? 'Unpin anchor' : 'Pin anchor'}
            title={anchor.pinned ? 'Unpin anchor' : 'Pin anchor'}
            onClick={(event) => {
              event.stopPropagation()
              onTogglePinned(anchor.id)
            }}
          >
            <Pin size={15} fill={anchor.pinned ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
      <div className={`anchor-title-block ${titleExpanded ? 'expanded' : ''}`}>
        <h3><HighlightedText value={anchor.title} query={query} /></h3>
        {canExpandTitle && (
          <button
            className="anchor-title-expand"
            type="button"
            aria-expanded={titleExpanded}
            onClick={(event) => {
              event.stopPropagation()
              setTitleExpanded((expanded) => !expanded)
            }}
          >
            {titleExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {titleExpanded ? 'Show less' : 'Show full title'}
          </button>
        )}
      </div>
      <div className="anchor-item-footer">
        <span className="anchor-tag"><HighlightedText value={anchor.tag} query={query} /></span>
        <EntityIdentity
          prefix="A"
          serialNumber={anchor.serialNumber}
          id={anchor.id}
          createdAt={anchor.createdAt}
          updatedAt={anchor.updatedAt}
        />
      </div>
    </article>
  )
}

interface AnchorDetailViewProps {
  anchor: Anchor
  projects: Project[]
  backLabel: string
  onBack: () => void
  onEdit: () => void
  onTogglePinned: (anchorId: string) => void
  onAskAI: (anchor: Anchor) => void
}

function AnchorDetailView({
  anchor,
  projects,
  backLabel,
  onBack,
  onEdit,
  onTogglePinned,
  onAskAI,
}: AnchorDetailViewProps) {
  const project = getProject(projects, anchor.projectId)
  const hasBody = anchor.body.trim().length > 0

  return (
    <div className="anchor-detail-view page-enter">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft size={16} />
        {backLabel}
      </button>
      <article className={`anchor-detail-card accent-${anchor.color}`}>
        <div className="anchor-detail-top">
          <div className="anchor-context">
            <span className={`context-dot ${anchor.color}`} />
            <span>{project?.name ?? 'Global context'}</span>
          </div>
          <div className="anchor-detail-actions">
            <button
              className={`pin-button ${anchor.pinned ? 'pinned' : ''}`}
              type="button"
              aria-label={anchor.pinned ? 'Unpin anchor' : 'Pin anchor'}
              title={anchor.pinned ? 'Unpin anchor' : 'Pin anchor'}
              onClick={() => onTogglePinned(anchor.id)}
            >
              <Pin size={16} fill={anchor.pinned ? 'currentColor' : 'none'} />
            </button>
            <button className="secondary-button anchor-detail-edit" type="button" onClick={onEdit}>
              <PenLine size={15} />
              Edit anchor
            </button>
          </div>
        </div>

        <div className="anchor-detail-heading">
          <p className="eyebrow"><AnchorIcon size={13} /> {formatEntitySerial('A', anchor.serialNumber)}</p>
          <h1>{anchor.title}</h1>
        </div>

        <section className="anchor-detail-context">
          <p className="eyebrow">More context</p>
          {hasBody ? (
            <p className="anchor-detail-copy">{anchor.body}</p>
          ) : (
            <div className="anchor-detail-no-context">
              <AnchorIcon size={17} />
              <span>This anchor stands on its own. No additional context was added.</span>
            </div>
          )}
        </section>

        {anchor.evidence && (
          <a
            className="evidence-link anchor-detail-evidence"
            href={anchor.evidence.url}
            target="_blank"
            rel="noreferrer"
          >
            <ShieldCheck size={12} />
            Evidence-informed · {anchor.evidence.label}
            <ArrowUpRight size={11} />
          </a>
        )}

        <div className="anchor-detail-footer">
          <div className="anchor-detail-tags">
            <span className="anchor-tag">{anchor.tag}</span>
            <span className="anchor-detail-scope">
              {anchor.scope === 'global' ? 'Everywhere' : 'Project context'}
            </span>
          </div>
          <EntityIdentity
            prefix="A"
            serialNumber={anchor.serialNumber}
            id={anchor.id}
            createdAt={anchor.createdAt}
            updatedAt={anchor.updatedAt}
            exact
          />
        </div>
      </article>
      <div className="anchor-detail-toolbar">
        <button className="secondary-button" type="button" onClick={() => onAskAI(anchor)}>
          <Sparkles size={15} />
          Reflect on this anchor
        </button>
        <span>{formatUpdatedAt(anchor.updatedAt)}</span>
      </div>
    </div>
  )
}

function aiDraftString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function parseAnchorDraft(response: string): { title: string; body: string; tag: string } {
  const draft = parseAIObject(response)
  const title = aiDraftString(draft.title)
  const body = aiDraftString(draft.body)
  const tag = aiDraftString(draft.tag)

  if (!title) {
    throw new Error('Anchor drafts need a clear title. Try again with a little more detail.')
  }

  return { title, body, tag }
}

function parseProjectDraft(response: string): { name: string; description: string } {
  const draft = parseAIObject(response)
  const name = aiDraftString(draft.name)
  const description = aiDraftString(draft.description)

  if (!name || !description) {
    throw new Error('Project drafts need a name and a short description. Try again with more detail.')
  }

  return { name, description }
}

function limitAIContext(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength)}\n…more context omitted for focus.` : value
}

function buildWorkspaceAIContext(
  anchors: Anchor[],
  projects: Project[],
  decisions: Decision[],
  notes: Note[],
): string {
  const projectLines = projects.map((project) => {
    const count = anchors.filter((anchor) => anchor.projectId === project.id).length
    return `- ${project.name}: ${project.description} (${count} anchor${count === 1 ? '' : 's'})`
  })
  const anchorLines = anchors.slice(0, 24).map(anchorPromptLine)
  const decisionLines = decisions.slice(0, 8).map((decision) =>
    `- ${decisionPreview(decision)}${decision.projectId ? ` [project: ${projects.find((project) => project.id === decision.projectId)?.name ?? 'unknown'}]` : ''}`,
  )
  const noteLines = notes.slice(0, 8).map((note) => `- ${note.title}: ${note.content.replace(/\s+/g, ' ').trim().slice(0, 280)}`)

  return limitAIContext([
    'PROJECTS',
    projectLines.join('\n') || '- No projects yet.',
    'ANCHORS',
    anchorLines.join('\n') || '- No anchors yet.',
    'RECENT DECISION ROOMS',
    decisionLines.join('\n') || '- No decision rooms yet.',
    'NOTES',
    noteLines.join('\n') || '- No saved notes yet.',
  ].join('\n\n'), 18000)
}

function buildProjectAIContext(
  project: Project,
  anchors: Anchor[],
  decisions: Decision[] = [],
  notes: Note[] = [],
): string {
  const projectAnchors = anchors.filter((anchor) => anchor.projectId === project.id)
  const globalAnchors = anchors.filter((anchor) => anchor.scope === 'global' && anchor.pinned).slice(0, 6)
  const projectDecisions = decisions.filter((decision) => decision.projectId === project.id).slice(0, 6)
  const recentNotes = notes.slice(0, 5)

  return limitAIContext([
    `PROJECT\n${project.name}\n${project.description}`,
    `PROJECT ANCHORS\n${projectAnchors.map(anchorPromptLine).join('\n') || '- No project anchors yet.'}`,
    `GLOBAL PRINCIPLES\n${globalAnchors.map(anchorPromptLine).join('\n') || '- No pinned global principles.'}`,
    `PROJECT DECISION ROOMS\n${projectDecisions.map((decision) => `- ${decisionPreview(decision)}`).join('\n') || '- No project decision rooms yet.'}`,
    `RECENT NOTES\n${recentNotes.map((note) => `- ${note.title}: ${note.content.replace(/\s+/g, ' ').trim().slice(0, 240)}`).join('\n') || '- No saved notes yet.'}`,
  ].join('\n\n'), 12000)
}

interface AIQuickPrompt {
  label: string
  prompt: string
}

interface AIInsightCardProps {
  eyebrow: string
  title: string
  description: string
  context: string
  prompts: AIQuickPrompt[]
  settings: AISettings
  onOpenSettings: () => void
  className?: string
}

function AIInsightCard({
  eyebrow,
  title,
  description,
  context,
  prompts,
  settings,
  onOpenSettings,
  className = '',
}: AIInsightCardProps) {
  const [answer, setAnswer] = useState<string>()
  const [question, setQuestion] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [error, setError] = useState<string>()
  const requestControllerRef = useRef<AbortController | undefined>(undefined)

  useEffect(() => () => requestControllerRef.current?.abort(), [])

  const askAnchor = async (requestedPrompt: string) => {
    const trimmedPrompt = requestedPrompt.trim()

    if (!trimmedPrompt) {
      return
    }

    if (!isAIReady(settings)) {
      setError('Connect an AI provider, API key, and model in Settings before asking Anchor for an insight.')
      return
    }

    requestControllerRef.current?.abort()
    const requestController = new AbortController()
    requestControllerRef.current = requestController
    setIsThinking(true)
    setError(undefined)
    setQuestion('')

    try {
      const response = await completeAIChat(settings, [
        {
          role: 'system',
          content: 'You are Anchor, a practical and compassionate workspace guide. Use only the supplied workspace context. Notice patterns without overclaiming, name uncertainty, and turn observations into small useful actions. Do not diagnose, invent facts, or make high-stakes decisions for the person. Format the answer with concise Markdown headings and bullets.',
        },
        {
          role: 'user',
          content: `WORKSPACE CONTEXT\n${context}\n\nREQUEST\n${trimmedPrompt}`,
        },
      ], requestController.signal)

      setAnswer(response)
      void notifyAIResponse('Anchor insight ready', response)
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') {
        return
      }

      setError(requestError instanceof Error ? requestError.message : 'Anchor could not reach your AI provider.')
    } finally {
      if (requestControllerRef.current === requestController) {
        requestControllerRef.current = undefined
        setIsThinking(false)
      }
    }
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void askAnchor(question)
  }

  return (
    <section className={`ai-insight-card ${className}`.trim()}>
      <div className="ai-insight-header">
        <div className="ai-insight-title-wrap">
          <span className="ai-insight-icon"><Sparkles size={17} /></span>
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2>{title}</h2>
          </div>
        </div>
        {!isAIReady(settings) ? (
          <button className="text-button ai-connect-link" type="button" onClick={onOpenSettings}>
            Connect AI <ArrowUpRight size={13} />
          </button>
        ) : (
          <span className="ai-ready-label"><span /> Ready when you are</span>
        )}
      </div>
      <p className="ai-insight-description">{description}</p>
      <div className="ai-quick-prompts">
        {prompts.map((item) => (
          <button
            className="ai-quick-prompt"
            type="button"
            key={item.label}
            disabled={isThinking}
            onClick={() => void askAnchor(item.prompt)}
          >
            <WandSparkles size={13} /> {item.label}
          </button>
        ))}
      </div>
      {answer ? (
        <div className="ai-insight-response">
          <div className="ai-response-heading">
            <span><Bot size={14} /> Anchor&apos;s read</span>
            <button className="text-button" type="button" onClick={() => setAnswer(undefined)}>Clear</button>
          </div>
          <ChatRichText content={answer} />
        </div>
      ) : (
        <div className="ai-insight-empty">
          <Bot size={16} />
          <span>Ask for a useful read on what you have already captured. Nothing runs until you choose an action.</span>
        </div>
      )}
      <form className="ai-question-form" onSubmit={handleSubmit}>
        <input
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask anything about this context…"
          aria-label={`Ask Anchor about ${title.toLowerCase()}`}
          disabled={isThinking}
        />
        <button className="ai-send-button" type="submit" disabled={isThinking || !question.trim()} aria-label="Ask Anchor">
          {isThinking ? <RefreshCw className="spin" size={15} /> : <Send size={15} />}
        </button>
      </form>
      {error && (
        <div className="ai-inline-error" role="alert">
          <CircleAlert size={14} />
          <span>{error}</span>
          {!isAIReady(settings) && <button type="button" onClick={onOpenSettings}>Open Settings</button>}
        </div>
      )}
      <span className="ai-privacy-note"><ShieldCheck size={12} /> Sent to your chosen provider only when you ask.</span>
    </section>
  )
}

interface AIWriterButtonProps {
  settings: AISettings
  onOpenSettings: () => void
  prompt: string
  onResult: (response: string) => void
  label: string
  disabled?: boolean
}

function AIWriterButton({
  settings,
  onOpenSettings,
  prompt,
  onResult,
  label,
  disabled = false,
}: AIWriterButtonProps) {
  const [isWorking, setIsWorking] = useState(false)
  const [error, setError] = useState<string>()
  const requestControllerRef = useRef<AbortController | undefined>(undefined)
  const ready = isAIReady(settings)

  useEffect(() => () => requestControllerRef.current?.abort(), [])

  const run = async () => {
    if (!ready) {
      setError('Connect AI in Settings first, then Anchor can help shape this draft.')
      return
    }

    requestControllerRef.current?.abort()
    const requestController = new AbortController()
    requestControllerRef.current = requestController
    setIsWorking(true)
    setError(undefined)

    try {
      const response = await completeAIChat(settings, [
        {
          role: 'system',
          content: 'You are Anchor’s writing assistant. Return only one valid JSON object with the exact requested keys. Keep the person’s meaning, remove vagueness, and never invent evidence, credentials, events, or promises.',
        },
        { role: 'user', content: prompt },
      ], requestController.signal)
      onResult(response)
      void notifyAIResponse(`${label} ready`, 'Anchor finished preparing your AI-assisted draft.')
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') {
        return
      }

      setError(requestError instanceof Error ? requestError.message : 'Anchor could not shape that draft.')
    } finally {
      if (requestControllerRef.current === requestController) {
        requestControllerRef.current = undefined
        setIsWorking(false)
      }
    }
  }

  return (
    <div className="ai-writer-control">
      <button className="ai-writer-button" type="button" onClick={() => void run()} disabled={disabled || isWorking}>
        {isWorking ? <RefreshCw className="spin" size={14} /> : <Sparkles size={14} />}
        {isWorking ? 'Shaping…' : label}
      </button>
      {!ready && <button className="ai-writer-settings" type="button" onClick={onOpenSettings}>Connect AI</button>}
      {error && <span className="ai-writer-error" role="alert">{error}</span>}
    </div>
  )
}

interface AnchorReflectionModalProps {
  anchor: Anchor
  project?: Project
  relatedAnchors: Anchor[]
  settings: AISettings
  onOpenSettings: () => void
  onClose: () => void
}

function AnchorReflectionModal({
  anchor,
  project,
  relatedAnchors,
  settings,
  onOpenSettings,
  onClose,
}: AnchorReflectionModalProps) {
  const [answer, setAnswer] = useState<string>()
  const [question, setQuestion] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [error, setError] = useState<string>()
  const requestControllerRef = useRef<AbortController | undefined>(undefined)

  useEffect(() => () => requestControllerRef.current?.abort(), [])

  const ask = async (requestedPrompt: string) => {
    const trimmedPrompt = requestedPrompt.trim()
    if (!trimmedPrompt) return

    if (!isAIReady(settings)) {
      setError('Connect an AI provider, API key, and model in Settings before asking for a reflection.')
      return
    }

    requestControllerRef.current?.abort()
    const requestController = new AbortController()
    requestControllerRef.current = requestController
    setIsThinking(true)
    setError(undefined)
    setQuestion('')

    const related = relatedAnchors
      .filter((item) => item.id !== anchor.id && (item.projectId === anchor.projectId || item.scope === 'global'))
      .slice(0, 8)
      .map(anchorPromptLine)
      .join('\n')

    try {
      const response = await completeAIChat(settings, [
        {
          role: 'system',
          content: 'You are Anchor’s context coach. Reflect on the supplied anchor with warmth and practical clarity. Suggest ways to use it, test it, or make it actionable without changing the person’s beliefs for them. Do not invent facts or make high-stakes claims. Use concise Markdown.',
        },
        {
          role: 'user',
          content: `ANCHOR\n${anchorPromptLine(anchor)}\n\n${project ? `PROJECT\n${project.name}: ${project.description}` : 'SCOPE\nGlobal context'}\n\nRELATED ANCHORS\n${related || '- None yet.'}\n\nREQUEST\n${trimmedPrompt}`,
        },
      ], requestController.signal)
      setAnswer(response)
      void notifyAIResponse('Anchor reflection ready', response)
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return
      setError(requestError instanceof Error ? requestError.message : 'Anchor could not reach your AI provider.')
    } finally {
      if (requestControllerRef.current === requestController) {
        requestControllerRef.current = undefined
        setIsThinking(false)
      }
    }
  }

  return (
    <Modal eyebrow="A closer look" title="Reflect on this anchor" onClose={onClose}>
      <div className="anchor-reflection-content">
        <div className="anchor-reflection-source">
          <span className={`context-dot ${anchor.color}`} />
          <div><strong>{anchor.title}</strong><span>{project?.name ?? 'Global context'} · {anchor.tag}</span></div>
        </div>
        <div className="ai-quick-prompts reflection-prompts">
          <button className="ai-quick-prompt" type="button" disabled={isThinking} onClick={() => void ask('Make this anchor more actionable for an ordinary day.')}>Make it actionable</button>
          <button className="ai-quick-prompt" type="button" disabled={isThinking} onClick={() => void ask('What is a healthy way to test or revisit this anchor this week?')}>Test it this week</button>
          <button className="ai-quick-prompt" type="button" disabled={isThinking} onClick={() => void ask('What might I be overlooking when I rely on this anchor?')}>Find a blind spot</button>
        </div>
        {answer ? (
          <div className="ai-insight-response reflection-response">
            <div className="ai-response-heading"><span><Bot size={14} /> Anchor&apos;s reflection</span><button className="text-button" type="button" onClick={() => setAnswer(undefined)}>Clear</button></div>
            <ChatRichText content={answer} />
          </div>
        ) : (
          <div className="ai-insight-empty"><Bot size={16} /><span>Use AI to explore how this reminder can serve you, not to replace your judgment.</span></div>
        )}
        <form className="ai-question-form" onSubmit={(event) => { event.preventDefault(); void ask(question) }}>
          <input value={question} onChange={(event) => setQuestion(event.target.value)} placeholder="Ask a question about this anchor…" aria-label="Ask about this anchor" disabled={isThinking} />
          <button className="ai-send-button" type="submit" disabled={isThinking || !question.trim()} aria-label="Ask about this anchor">
            {isThinking ? <RefreshCw className="spin" size={15} /> : <Send size={15} />}
          </button>
        </form>
        {!isAIReady(settings) && (
          <div className="ai-inline-error"><CircleAlert size={14} /><span>AI is not connected yet.</span><button type="button" onClick={onOpenSettings}>Open Settings</button></div>
        )}
        {error && isAIReady(settings) && <div className="ai-inline-error" role="alert"><CircleAlert size={14} /><span>{error}</span></div>}
        <span className="ai-privacy-note"><ShieldCheck size={12} /> Your anchor is sent only to your chosen provider when you ask.</span>
      </div>
    </Modal>
  )
}

interface DecisionViewProps {
  name: string
  projects: Project[]
  anchors: Anchor[]
  notes: Note[]
  settings: AISettings
  decisions: Decision[]
  onOpenSettings: () => void
  onSaveDecision: (decision: Decision) => void
  onDeleteDecision: (decisionId: string) => void
}

function anchorPromptLine(anchor: Anchor): string {
  const evidence = anchor.evidence ? ` [Evidence reference: ${anchor.evidence.label} — ${anchor.evidence.url}]` : ''
  const serial = formatEntitySerial('A', anchor.serialNumber)
  const body = anchor.body.trim()

  return `- ${serial} ${anchor.title}${body ? `: ${body}` : ''}${evidence}`
}

function decisionSystemPrompt(
  project: Project | undefined,
  projectAnchors: Anchor[],
  globalAnchors: Anchor[],
): string {
  const projectContext = project
    ? `\nImported project: ${project.name}\nProject description: ${project.description}\nProject anchors:\n${projectAnchors.map(anchorPromptLine).join('\n') || '- No project anchors yet.'}`
    : '\nNo project was imported. Treat this as a personal, general decision.'
  const globalContext = globalAnchors.length
    ? `\nGlobal context the person chose to keep close:\n${globalAnchors.map(anchorPromptLine).join('\n')}`
    : ''

  return `You are Anchor, a warm and thoughtful decision companion. Help this person slow down without taking their agency away. Be kind, clear, honest, and thorough. Do not pretend certainty, diagnose them, or make a high-stakes decision on their behalf. Name assumptions and uncertainty plainly.\n\nFor the first response, cover:\n1. What you hear beneath the situation.\n2. The realistic options, including the option to wait or gather more information.\n3. Benefits, costs, risks, and likely short-term and longer-term outcomes for each option.\n4. What could change the recommendation.\n5. A gentle, concrete next step and one question worth sitting with.\n\nUse readable headings and bullets. Keep the tone human rather than clinical. For follow-up questions, answer directly while remembering the full context.${projectContext}${globalContext}`
}

function decisionPreview(decision: Decision): string {
  return decision.title?.replace(/\s+/g, ' ').trim() || decision.situation.replace(/\s+/g, ' ').trim() || 'Untitled decision'
}

function inlineMarkdown(value: string): React.ReactNode {
  const tokens = /(\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*\*[^*\n]+\*\*|__[^_\n]+__|~~[^~\n]+~~|`[^`\n]+`|\*[^*\n]+\*|_[^_\n]+_)/g

  return value.split(tokens).map((part, index) => {
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/)
    if (link) {
      return <a key={`${part}-${index}`} href={link[2]} target="_blank" rel="noreferrer">{link[1]}</a>
    }

    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
    }

    if (part.startsWith('~~') && part.endsWith('~~')) {
      return <del key={`${part}-${index}`}>{part.slice(2, -2)}</del>
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>
    }

    if ((part.startsWith('*') && part.endsWith('*')) || (part.startsWith('_') && part.endsWith('_'))) {
      return <em key={`${part}-${index}`}>{part.slice(1, -1)}</em>
    }

    return part
  })
}

function tableCells(value: string): string[] {
  return value.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((cell) => cell.trim())
}

function isTableDivider(cells: string[]): boolean {
  return cells.length > 1 && cells.every((cell) => /^:?-{3,}:?$/.test(cell))
}

function renderInlineLines(lines: string[]): React.ReactNode[] {
  return lines.flatMap((line, index) => index === 0
    ? [inlineMarkdown(line)]
    : [<br key={`line-break-${index}`} />, inlineMarkdown(line)])
}

function ChatRichText({ content }: { content: string }) {
  const blocks: React.ReactNode[] = []
  const paragraphLines: string[] = []
  const listItems: string[] = []
  const quoteLines: string[] = []
  const codeLines: string[] = []
  const tableRows: string[][] = []
  let listType: 'ul' | 'ol' | undefined
  let inCodeBlock = false
  let inTable = false
  let blockIndex = 0

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return
    }

    blocks.push(<p key={`paragraph-${blockIndex++}`}>{renderInlineLines(paragraphLines)}</p>)
    paragraphLines.length = 0
  }

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      return
    }

    const List = listType
    blocks.push(
      <List key={`list-${blockIndex++}`}>
        {listItems.map((item, index) => {
          const task = item.match(/^\[([ xX])\]\s+(.+)$/)
          return task ? (
            <li className={`chat-task-item ${task[1].toLowerCase() === 'x' ? 'checked' : ''}`} key={`${item}-${index}`}>
              <span className="chat-task-marker" aria-hidden="true">{task[1].toLowerCase() === 'x' ? '✓' : ''}</span>
              {inlineMarkdown(task[2])}
            </li>
          ) : <li key={`${item}-${index}`}>{inlineMarkdown(item)}</li>
        })}
      </List>,
    )
    listType = undefined
    listItems.length = 0
  }

  const flushQuote = () => {
    if (quoteLines.length === 0) {
      return
    }

    blocks.push(<blockquote key={`quote-${blockIndex++}`}>{renderInlineLines(quoteLines)}</blockquote>)
    quoteLines.length = 0
  }

  const flushCode = () => {
    if (codeLines.length === 0) {
      return
    }

    blocks.push(<pre key={`code-${blockIndex++}`}><code>{codeLines.join('\n')}</code></pre>)
    codeLines.length = 0
  }

  const flushTable = () => {
    if (tableRows.length === 0) {
      return
    }

    const [header, ...body] = tableRows
    blocks.push(
      <div className="chat-table-wrap" key={`table-${blockIndex++}`}>
        <table>
          <thead>
            <tr>{header.map((cell, index) => <th key={`${cell}-${index}`}>{inlineMarkdown(cell)}</th>)}</tr>
          </thead>
          {body.length > 0 && (
            <tbody>
              {body.map((row, rowIndex) => (
                <tr key={`row-${rowIndex}`}>
                  {row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{inlineMarkdown(cell)}</td>)}
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>,
    )
    tableRows.length = 0
    inTable = false
  }

  content.split(/\r?\n/).forEach((line, lineIndex, lines) => {
    const trimmedLine = line.trim()

    if (trimmedLine.startsWith('```')) {
      flushParagraph()
      flushList()
      flushQuote()
      flushTable()
      if (inCodeBlock) {
        flushCode()
      }
      inCodeBlock = !inCodeBlock
      return
    }

    if (inCodeBlock) {
      codeLines.push(line)
      return
    }

    const cells = trimmedLine.includes('|') ? tableCells(trimmedLine) : []
    const nextLine = lines[lineIndex + 1]?.trim() ?? ''
    const nextCells = nextLine.includes('|') ? tableCells(nextLine) : []

    if (!inTable && cells.length > 1 && isTableDivider(nextCells)) {
      flushParagraph()
      flushList()
      flushQuote()
      tableRows.push(cells)
      inTable = true
      return
    }

    if (inTable) {
      if (isTableDivider(cells)) {
        return
      }
      if (cells.length > 1) {
        tableRows.push(cells)
        return
      }
      flushTable()
    }

    if (!trimmedLine) {
      flushParagraph()
      flushList()
      flushQuote()
      return
    }

    const heading = trimmedLine.match(/^#{1,3}\s+(.+)$/)
    const quote = trimmedLine.match(/^>\s?(.*)$/)
    const unorderedItem = trimmedLine.match(/^[-*•]\s+(.+)$/)
    const orderedItem = trimmedLine.match(/^\d+[.)]\s+(.+)$/)

    if (/^(?:---+|\*\*\*+|___+)$/.test(trimmedLine)) {
      flushParagraph()
      flushList()
      flushQuote()
      blocks.push(<hr key={`rule-${blockIndex++}`} />)
      return
    }

    if (quote) {
      flushParagraph()
      flushList()
      quoteLines.push(quote[1])
      return
    }

    flushQuote()

    if (heading) {
      flushParagraph()
      flushList()
      blocks.push(<h3 key={`heading-${blockIndex++}`}>{inlineMarkdown(heading[1])}</h3>)
      return
    }

    if (unorderedItem || orderedItem) {
      const nextListType = unorderedItem ? 'ul' : 'ol'

      flushParagraph()
      if (listType && listType !== nextListType) {
        flushList()
      }
      listType = nextListType
      listItems.push((unorderedItem ?? orderedItem)?.[1] ?? '')
      return
    }

    flushList()
    paragraphLines.push(trimmedLine)
  })

  flushParagraph()
  flushList()
  flushQuote()
  flushTable()
  if (inCodeBlock) {
    flushCode()
  }

  return <div className="chat-rich-text">{blocks}</div>
}

interface NoteImportSelectProps {
  notes: Note[]
  target: 'situation' | 'context'
  onImport: (note: Note, target: 'situation' | 'context') => void
}

function NoteImportSelect({ notes, target, onImport }: NoteImportSelectProps) {
  const targetLabel = target === 'situation' ? 'the situation' : 'more context'

  return (
    <div className="decision-note-picker">
      <NotebookPen size={12} aria-hidden="true" />
      <select
        value=""
        disabled={!notes.length}
        onChange={(event) => {
          const note = notes.find((item) => item.id === event.target.value)
          if (note) onImport(note, target)
        }}
        aria-label={`Import a note into ${targetLabel}`}
        title={`Import a note into ${targetLabel}`}
      >
        <option value="">{notes.length ? 'Import note' : 'No saved notes'}</option>
        {notes.map((note) => <option value={note.id} key={note.id}>{formatEntitySerial('N', note.serialNumber)} · {note.title}</option>)}
      </select>
    </div>
  )
}

function DecisionView({
  name,
  projects,
  anchors,
  notes,
  settings,
  decisions,
  onOpenSettings,
  onSaveDecision,
  onDeleteDecision,
}: DecisionViewProps) {
  const firstDecision = decisions[0]
  const [activeDecisionId, setActiveDecisionId] = useState<string | undefined>(firstDecision?.id)
  const [activeDecisionSerialNumber, setActiveDecisionSerialNumber] = useState<number | undefined>(firstDecision?.serialNumber)
  const [projectId, setProjectId] = useState(firstDecision?.projectId ?? '')
  const [projectImported, setProjectImported] = useState(Boolean(firstDecision?.projectId))
  const [importedNoteIds, setImportedNoteIds] = useState<string[]>(firstDecision?.noteIds ?? [])
  const [briefCollapsed, setBriefCollapsed] = useState(false)
  const [decisionTitle, setDecisionTitle] = useState(firstDecision?.title ?? '')
  const [situation, setSituation] = useState(firstDecision?.situation ?? '')
  const [additionalContext, setAdditionalContext] = useState(firstDecision?.additionalContext ?? '')
  const [messages, setMessages] = useState<ChatMessage[]>(firstDecision?.messages ?? [])
  const [chatInput, setChatInput] = useState('')
  const [copiedMessageId, setCopiedMessageId] = useState<string>()
  const [isThinking, setIsThinking] = useState(false)
  const [error, setError] = useState<string>()
  const requestControllerRef = useRef<AbortController | undefined>(undefined)
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const selectedProject = getProject(projects, projectId)
  const projectAnchors = projectImported && selectedProject
    ? anchors.filter((anchor) => anchor.projectId === selectedProject.id)
    : []
  const globalAnchors = anchors.filter((anchor) => anchor.scope === 'global' && anchor.pinned).slice(0, 6)
  const provider = AI_PROVIDERS.find((item) => item.id === settings.providerId)
  const connectionReady = Boolean(settings.apiKey.trim() && settings.model.trim() && (!provider?.requiresAccountId || settings.accountId.trim()))

  useEffect(() => {
    const chatMessages = chatMessagesRef.current
    if (chatMessages) {
      chatMessages.scrollTop = chatMessages.scrollHeight
    }
  }, [messages, isThinking])

  const saveCurrentDecision = (nextMessages: ChatMessage[]) => {
    const now = new Date().toISOString()
    const existingDecision = decisions.find((decision) => decision.id === activeDecisionId)
    const id = activeDecisionId ?? createId('decision')
    const serialNumber = existingDecision?.serialNumber ?? nextSerialNumber(decisions)

    setActiveDecisionId(id)
    setActiveDecisionSerialNumber(serialNumber)
    onSaveDecision({
      id,
      serialNumber,
      title: decisionTitle.trim() || undefined,
      projectId: projectImported && projectId ? projectId : undefined,
      noteIds: importedNoteIds,
      situation: situation.trim(),
      additionalContext: additionalContext.trim(),
      messages: nextMessages,
      createdAt: existingDecision?.createdAt ?? now,
      updatedAt: now,
    })
  }

  const buildUserPrompt = () => {
    const importedContext = selectedProject && projectImported
      ? `\n\nIMPORTED PROJECT CONTEXT\nProject: ${selectedProject.name}\nDescription: ${selectedProject.description}\nAnchors:\n${projectAnchors.map(anchorPromptLine).join('\n') || '- None yet.'}`
      : ''
    const globalContextText = globalAnchors.length
      ? `\n\nGLOBAL ANCHORS\n${globalAnchors.map(anchorPromptLine).join('\n')}`
      : ''

    return `I want to think this through carefully.\n\nSITUATION\n${situation.trim()}\n\nMORE CONTEXT\n${additionalContext.trim() || 'No additional context yet.'}${importedContext}${globalContextText}`
  }

  const sendToAI = async (content: string) => {
    const trimmedContent = content.trim()

    if (!trimmedContent) {
      return
    }

    if (!connectionReady) {
      setError('Anchor needs a provider, API key, and model before it can think with you. You can connect one in Settings.')
      return
    }

    const userMessage: ChatMessage = {
      id: createId('message'),
      serialNumber: nextSerialNumber(messages),
      role: 'user',
      content: trimmedContent,
      createdAt: new Date().toISOString(),
    }
    const nextMessages = [...messages, userMessage]
    const aiMessages: AIMessage[] = [
      {
        role: 'system',
        content: `${decisionSystemPrompt(selectedProject && projectImported ? selectedProject : undefined, projectAnchors, globalAnchors)}\n\nCURRENT DECISION CONTEXT\n${buildUserPrompt()}`,
      },
      ...nextMessages.map((message) => ({ role: message.role, content: message.content })),
    ]

    requestControllerRef.current?.abort()
    const requestController = new AbortController()

    requestControllerRef.current = requestController
    setMessages(nextMessages)
    setChatInput('')
    setError(undefined)
    saveCurrentDecision(nextMessages)
    setIsThinking(true)

    try {
      const response = await completeAIChat(settings, aiMessages, requestController.signal)
      const assistantMessage: ChatMessage = {
        id: createId('message'),
        serialNumber: nextSerialNumber(nextMessages),
        role: 'assistant',
        content: response,
        createdAt: new Date().toISOString(),
      }
      const completedMessages = [...nextMessages, assistantMessage]

      setMessages(completedMessages)
      saveCurrentDecision(completedMessages)
      void notifyAIResponse('Anchor replied', response)
    } catch (requestError) {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') {
        return
      }

      setError(requestError instanceof Error ? requestError.message : 'Anchor could not reach that provider. Please check Settings and try again.')
    } finally {
      if (requestControllerRef.current === requestController) {
        requestControllerRef.current = undefined
        setIsThinking(false)
      }
    }
  }

  const handleAnalyze = (initialMessage = chatInput) => {
    if (!situation.trim()) {
      setError('Start with the situation that is asking for your attention.')
      return
    }

    void sendToAI(initialMessage.trim() || 'Help me think this through.')
  }

  const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!messages.length) {
      handleAnalyze(chatInput)
      return
    }

    void sendToAI(chatInput)
  }

  const clearChat = () => {
    requestControllerRef.current?.abort()
    requestControllerRef.current = undefined
    setIsThinking(false)
    setMessages([])
    setChatInput('')
    setCopiedMessageId(undefined)
    setError(undefined)
    if (activeDecisionId) {
      saveCurrentDecision([])
    }
  }

  const copyMessage = async (message: ChatMessage) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message.content)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = message.content
        textArea.setAttribute('readonly', '')
        textArea.style.position = 'fixed'
        textArea.style.opacity = '0'
        document.body.appendChild(textArea)
        try {
          textArea.select()
          if (!document.execCommand('copy')) {
            throw new Error('Clipboard access was not available.')
          }
        } finally {
          textArea.remove()
        }
      }
      setCopiedMessageId(message.id)
      window.setTimeout(() => {
        setCopiedMessageId((currentId) => currentId === message.id ? undefined : currentId)
      }, 1800)
    } catch {
      setError('Could not copy that message. Please select and copy it manually.')
    }
  }

  const importNoteInto = (note: Note, target: 'situation' | 'context') => {
    const noteBlock = `From note — ${note.title}\n${note.content.trim()}`
    if (target === 'situation') {
      setSituation((current) => current.includes(noteBlock)
        ? current
        : `${current.trim() ? `${current.trim()}\n\n` : ''}${noteBlock}`.slice(0, 1200))
    } else {
      setAdditionalContext((current) => current.includes(noteBlock)
        ? current
        : `${current.trim() ? `${current.trim()}\n\n` : ''}${noteBlock}`.slice(0, 1800))
    }
    setImportedNoteIds((current) => current.includes(note.id) ? current : [...current, note.id])
    setError(undefined)
  }

  const startNewDecision = () => {
    requestControllerRef.current?.abort()
    requestControllerRef.current = undefined
    setIsThinking(false)
    setBriefCollapsed(false)
    setActiveDecisionId(undefined)
    setActiveDecisionSerialNumber(undefined)
    setProjectId('')
    setProjectImported(false)
    setImportedNoteIds([])
    setDecisionTitle('')
    setSituation('')
    setAdditionalContext('')
    setMessages([])
    setChatInput('')
    setError(undefined)
  }

  const loadDecision = (decision: Decision) => {
    requestControllerRef.current?.abort()
    requestControllerRef.current = undefined
    setIsThinking(false)
    setBriefCollapsed(false)
    setActiveDecisionId(decision.id)
    setActiveDecisionSerialNumber(decision.serialNumber)
    setProjectId(decision.projectId ?? '')
    setProjectImported(Boolean(decision.projectId))
    setImportedNoteIds(decision.noteIds ?? [])
    setDecisionTitle(decision.title ?? '')
    setSituation(decision.situation)
    setAdditionalContext(decision.additionalContext)
    setMessages(decision.messages)
    setChatInput('')
    setError(undefined)
  }

  return (
    <div className="decision-view page-enter">
      <div className="page-heading decision-heading">
        <div>
          <p className="eyebrow">Decision room {activeDecisionId ? formatEntitySerial('D', activeDecisionSerialNumber) : 'not saved yet'}</p>
          <h1>Decision space, dear {displayName(name)}<span className="accent-dot">.</span></h1>
        </div>
        <button className="secondary-button" type="button" onClick={startNewDecision}>
          <RotateCcw size={16} />
          New decision
        </button>
      </div>

      <div className={`decision-layout ${briefCollapsed ? 'brief-collapsed' : ''}`}>
        <section className="decision-brief">
          <div className="decision-panel-heading">
            <span className="step-badge" aria-hidden="true"><WandSparkles size={17} /></span>
            <div>
              <p className="eyebrow">Set the scene</p>
              <h2>What is going on?</h2>
            </div>
            <span className="brief-rail-label">Setup</span>
            <button
              className="brief-collapse-toggle"
              type="button"
              aria-label={briefCollapsed ? 'Expand decision setup' : 'Collapse decision setup'}
              title={briefCollapsed ? 'Expand decision setup' : 'Collapse decision setup'}
              onClick={() => setBriefCollapsed((collapsed) => !collapsed)}
            >
              {briefCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>
          <p className="decision-panel-copy">You don&apos;t have to make it neat. Start where your mind is.</p>

          <label className="form-field decision-field">
            <span>Room name <em>optional · editable later</em></span>
            <input
              value={decisionTitle}
              onChange={(event) => setDecisionTitle(event.target.value)}
              placeholder="e.g. Should I take the new role?"
              maxLength={100}
            />
          </label>

          <label className="form-field decision-field">
            <span>Bring in a project <em>optional</em></span>
            <div className="decision-project-picker">
              <div className="select-wrap">
                <select
                  value={projectId}
                  onChange={(event) => {
                    setProjectId(event.target.value)
                    setProjectImported(false)
                  }}
                >
                  <option value="">No project — just me</option>
                  {projects.map((project) => (
                    <option value={project.id} key={project.id}>{formatEntitySerial('P', project.serialNumber)} · {project.name}</option>
                  ))}
                </select>
                <ChevronDown size={15} />
              </div>
              <button
                className={`import-project-button ${projectImported ? 'imported' : ''}`}
                type="button"
                disabled={!selectedProject}
                onClick={() => setProjectImported(true)}
              >
                {projectImported ? <Check size={14} /> : <Plus size={14} />}
                {projectImported ? 'Imported' : 'Import'}
              </button>
            </div>
          </label>

          {projectImported && selectedProject && (
            <div className="imported-context">
              <div className="imported-context-header">
                <span className={`mini-project-icon ${selectedProject.color}`}>
                  <ProjectIcon icon={selectedProject.icon} size={15} />
                </span>
                <div>
                  <strong>{selectedProject.name} is in the room.</strong>
                  <span>{projectAnchors.length} project anchor{projectAnchors.length === 1 ? '' : 's'} will guide the conversation.</span>
                </div>
              </div>
              {projectAnchors.length > 0 && (
                <div className="imported-anchor-list">
                  {projectAnchors.slice(0, 3).map((anchor) => (
                    <span key={anchor.id}><span className={`context-dot ${anchor.color}`} />{anchor.title}</span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="form-field decision-field">
            <div className="form-field-label-row">
              <label htmlFor="decision-situation">The situation</label>
              <div className="decision-field-actions">
                <NoteImportSelect notes={notes} target="situation" onImport={importNoteInto} />
                <button
                  className="field-clear-button"
                  type="button"
                  disabled={!situation.trim()}
                  onClick={() => {
                    setSituation('')
                    setError(undefined)
                  }}
                  aria-label="Clear situation"
                  title="Clear situation"
                >
                  <X size={12} /> Clear
                </button>
              </div>
            </div>
            <textarea
              id="decision-situation"
              className="decision-situation-input"
              value={situation}
              onChange={(event) => setSituation(event.target.value)}
              placeholder="What happened? What choice is in front of you?"
              rows={5}
              maxLength={1200}
            />
            <small>{situation.length}/1200</small>
          </div>
          <div className="form-field decision-field">
            <div className="form-field-label-row">
              <label htmlFor="decision-context">More context <em>optional</em></label>
              <div className="decision-field-actions">
                <NoteImportSelect notes={notes} target="context" onImport={importNoteInto} />
                <button
                  className="field-clear-button"
                  type="button"
                  disabled={!additionalContext.trim()}
                  onClick={() => {
                    setAdditionalContext('')
                    setError(undefined)
                  }}
                  aria-label="Clear more context"
                  title="Clear more context"
                >
                  <X size={12} /> Clear
                </button>
              </div>
            </div>
            <textarea
              id="decision-context"
              className="decision-context-input"
              value={additionalContext}
              onChange={(event) => setAdditionalContext(event.target.value)}
              placeholder="What have you tried? What are you worried might happen?"
              rows={4}
              maxLength={1800}
            />
            <small>{additionalContext.length}/1800</small>
          </div>

          <div className={`decision-connection-note ${connectionReady ? 'ready' : ''}`}>
            <span className="connection-dot" />
            <div>
              <strong>{connectionReady ? `Ready with ${provider?.name ?? 'your provider'}.` : 'One gentle setup step remains.'}</strong>
              <span>{connectionReady ? `Using ${settings.model}. Your context will be sent only when you ask.` : 'Connect an AI provider and model in Settings to receive a thorough analysis.'}</span>
            </div>
            {!connectionReady && (
              <button type="button" onClick={onOpenSettings}>Open Settings <ArrowUpRight size={13} /></button>
            )}
          </div>

          {error && (
            <div className="decision-error" role="alert">
              <CircleAlert size={15} />
              <span>{error}</span>
            </div>
          )}

          <button className="primary-button decision-submit" type="button" onClick={() => handleAnalyze()} disabled={!situation.trim() || isThinking}>
            {isThinking ? <RefreshCw className="spin" size={16} /> : <WandSparkles size={16} />}
            {isThinking ? 'Thinking with you…' : 'Think this through'}
          </button>

          {decisions.length > 0 && (
            <div className="decision-history">
              <div className="decision-history-heading">
                <span>Previous rooms</span>
                <small>{decisions.length}</small>
              </div>
              {decisions.slice(0, 4).map((decision) => (
                <div
                  className={`decision-history-item-wrap ${activeDecisionId === decision.id ? 'active' : ''}`}
                  key={decision.id}
                >
                  <button
                    className="decision-history-item"
                    type="button"
                    onClick={() => loadDecision(decision)}
                  >
                    <span className="history-orb"><MessageCircle size={13} /></span>
                    <span className="decision-history-copy">
                      <strong><span className="record-number">{formatEntitySerial('D', decision.serialNumber)}</span>{decisionPreview(decision)}</strong>
                      <small title={`Created ${formatTimestamp(decision.createdAt)} · Updated ${formatTimestamp(decision.updatedAt)}`}>
                        {formatUpdatedAt(decision.updatedAt)}
                      </small>
                    </span>
                  </button>
                  <button
                    className="decision-delete-btn"
                    type="button"
                    aria-label="Remove decision room"
                    title="Remove decision room"
                    onClick={(e) => {
                      e.stopPropagation()
                      if (activeDecisionId === decision.id) {
                        startNewDecision()
                      }
                      onDeleteDecision(decision.id)
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="decision-chat">
          <div className="chat-header">
            <div className="chat-title">
              <span className="chat-bot-mark"><Bot size={18} /></span>
              <div>
                <strong>Anchor companion</strong>
                <span>Not a verdict. A clearer view.</span>
              </div>
            </div>
            <div className="chat-header-actions">
              <button
                className="text-button chat-clear-button"
                type="button"
                onClick={clearChat}
                disabled={!messages.length && !isThinking}
              >
                <Trash2 size={14} /> Clear chat
              </button>
              <button className={`connection-pill ${connectionReady ? 'connected' : ''}`} type="button" onClick={onOpenSettings}>
                <span className="connection-pill-dot" />
                <span>{connectionReady ? `${provider?.name ?? 'AI'} · ${settings.model}` : 'Connect AI'}</span>
                <ChevronRight size={13} />
              </button>
            </div>
          </div>

          <div ref={chatMessagesRef} className="chat-messages" aria-live="polite">
            {messages.length === 0 ? (
              <div className="chat-welcome">
                <div className="chat-welcome-icon"><Bot size={22} /></div>
                <p className="eyebrow">A quiet place to think</p>
                <h2>Let&apos;s slow this down together.</h2>
                <p>Share the situation on the left, and I&apos;ll help you see the options, trade-offs, and possible paths without rushing you toward one.</p>
                <div className="chat-welcome-points">
                  <span>What matters most</span>
                  <span>What could happen</span>
                  <span>What to do next</span>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div className={`chat-message-row ${message.role}`} key={message.id}>
                  <span className="chat-message-avatar">
                    {message.role === 'assistant' ? <Bot size={15} /> : <UserRound size={15} />}
                  </span>
                  <div className="chat-message-bubble">
                    <button
                      className={`chat-copy-button ${copiedMessageId === message.id ? 'copied' : ''}`}
                      type="button"
                      onClick={() => void copyMessage(message)}
                      aria-label={copiedMessageId === message.id ? 'Message copied' : 'Copy message'}
                      title={copiedMessageId === message.id ? 'Copied' : 'Copy message'}
                    >
                      {copiedMessageId === message.id ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                    <span className="chat-message-label">{message.role === 'assistant' ? 'Anchor' : 'You'}</span>
                    <span className="chat-message-meta">
                      <span>{formatEntitySerial('M', message.serialNumber)}</span>
                      <time dateTime={message.createdAt} title={formatTimestamp(message.createdAt)}>{formatTimestamp(message.createdAt)}</time>
                    </span>
                    {message.role === 'assistant' ? <ChatRichText content={message.content} /> : <p>{message.content}</p>}
                  </div>
                </div>
              ))
            )}
            {isThinking && (
              <div className="chat-message-row assistant">
                <span className="chat-message-avatar"><Bot size={15} /></span>
                <div className="chat-message-bubble typing-bubble" aria-label="Anchor is thinking">
                  <span className="chat-message-label">Anchor is thinking</span>
                  <span className="typing-dots"><i /><i /><i /></span>
                </div>
              </div>
            )}
          </div>

          <form className="chat-composer" onSubmit={handleChatSubmit}>
            <textarea
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  event.currentTarget.form?.requestSubmit()
                }
              }}
              placeholder={messages.length ? 'Ask a follow-up or add what just came to mind…' : 'Your first message will be the situation above…'}
              rows={2}
              disabled={isThinking}
              aria-label="Message Anchor"
            />
            <div className="chat-composer-footer">
              <span><Sparkles size={13} /> {messages.length ? 'Keep exploring at your pace.' : 'Analysis stays grounded in what you share.'}</span>
              <span className="chat-shortcut">⌘ / Ctrl + Enter to send</span>
              <button className="send-button" type="submit" disabled={isThinking || (!chatInput.trim() && messages.length > 0)} aria-label="Send message">
                {isThinking ? <RefreshCw className="spin" size={16} /> : <Send size={16} />}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  )
}

interface NoteEditorProps {
  note?: Note
  onSave: (note: Note) => void
  onDelete: (noteId: string) => void
}

function NoteEditor({ note, onSave, onDelete }: NoteEditorProps) {
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [error, setError] = useState<string>()

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedContent = content.trim()

    if (!trimmedContent) {
      setError('Write something before saving this note.')
      return
    }

    const now = new Date().toISOString()
    const fallbackTitle = trimmedContent.split(/\r?\n/)[0]?.slice(0, 80) || 'Untitled note'

    onSave({
      id: note?.id ?? createId('note'),
      title: title.trim() || fallbackTitle,
      content: trimmedContent,
      createdAt: note?.createdAt ?? now,
      updatedAt: now,
    })
    setError(undefined)
  }

  return (
    <form className="note-editor-form" onSubmit={handleSubmit}>
      <div className="note-editor-heading">
        <div>
          <p className="eyebrow">{note ? 'Edit note' : 'New note'}</p>
          <h2>{title.trim() || 'A place to put it down'}</h2>
        </div>
        {note && (
          <EntityIdentity
            prefix="N"
            serialNumber={note.serialNumber}
            id={note.id}
            createdAt={note.createdAt}
            updatedAt={note.updatedAt}
            exact
          />
        )}
      </div>
      <label className="form-field" htmlFor="note-title">
        <span>Title <em>optional</em></span>
        <input
          id="note-title"
          value={title}
          onChange={(event) => {
            setTitle(event.target.value)
            setError(undefined)
          }}
          placeholder="Give this note a name"
          maxLength={120}
        />
      </label>
      <label className="form-field" htmlFor="note-content">
        <span>Note</span>
        <textarea
          id="note-content"
          value={content}
          onChange={(event) => {
            setContent(event.target.value)
            setError(undefined)
          }}
          placeholder="Write anything you want to remember…"
          rows={15}
          maxLength={12000}
          autoFocus={!note}
        />
        <small className="note-character-count">{content.length}/12000</small>
      </label>
      {error && <div className="settings-error" role="alert"><CircleAlert size={14} /> <span>{error}</span></div>}
      <div className="note-editor-footer">
        {note ? (
          <button
            className="text-button note-delete-button"
            type="button"
            onClick={() => {
              if (window.confirm('Delete this note? This cannot be undone.')) onDelete(note.id)
            }}
          >
            <Trash2 size={14} /> Delete note
          </button>
        ) : <span />}
        <button className="primary-button" type="submit">
          <Check size={15} /> Save note
        </button>
      </div>
    </form>
  )
}

interface NotesViewProps {
  notes: Note[]
  onSaveNote: (note: Note) => void
  onDeleteNote: (noteId: string) => void
}

function NotesView({ notes, onSaveNote, onDeleteNote }: NotesViewProps) {
  const [activeNoteId, setActiveNoteId] = useState<string | undefined>(notes[0]?.id)
  const [query, setQuery] = useState('')
  const sortedNotes = useMemo(
    () => [...notes].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt)),
    [notes],
  )
  const filteredNotes = sortedNotes.filter((note) => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return !normalizedQuery || `${note.title} ${note.content}`.toLocaleLowerCase().includes(normalizedQuery)
  })
  const activeNote = notes.find((note) => note.id === activeNoteId)

  return (
    <div className="notes-view page-enter">
      <div className="page-heading notes-heading">
        <div>
          <p className="eyebrow">A place for whatever is on your mind</p>
          <h1>Notes<span className="accent-dot">.</span></h1>
          <p className="page-subtitle">Keep quick thoughts, working material, lists, and anything you may want to bring into a decision later.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => setActiveNoteId(undefined)}>
          <Plus size={16} /> New note
        </button>
      </div>

      <div className="notes-layout">
        <aside className="notes-list-card">
          <div className="notes-list-heading">
            <div>
              <strong>Your notes</strong>
              <span>{notes.length} {notes.length === 1 ? 'note' : 'notes'}</span>
            </div>
            <NotebookPen size={17} />
          </div>
          <label className="notes-search">
            <Search size={15} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search notes"
              aria-label="Search notes"
            />
          </label>
          <div className="notes-list">
            {filteredNotes.length > 0 ? filteredNotes.map((note) => (
              <button
                className={`note-list-item ${activeNoteId === note.id ? 'active' : ''}`}
                type="button"
                key={note.id}
                title={`ID: ${note.id}`}
                onClick={() => setActiveNoteId(note.id)}
              >
                <span className="note-list-item-topline">
                  <strong><span className="record-number">{formatEntitySerial('N', note.serialNumber)}</span>{note.title}</strong>
                  <small title={`Updated ${formatTimestamp(note.updatedAt)}`}>{formatUpdatedAt(note.updatedAt)}</small>
                </span>
                <span>{note.content.replace(/\s+/g, ' ').trim()}</span>
              </button>
            )) : (
              <div className="notes-list-empty">
                <NotebookPen size={18} />
                <span>{notes.length ? 'No notes match that search.' : 'Your saved notes will appear here.'}</span>
              </div>
            )}
          </div>
        </aside>

        <section className="notes-editor-card">
          <NoteEditor
            key={activeNoteId ?? 'new-note'}
            note={activeNote}
            onSave={(note) => {
              onSaveNote(note)
              setActiveNoteId(note.id)
            }}
            onDelete={(noteId) => {
              onDeleteNote(noteId)
              setActiveNoteId(sortedNotes.find((note) => note.id !== noteId)?.id)
            }}
          />
        </section>
      </div>
    </div>
  )
}

interface SettingsViewProps {
  profile: UserProfile
  security: SecuritySettings
  settings: AISettings
  notificationSettings: NotificationSettings
  availableModels: AIModel[]
  modelsLoading: boolean
  modelsError?: string
  theme: Theme
  onThemeChange: (theme: Theme) => void
  onSettingsChange: (changes: Partial<AISettings>) => void
  onNotificationsChange: (changes: Partial<NotificationSettings>) => void
  onEnableNotifications: () => Promise<void>
  onSave: () => void
  onRefreshModels: () => void
  onReset: () => void
  onSaveProfile: (profile: UserProfile) => void
  onSavePin: (pin: string) => Promise<void>
  onRemovePin: () => void
  onLockNow: () => void
  onExportWorkspace: () => void
  onImportWorkspace: (file: File, mode: ImportMode) => Promise<string>
  updateInfo?: AppUpdateInfo
  checkingUpdates: boolean
  onCheckUpdates: () => void
  onOpenUpdateModal: () => void
  syncSettings: SyncSettings
  syncBusy: boolean
  onSaveSyncSettings: (settings: SyncSettings) => void
  onTriggerSync: () => Promise<void>
  onTestDropbox: (token: string, vaultName?: string) => Promise<string>
  relativeTimeNow: number
}

function SettingsView({
  profile,
  security,
  settings,
  notificationSettings,
  availableModels,
  modelsLoading,
  modelsError,
  theme,
  onThemeChange,
  onSettingsChange,
  onNotificationsChange,
  onEnableNotifications,
  onSave,
  onRefreshModels,
  onReset,
  onSaveProfile,
  onSavePin,
  onRemovePin,
  onLockNow,
  onExportWorkspace,
  onImportWorkspace,
  updateInfo,
  checkingUpdates,
  onCheckUpdates,
  onOpenUpdateModal,
  syncSettings,
  syncBusy,
  onSaveSyncSettings,
  onTriggerSync,
  onTestDropbox,
  relativeTimeNow,
}: SettingsViewProps) {
  const [showKey, setShowKey] = useState(false)
  const [profileName, setProfileName] = useState(profile.name)
  const [profileError, setProfileError] = useState<string>()
  const [profileSaved, setProfileSaved] = useState(false)
  const [pin, setPin] = useState('')
  const [pinConfirmation, setPinConfirmation] = useState('')
  const [pinError, setPinError] = useState<string>()
  const [pinSaved, setPinSaved] = useState(false)
  const [pinBusy, setPinBusy] = useState(false)
  const [pendingImport, setPendingImport] = useState<File>()
  const [dataBusy, setDataBusy] = useState(false)
  const [dataError, setDataError] = useState<string>()
  const [dataMessage, setDataMessage] = useState<string>()
  const [syncDraft, setSyncDraft] = useState<SyncSettings>(syncSettings)
  const [showSyncToken, setShowSyncToken] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string }>()
  const [testingDropbox, setTestingDropbox] = useState(false)
  const [revokingDropbox, setRevokingDropbox] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const provider = AI_PROVIDERS.find((item) => item.id === settings.providerId) ?? AI_PROVIDERS[0]
  const hasManagedDropboxApp = syncDraft.dropboxAppKey === DEFAULT_DROPBOX_APP_KEY
  const dropboxConnected = Boolean(
    syncDraft.dropboxAccessToken?.trim() ||
    syncDraft.dropboxRefreshToken?.trim() ||
    syncSettings.dropboxAccessToken?.trim() ||
    syncSettings.dropboxRefreshToken?.trim(),
  )
  const dropboxOAuthInProgress = testingDropbox && syncSettings.lastSyncStatus === 'syncing'

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = profileName.trim()

    if (!name) {
      setProfileError('Tell me what to call you before saving.')
      setProfileSaved(false)
      return
    }

    onSaveProfile({ name })
    setProfileName(name)
    setProfileError(undefined)
    setProfileSaved(true)
  }

  const chooseImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    setPendingImport(file)
    setDataError(undefined)
    setDataMessage(undefined)
  }

  const saveDevicePin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!isValidPin(pin)) {
      setPinError('A device PIN must be 4 to 6 digits.')
      setPinSaved(false)
      return
    }

    if (pin !== pinConfirmation) {
      setPinError('Those PINs do not match yet.')
      setPinSaved(false)
      return
    }

    setPinBusy(true)
    setPinError(undefined)

    try {
      await onSavePin(pin)
      setPin('')
      setPinConfirmation('')
      setPinSaved(true)
    } catch (pinSaveError) {
      setPinError(pinSaveError instanceof Error ? pinSaveError.message : 'The device PIN could not be saved.')
      setPinSaved(false)
    } finally {
      setPinBusy(false)
    }
  }

  const removeDevicePin = () => {
    onRemovePin()
    setPinSaved(false)
    setPinError(undefined)
  }

  const importFile = async (mode: ImportMode) => {
    if (!pendingImport) {
      return
    }

    setDataBusy(true)
    setDataError(undefined)
    setDataMessage(undefined)

    try {
      const message = await onImportWorkspace(pendingImport, mode)
      setDataMessage(message)
      setPendingImport(undefined)
      if (importInputRef.current) {
        importInputRef.current.value = ''
      }
    } catch (importError) {
      setDataError(importError instanceof Error ? importError.message : 'That backup could not be imported.')
    } finally {
      setDataBusy(false)
    }
  }
  const revokeDropbox = async () => {
    if (!dropboxConnected) {
      return
    }

    setRevokingDropbox(true)
    setTestResult(undefined)

    const revokeSettings: SyncSettings = {
      ...syncDraft,
      dropboxAccessToken: syncDraft.dropboxAccessToken || syncSettings.dropboxAccessToken,
      dropboxRefreshToken: syncDraft.dropboxRefreshToken || syncSettings.dropboxRefreshToken,
      dropboxTokenExpiresAt: syncDraft.dropboxTokenExpiresAt || syncSettings.dropboxTokenExpiresAt,
      dropboxAccountId: syncDraft.dropboxAccountId || syncSettings.dropboxAccountId,
    }

    try {
      await revokeDropboxAccess(revokeSettings)
      setTestResult({ success: true, message: 'Dropbox access revoked.' })
    } catch (revokeError) {
      setTestResult({
        success: false,
        message: `Local Dropbox credentials were cleared, but remote revocation could not be confirmed: ${revokeError instanceof Error ? revokeError.message : 'request failed.'}`,
      })
    } finally {
      const disconnected = normalizeSyncSettings({
        ...syncDraft,
        enabled: false,
        provider: 'dropbox',
        dropboxAccessToken: undefined,
        dropboxRefreshToken: undefined,
        dropboxTokenExpiresAt: undefined,
        dropboxAccountId: undefined,
        lastSyncedAt: undefined,
        lastSyncStatus: 'idle',
        lastSyncMessage: 'Dropbox access revoked.',
      })
      setSyncDraft(disconnected)
      onSaveSyncSettings(disconnected)
      setRevokingDropbox(false)
    }
  }

  const currentModelIsLoaded = availableModels.some((model) => model.id === settings.model)

  return (
    <div className="settings-view page-enter">
      <div className="page-heading settings-heading">
        <div>
          <p className="eyebrow">A space that works your way</p>
          <h1>Settings, dear {displayName(profile.name)}<span className="accent-dot">.</span></h1>
          <p className="page-subtitle">Choose how Anchor thinks with you, and make the room feel like yours.</p>
        </div>
      </div>

      <div className="settings-layout">
        <section className="settings-card profile-card">
          <div className="settings-card-heading compact">
            <span className="settings-card-icon profile"><UserRound size={18} /></span>
            <div>
              <p className="eyebrow">01 — This is your room</p>
              <h2>Personal space</h2>
            </div>
          </div>
          <form className="profile-form" onSubmit={saveProfile}>
            <div className="profile-preview">
              <span className="avatar">{profileInitial(profileName)}</span>
              <div><strong>{profileName.trim() || 'Your name'}</strong><span>Happy to have you here.</span></div>
            </div>
            <label className="form-field">
              <span>What should Anchor call you?</span>
              <input
                value={profileName}
                onChange={(event) => {
                  setProfileName(event.target.value)
                  setProfileError(undefined)
                  setProfileSaved(false)
                }}
                placeholder="Your name"
                autoComplete="name"
              />
            </label>
            {profileError && <div className="settings-error" role="alert"><CircleAlert size={14} /> <span>{profileError}</span></div>}
            <div className="profile-form-footer">
              {profileSaved && <span className="model-success"><Check size={13} /> Saved</span>}
              <button className="secondary-button" type="submit"><Check size={15} /> Save name</button>
            </div>
          </form>
        </section>

        <section className="settings-card appearance-card">
          <div className="settings-card-heading compact">
            <span className="settings-card-icon appearance"><Sun size={18} /></span>
            <div>
              <p className="eyebrow">02 — The atmosphere</p>
              <h2>Appearance</h2>
            </div>
          </div>
          <p className="settings-card-copy">A little light or a little night. Both are welcome here.</p>
          <div className="theme-choice" role="group" aria-label="Choose appearance">
            <button className={theme === 'light' ? 'selected' : ''} type="button" onClick={() => onThemeChange('light')}>
              <Sun size={15} /> Light
            </button>
            <button className={theme === 'dark' ? 'selected' : ''} type="button" onClick={() => onThemeChange('dark')}>
              <Moon size={15} /> Dark
            </button>
          </div>
        </section>

        <section className="settings-card security-card">
          <div className="settings-card-heading compact">
            <span className="settings-card-icon security"><KeyRound size={18} /></span>
            <div>
              <p className="eyebrow">03 — Optional device lock</p>
              <h2>{security.pinHash ? 'Change device PIN' : 'Set a device PIN'}</h2>
            </div>
          </div>
          <p className="settings-card-copy">A PIN keeps this local Anchor space private when you open it again. It is stored as a one-way digest and never sent anywhere.</p>
          <form className="pin-settings-form" onSubmit={saveDevicePin}>
            <label className="form-field">
              <span>{security.pinHash ? 'New PIN' : 'Device PIN'} <em>4–6 digits</em></span>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value.replace(/\D/g, '').slice(0, 6))
                  setPinError(undefined)
                  setPinSaved(false)
                }}
                placeholder="Enter a PIN"
                autoComplete="new-password"
              />
            </label>
            <label className="form-field">
              <span>Confirm PIN</span>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pinConfirmation}
                onChange={(event) => {
                  setPinConfirmation(event.target.value.replace(/\D/g, '').slice(0, 6))
                  setPinError(undefined)
                  setPinSaved(false)
                }}
                placeholder="Enter it again"
                autoComplete="new-password"
              />
            </label>
            {pinError && <div className="settings-error" role="alert"><CircleAlert size={14} /> <span>{pinError}</span></div>}
            <div className="pin-settings-footer">
              {pinSaved && <span className="model-success"><Check size={13} /> PIN saved</span>}
              <button className="primary-button" type="submit" disabled={pinBusy}>
                {pinBusy ? 'Saving…' : security.pinHash ? 'Change PIN' : 'Set PIN'}
              </button>
              {security.pinHash && (
                <>
                  <button className="secondary-button" type="button" onClick={onLockNow}>
                    <KeyRound size={14} /> Lock space now
                  </button>
                  <button className="text-button pin-remove" type="button" onClick={removeDevicePin}>
                    Remove PIN
                  </button>
                </>
              )}
            </div>
          </form>
        </section>

        <section className="settings-card ai-settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon ai"><SlidersHorizontal size={18} /></span>
            <div>
              <p className="eyebrow">04 — Decision companion</p>
              <h2>AI connection</h2>
              <span>Provider, model, endpoint, and account settings sync when cloud sync is enabled. Your API key stays on this device.</span>
            </div>
          </div>

          <div className="settings-form-grid">
            <label className="form-field">
              <span>Provider</span>
              <div className="select-wrap">
                <select
                  value={settings.providerId}
                  onChange={(event) => onSettingsChange({ providerId: event.target.value, model: '', baseUrl: '' })}
                >
                  {AI_PROVIDERS.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}
                </select>
                <ChevronDown size={15} />
              </div>
              <small className="field-help">{provider?.description}</small>
            </label>
            <label className="form-field">
              <span>{provider?.keyLabel ?? 'API key'}</span>
              <div className="secret-input-wrap">
                <KeyRound size={14} />
                <input
                  type={showKey ? 'text' : 'password'}
                  value={settings.apiKey}
                  onChange={(event) => onSettingsChange({ apiKey: event.target.value })}
                  placeholder="Paste your key here"
                  autoComplete="off"
                />
                <button type="button" onClick={() => setShowKey((visible) => !visible)}>{showKey ? 'Hide' : 'Show'}</button>
              </div>
            </label>
          </div>

          {provider?.requiresAccountId && (
            <label className="form-field">
              <span>Cloudflare account ID</span>
              <input
                value={settings.accountId}
                onChange={(event) => onSettingsChange({ accountId: event.target.value })}
                placeholder="The account that owns your Workers AI models"
              />
            </label>
          )}

          <label className="form-field">
            <span>Base URL <em>optional override</em></span>
            <input
              value={settings.baseUrl}
              onChange={(event) => onSettingsChange({ baseUrl: event.target.value })}
              placeholder={provider?.baseUrl || 'https://your-provider.example/v1'}
            />
            <small className="field-help">Default: {provider?.baseUrl || 'Add a custom OpenAI-compatible endpoint.'}</small>
          </label>

          <div className="model-field-heading">
            <div>
              <span>Model</span>
              <small>Fetched from {provider?.name ?? 'your provider'}</small>
            </div>
            <button className="refresh-models-button" type="button" onClick={onRefreshModels} disabled={modelsLoading}>
              <RefreshCw className={modelsLoading ? 'spin' : ''} size={14} />
              {modelsLoading ? 'Finding models…' : 'Refresh models'}
            </button>
          </div>
          <div className="model-picker-row">
            <div className="select-wrap model-select-wrap">
              <select
                value={currentModelIsLoaded ? settings.model : ''}
                onChange={(event) => onSettingsChange({ model: event.target.value })}
                disabled={availableModels.length === 0}
              >
                <option value="">{availableModels.length ? 'Choose a discovered model' : 'Refresh to discover models'}</option>
                {availableModels.map((model) => <option value={model.id} key={model.id}>{model.name}</option>)}
              </select>
              <ChevronDown size={15} />
            </div>
            <input
              className="manual-model-input"
              value={settings.model}
              onChange={(event) => onSettingsChange({ model: event.target.value })}
              placeholder="Or type a model ID"
              aria-label="Model ID"
            />
          </div>
          {modelsError && (
            <div className="settings-error" role="alert"><CircleAlert size={14} /> <span>{modelsError}</span></div>
          )}
          {availableModels.length > 0 && !modelsError && (
            <div className="model-success"><Check size={14} /> {availableModels.length} live model{availableModels.length === 1 ? '' : 's'} available. No model catalog is bundled into Anchor.</div>
          )}

          <div className="settings-actions">
            <button className="text-button reset-button" type="button" onClick={onReset}><RotateCcw size={14} /> Reset connection</button>
            <button className="primary-button" type="button" onClick={onSave}><Check size={16} /> Save and test connection</button>
          </div>
        </section>

        <section className="settings-card notifications-card">
          <div className="settings-card-heading compact">
            <span className="settings-card-icon notifications"><Bell size={18} /></span>
            <div>
              <p className="eyebrow">05 — Gentle nudges</p>
              <h2>Notifications</h2>
            </div>
          </div>
          <p className="settings-card-copy">Let Anchor bring back an AI response, a saved anchor, or a philosophical thought at a time you choose. Notifications are opt-in.</p>

          <label className="notification-toggle-row">
            <input
              type="checkbox"
              checked={notificationSettings.enabled}
              onChange={(event) => {
                if (event.target.checked) {
                  void onEnableNotifications()
                } else {
                  onNotificationsChange({ enabled: false })
                }
              }}
            />
            <span className="sync-toggle-track" aria-hidden="true" />
            <span>
              <strong>{notificationSettings.enabled ? 'Notifications are on' : 'Notifications are off'}</strong>
              <small>{notificationSettings.enabled ? 'Anchor can notify you on this device.' : 'Turn them on when you want a gentle reminder.'}</small>
            </span>
          </label>

          <div className="notification-options-grid">
            <label className="notification-check-row">
              <input
                type="checkbox"
                checked={notificationSettings.aiResponses}
                disabled={!notificationSettings.enabled}
                onChange={(event) => onNotificationsChange({ aiResponses: event.target.checked })}
              />
              <span><strong>AI responses</strong><small>Notify me when Anchor finishes thinking.</small></span>
            </label>
            <label className="notification-check-row">
              <input
                type="checkbox"
                checked={notificationSettings.anchorReminders}
                disabled={!notificationSettings.enabled}
                onChange={(event) => onNotificationsChange({ anchorReminders: event.target.checked })}
              />
              <span><strong>Saved anchors</strong><small>Bring back a pinned reminder.</small></span>
            </label>
            <label className="notification-check-row">
              <input
                type="checkbox"
                checked={notificationSettings.thoughtReminders}
                disabled={!notificationSettings.enabled}
                onChange={(event) => onNotificationsChange({ thoughtReminders: event.target.checked })}
              />
              <span><strong>Daily thoughts</strong><small>Include a philosophical thought.</small></span>
            </label>
          </div>

          <div className="notification-schedule-grid">
            <label className="form-field">
              <span>Reminder frequency</span>
              <div className="select-wrap">
                <select
                  value={notificationSettings.frequency}
                  disabled={!notificationSettings.enabled}
                  onChange={(event) => onNotificationsChange({ frequency: event.target.value as NotificationSettings['frequency'] })}
                >
                  <option value="off">No scheduled reminders</option>
                  <option value="hourly">Every hour</option>
                  <option value="daily">Every day</option>
                  <option value="weekdays">Weekdays</option>
                  <option value="weekly">Every week</option>
                </select>
                <ChevronDown size={15} />
              </div>
            </label>
            <label className="form-field">
              <span>Time</span>
              <input
                type="time"
                value={notificationSettings.time}
                disabled={!notificationSettings.enabled || notificationSettings.frequency === 'off'}
                onChange={(event) => onNotificationsChange({ time: event.target.value })}
              />
            </label>
            {notificationSettings.frequency === 'weekly' && (
              <label className="form-field">
                <span>Day</span>
                <div className="select-wrap">
                  <select
                    value={notificationSettings.weekday}
                    disabled={!notificationSettings.enabled}
                    onChange={(event) => onNotificationsChange({ weekday: Number(event.target.value) })}
                  >
                    {notificationWeekdays.map((day) => <option value={day.value} key={day.value}>{day.label}</option>)}
                  </select>
                  <ChevronDown size={15} />
                </div>
              </label>
            )}
          </div>

          <div className="notification-settings-footer">
            <button className="secondary-button" type="button" onClick={() => void onEnableNotifications()}>
              <Bell size={15} /> {notificationSettings.enabled ? 'Send test notification' : 'Enable notifications'}
            </button>
            <span>{isNativeApp() && getAppPlatform() === 'android' ? 'Android can deliver scheduled reminders while Anchor is closed.' : 'Web and desktop reminders run while Anchor is open.'}</span>
          </div>
        </section>

        <section className="settings-card data-card">
          <div className="settings-card-heading compact">
            <span className="settings-card-icon data"><Download size={18} /></span>
            <div>
              <p className="eyebrow">08 — Keep your context close</p>
              <h2>Workspace data</h2>
            </div>
          </div>
          <p className="settings-card-copy">Export your workspace and safe preferences as a portable JSON backup. API keys, cloud credentials, and your device PIN are never included.</p>
          <input
            ref={importInputRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={chooseImportFile}
          />
          <div className="data-actions">
            <button className="secondary-button" type="button" onClick={onExportWorkspace}>
              <Download size={15} /> Export workspace
            </button>
            <button className="text-button" type="button" onClick={() => importInputRef.current?.click()} disabled={dataBusy}>
              <Upload size={15} /> Import backup
            </button>
          </div>
          {pendingImport && (
            <div className="import-staging">
              <strong>{pendingImport.name}</strong>
              <span>Choose whether to add it or replace this workspace.</span>
              <div className="import-staging-actions">
                <button className="text-button" type="button" onClick={() => void importFile('merge')} disabled={dataBusy}>
                  Merge into current
                </button>
                <button className="primary-button" type="button" onClick={() => void importFile('replace')} disabled={dataBusy}>
                  Replace workspace
                </button>
              </div>
            </div>
          )}
          {dataError && <div className="settings-error" role="alert"><CircleAlert size={14} /> <span>{dataError}</span></div>}
          {dataMessage && <div className="model-success"><Check size={14} /> {dataMessage}</div>}
        </section>

        <section className="settings-card updates-card">
          <div className="settings-card-heading compact">
            <span className="settings-card-icon updates"><Sparkles size={18} /></span>
            <div>
              <p className="eyebrow">06 — Always getting steadier</p>
              <h2>App updates &amp; about</h2>
            </div>
          </div>
          <p className="settings-card-copy">
            Anchor is built local-first. Updates deliver quiet polish, performance, and companion resilience.
          </p>
          <div className="update-status-row">
            <div className="update-platform-badge">
              <strong>v{CURRENT_APP_VERSION}</strong>
              <span>
                {isNativeApp() ? (getAppPlatform() === 'android' ? 'Android shell' : 'Desktop shell') : 'Web frontend'}
              </span>
            </div>
            <div className="update-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={onCheckUpdates}
                disabled={checkingUpdates}
              >
                <RefreshCw className={checkingUpdates ? 'spin' : ''} size={14} />
                {checkingUpdates ? 'Checking…' : 'Check for updates'}
              </button>
              {updateInfo?.isAvailable && (
                <button
                  className="primary-button"
                  type="button"
                  onClick={onOpenUpdateModal}
                >
                  <Download size={15} />
                  Update to v{updateInfo.latestVersion}
                </button>
              )}
            </div>
          </div>
          {updateInfo?.isAvailable ? (
            <div className="model-success">
              <Sparkles size={14} /> New version <strong>v{updateInfo.latestVersion}</strong> is ready for your {updateInfo.platform}.
            </div>
          ) : (
            <div className="update-uptodate-note">
              <Check size={14} /> You are on the latest version (v{CURRENT_APP_VERSION}).
            </div>
          )}
        </section>

        <section className="settings-card sync-card">
          <div className="settings-card-heading compact">
            <span className="settings-card-icon sync"><Cloud size={18} /></span>
            <div>
              <p className="eyebrow">07 — Shared across all your devices</p>
              <h2>Cloud sync</h2>
            </div>
          </div>
          <p className="settings-card-copy">
            Sync seamlessly between openSUSE Tumbleweed, Windows, macOS, Android phones, and tablets using Dropbox or WebDAV.
          </p>

          <form
            className="settings-form-grid"
            onSubmit={(e) => {
              e.preventDefault()
              onSaveSyncSettings(syncDraft)
            }}
          >
            <div className="form-field">
              <label htmlFor="sync-provider-select">Storage provider</label>
              <select
                id="sync-provider-select"
                value={syncDraft.provider}
                disabled={dropboxConnected}
                onChange={(e) => {
                  const provider = e.target.value as SyncProviderType
                  setSyncDraft((prev) => ({
                    ...prev,
                    provider,
                    enabled: provider !== 'none',
                  }))
                }}
              >
                <option value="none">Disabled (Local only)</option>
                <option value="dropbox">Dropbox (Recommended)</option>
                <option value="webdav">WebDAV (Nextcloud / ownCloud / Fastmail / Synology)</option>
              </select>
              <small className="field-help">
                {dropboxConnected
                  ? 'Locked while Dropbox is connected. Revoke Dropbox access before changing the storage provider.'
                  : 'Your workspace, profile, appearance, and safe AI preferences sync to the same remote vault. Secrets stay on each device.'}
              </small>
            </div>

            {syncDraft.provider !== 'none' && (
              <>
                <div className="form-field">
                  <label htmlFor="sync-vault-name">Vault name</label>
                  <input
                    id="sync-vault-name"
                    type="text"
                    value={syncDraft.vaultName}
                    onChange={(e) => setSyncDraft((prev) => ({ ...prev, vaultName: e.target.value }))}
                    placeholder="anchor-vault"
                    disabled={dropboxConnected}
                    required
                  />
                  <small className="field-help">
                    {dropboxConnected
                      ? 'Locked while Dropbox is connected to prevent writing to a different vault. Revoke access before changing it.'
                      : 'Use the exact same vault name on your PCs, laptops, phones, and tablets so they share the same data.'}
                  </small>
                </div>

                {syncDraft.provider === 'dropbox' && (
                  <>
                    <div className={`dropbox-oauth-card ${dropboxConnected ? 'connected' : ''}`} role="status" aria-live="polite">
                      <div className="dropbox-oauth-copy">
                        <strong>{dropboxConnected ? 'Dropbox connected' : 'Connect with Dropbox'}</strong>
                        <span>
                          {dropboxConnected
                            ? <>This device is authorized for the <strong>/{syncDraft.vaultName || DEFAULT_VAULT_NAME}</strong> vault. You can revoke Dropbox access at any time.</>
                            : <>One secure authorization connects this device. Anchor will create <strong>/{syncDraft.vaultName || DEFAULT_VAULT_NAME}</strong> inside the Dropbox app folder automatically.</>}
                        </span>
                        {dropboxConnected && syncSettings.lastSyncStatus === 'error' && syncSettings.lastSyncMessage && (
                          <small className="dropbox-connection-warning">{syncSettings.lastSyncMessage}</small>
                        )}
                      </div>
                      {dropboxConnected ? (
                        <button
                          className="secondary-button dropbox-revoke-btn"
                          type="button"
                          disabled={revokingDropbox || testingDropbox}
                          onClick={() => void revokeDropbox()}
                        >
                          <ShieldCheck size={15} />
                          {revokingDropbox ? 'Revoking access…' : 'Revoke Dropbox access'}
                        </button>
                      ) : (
                        <button
                          className="primary-button dropbox-authorize-btn"
                          type="button"
                          disabled={dropboxOAuthInProgress || revokingDropbox}
                          onClick={() => {
                            const appKey = syncDraft.dropboxAppKey?.trim() || DEFAULT_DROPBOX_APP_KEY
                            onSaveSyncSettings(normalizeSyncSettings({
                              ...syncDraft,
                              enabled: false,
                              provider: 'dropbox',
                              dropboxAppKey: appKey,
                              lastSyncStatus: 'syncing',
                              lastSyncMessage: 'Dropbox authorization started. Finish sign-in in the Dropbox window…',
                            }))
                            setTestingDropbox(true)
                            setTestResult(undefined)
                            void startDropboxOAuth(appKey, false)
                              .catch((err) => {
                                setTestResult({
                                  success: false,
                                  message: err instanceof Error ? err.message : 'Could not open Dropbox authorization.',
                                })
                                setTestingDropbox(false)
                              })
                          }}
                        >
                          <Cloud size={16} />
                          {dropboxOAuthInProgress ? 'Opening Dropbox…' : 'Connect Dropbox'}
                        </button>
                      )}
                    </div>

                    {hasManagedDropboxApp ? (
                      <div className="sync-note-muted">
                        Dropbox is already configured for Anchor. You do not need to enter an App Key, Access Token, or extra sync password; Dropbox creates the authorization during sign-in and Anchor keeps the credentials on this device.
                      </div>
                    ) : (
                      <div className="form-field">
                        <label htmlFor="dropbox-app-key">Dropbox App Key (Client ID)</label>
                        <input
                          id="dropbox-app-key"
                          type="text"
                          value={syncDraft.dropboxAppKey ?? ''}
                          onChange={(e) => setSyncDraft((prev) => ({ ...prev, dropboxAppKey: e.target.value }))}
                          placeholder="Paste your Dropbox App Key"
                          spellCheck={false}
                        />
                        <small className="field-help">
                          This self-hosted build needs the public App Key from{' '}
                          <a href="https://www.dropbox.com/developers/apps" target="_blank" rel="noopener noreferrer">
                            dropbox.com/developers/apps <ArrowUpRight size={12} style={{ display: 'inline', verticalAlign: 'middle' }} />
                          </a>.
                        </small>
                      </div>
                    )}

                    {!hasManagedDropboxApp && (
                      <details className="advanced-sync-details">
                        <summary>Manual access token (legacy / self-hosted)</summary>
                        <div className="advanced-sync-content">
                          <div className="form-field">
                            <div className="field-label-row">
                              <label htmlFor="dropbox-token">Dropbox Access Token</label>
                              <button
                                className="field-action-button"
                                type="button"
                                onClick={() => setShowSyncToken((prev) => !prev)}
                              >
                                {showSyncToken ? 'Hide token' : 'Show token'}
                              </button>
                            </div>
                            <input
                              id="dropbox-token"
                              type={showSyncToken ? 'text' : 'password'}
                              value={syncDraft.dropboxAccessToken ?? ''}
                              onChange={(e) => setSyncDraft((prev) => ({ ...prev, dropboxAccessToken: e.target.value }))}
                              placeholder="sl.u.AF..."
                              autoComplete="off"
                              spellCheck={false}
                            />
                            <small className="field-help">Prefer Connect Dropbox above. Manually generated tokens are only a fallback and may expire.</small>
                          </div>
                          <div className="dropbox-test-row">
                            <button
                              className="secondary-button"
                              type="button"
                              disabled={testingDropbox || !syncDraft.dropboxAccessToken?.trim()}
                              onClick={async () => {
                                if (!syncDraft.dropboxAccessToken?.trim()) return
                                setTestingDropbox(true)
                                setTestResult(undefined)
                                try {
                                  const msg = await onTestDropbox(syncDraft.dropboxAccessToken, syncDraft.vaultName)
                                  setTestResult({ success: true, message: msg })
                                } catch (err) {
                                  const msg = err instanceof Error ? err.message : 'Connection failed.'
                                  setTestResult({ success: false, message: msg })
                                } finally {
                                  setTestingDropbox(false)
                                }
                              }}
                            >
                              <RefreshCw className={testingDropbox ? 'spin' : ''} size={14} />
                              {testingDropbox ? 'Testing…' : 'Test Dropbox connection'}
                            </button>
                          </div>
                        </div>
                      </details>
                    )}

                    {testResult && (
                      <div className={testResult.success ? 'model-success' : 'settings-error'}>
                        {testResult.success ? <Check size={14} /> : <CircleAlert size={14} />}
                        <span>{testResult.message}</span>
                      </div>
                    )}
                  </>
                )}

                {syncDraft.provider === 'webdav' && (
                  <>
                    <div className="form-field">
                      <label htmlFor="webdav-url">WebDAV server URL</label>
                      <input
                        id="webdav-url"
                        type="url"
                        value={syncDraft.webdavUrl ?? ''}
                        onChange={(e) => setSyncDraft((prev) => ({ ...prev, webdavUrl: e.target.value }))}
                        placeholder="https://your-nextcloud.com/remote.php/webdav/"
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-field">
                        <label htmlFor="webdav-username">Username</label>
                        <input
                          id="webdav-username"
                          type="text"
                          value={syncDraft.webdavUsername ?? ''}
                          onChange={(e) => setSyncDraft((prev) => ({ ...prev, webdavUsername: e.target.value }))}
                        />
                      </div>
                      <div className="form-field">
                        <label htmlFor="webdav-password">Password / App password</label>
                        <input
                          id="webdav-password"
                          type="password"
                          value={syncDraft.webdavPassword ?? ''}
                          onChange={(e) => setSyncDraft((prev) => ({ ...prev, webdavPassword: e.target.value }))}
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="sync-interval-select">Auto-sync interval</label>
                    <select
                      id="sync-interval-select"
                      value={syncDraft.autoSyncIntervalMinutes}
                      onChange={(e) => setSyncDraft((prev) => ({ ...prev, autoSyncIntervalMinutes: Number(e.target.value) }))}
                    >
                      <option value="0">Manual sync only</option>
                      <option value="5">Every 5 minutes</option>
                      <option value="15">Every 15 minutes</option>
                      <option value="30">Every 30 minutes</option>
                      <option value="60">Every 1 hour</option>
                    </select>
                  </div>
                  <div className="form-field sync-auto-field">
                    <span>Startup behavior</span>
                    <label className="sync-toggle">
                      <input
                        type="checkbox"
                        checked={syncDraft.autoSyncOnStartup}
                        onChange={(e) => setSyncDraft((prev) => ({ ...prev, autoSyncOnStartup: e.target.checked }))}
                        aria-label="Auto-sync when Anchor opens"
                      />
                      <span className="sync-toggle-track" aria-hidden="true" />
                      <span className="sync-toggle-copy">
                        <strong>Auto-sync when Anchor opens</strong>
                        <small>{syncDraft.autoSyncOnStartup ? 'Enabled' : 'Off'}</small>
                      </span>
                    </label>
                  </div>
                </div>

                <div className="sync-status-footer">
                  <div className="sync-status-info">
                    <strong>
                      {syncSettings.lastSyncStatus === 'success' && '✓ Synced'}
                      {syncSettings.lastSyncStatus === 'error' && '⚠ Sync error'}
                      {syncSettings.lastSyncStatus === 'syncing' && 'Syncing…'}
                      {(!syncSettings.lastSyncStatus || syncSettings.lastSyncStatus === 'idle') && 'Ready to sync'}
                    </strong>
                    <span>
                      {syncSettings.lastSyncedAt
                        ? `Last synced: ${formatUpdatedAt(syncSettings.lastSyncedAt, relativeTimeNow)}`
                        : 'Never synced'}
                      {syncSettings.lastSyncMessage ? ` · ${syncSettings.lastSyncMessage}` : ''}
                    </span>
                  </div>
                  <div className="sync-footer-actions">
                    <button
                      className="primary-button"
                      type="button"
                      onClick={onTriggerSync}
                      disabled={syncBusy || (syncDraft.provider === 'dropbox' && !dropboxConnected)}
                    >
                      <RefreshCw className={syncBusy ? 'spin' : ''} size={15} />
                      {syncBusy ? 'Syncing…' : dropboxConnected || syncDraft.provider !== 'dropbox' ? 'Sync now' : 'Connect Dropbox first'}
                    </button>
                    <button className="secondary-button" type="submit">
                      Save sync settings
                    </button>
                  </div>
                </div>
              </>
            )}

            {syncDraft.provider === 'none' && (
              <div className="form-actions">
                <button className="secondary-button" type="submit">
                  Save settings
                </button>
              </div>
            )}
          </form>
        </section>
      </div>
    </div>
  )
}

interface ProjectsViewProps {
  projects: Project[]
  anchors: Anchor[]
  decisions: Decision[]
  notes: Note[]
  settings: AISettings
  onOpenSettings: () => void
  onOpenProject: (projectId: string) => void
  onAddProject: () => void
  onEditProject: (project: Project) => void
}

function ProjectsView({
  projects,
  anchors,
  decisions,
  notes,
  settings,
  onOpenSettings,
  onOpenProject,
  onAddProject,
  onEditProject,
}: ProjectsViewProps) {
  return (
    <div className="projects-view page-enter">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Context with a home</p>
          <h1>Your projects</h1>
          <p className="page-subtitle">Give each part of your life the reminders it needs.</p>
        </div>
        <button className="primary-button" type="button" onClick={onAddProject}>
          <Plus size={17} />
          New project
        </button>
      </div>

      <div className="project-intro-card">
        <div className="intro-symbol">
          <FolderOpen size={21} />
        </div>
        <div>
          <strong>Projects hold the context that changes.</strong>
          <p>Keep your universal principles global, and give each project its own little compass.</p>
        </div>
        <div className="intro-count">
          <strong>{projects.length}</strong>
          <span>spaces</span>
        </div>
      </div>

      <AIInsightCard
        className="projects-ai-card"
        eyebrow="A clear view of your projects"
        title="Let Anchor help you choose what matters"
        description="Ask for patterns across your spaces, a sensible priority, or a plan that respects your actual capacity."
        context={buildWorkspaceAIContext(anchors, projects, decisions, notes)}
        prompts={[
          { label: 'What deserves attention?', prompt: 'Looking across my projects, what deserves attention first and why?' },
          { label: 'Find the common thread', prompt: 'What common themes or conflicts connect my projects and anchors?' },
          { label: 'Plan a gentle week', prompt: 'Suggest a simple weekly focus across these projects without overloading me.' },
        ]}
        settings={settings}
        onOpenSettings={onOpenSettings}
      />

      <div className="projects-grid">
        {projects.map((project) => (
          <ProjectCard
            project={project}
            anchorCount={getProjectAnchorCount(anchors, project.id)}
            key={project.id}
            onClick={() => onOpenProject(project.id)}
            onEdit={() => onEditProject(project)}
          />
        ))}
        <button className="new-project-card" type="button" onClick={onAddProject}>
          <span className="new-project-plus">
            <Plus size={21} />
          </span>
          <strong>Start a new project</strong>
          <span>Give a new focus somewhere to land.</span>
        </button>
      </div>
    </div>
  )
}

interface ProjectCardProps {
  project: Project
  anchorCount: number
  onClick: () => void
  onEdit?: () => void
}

function ProjectCard({ project, anchorCount, onClick, onEdit }: ProjectCardProps) {
  return (
    <article className={`project-card card-${project.color}`}>
      <div className="project-card-top">
        <span className={`large-project-icon ${project.color}`}>
          <ProjectIcon icon={project.icon} size={21} />
        </span>
        <div className="project-card-actions">
          <span className="project-card-arrow" aria-hidden="true">
            <ArrowUpRight size={17} />
          </span>
          {onEdit && (
            <button className="project-card-edit" type="button" onClick={onEdit} aria-label={`Edit ${project.name}`} title="Edit project">
              <PenLine size={14} />
            </button>
          )}
        </div>
      </div>
      <button className="project-card-open" type="button" onClick={onClick} aria-label={`Open ${formatEntitySerial('P', project.serialNumber)} ${project.name}`}>
        <div className="project-card-copy">
          <h2>{project.name}</h2>
          <p>{project.description}</p>
        </div>
        <div className="project-card-footer">
          <span>{anchorCount} {anchorCount === 1 ? 'anchor' : 'anchors'}</span>
          <span>Open space</span>
        </div>
      </button>
      <div className="project-card-identity">
        <EntityIdentity
          prefix="P"
          serialNumber={project.serialNumber}
          id={project.id}
          createdAt={project.createdAt}
          updatedAt={project.updatedAt || project.createdAt}
          compact
        />
      </div>
    </article>
  )
}

interface ProjectViewProps {
  project: Project
  anchors: Anchor[]
  decisions: Decision[]
  notes: Note[]
  settings: AISettings
  onOpenSettings: () => void
  onBack: () => void
  onAddAnchor: () => void
  onEditAnchor: (anchor: Anchor) => void
  onOpenAnchor: (anchor: Anchor) => void
  onEditProject: () => void
  onTogglePinned: (anchorId: string) => void
  onAskAnchor: (anchor: Anchor) => void
}

function ProjectView({
  project,
  anchors,
  decisions,
  notes,
  settings,
  onOpenSettings,
  onBack,
  onAddAnchor,
  onEditAnchor,
  onOpenAnchor,
  onEditProject,
  onTogglePinned,
  onAskAnchor,
}: ProjectViewProps) {
  const projectAnchors = anchors.filter((anchor) => anchor.projectId === project.id)
  const pinnedCount = projectAnchors.filter((anchor) => anchor.pinned).length

  return (
    <div className="project-view page-enter">
      <button className="back-button" type="button" onClick={onBack}>
        <ArrowLeft size={16} />
        All projects
      </button>
      <div className={`project-hero project-hero-${project.color}`}>
        <div className="project-hero-pattern" />
        <div className="project-hero-content">
          <div className="project-hero-icon">
            <ProjectIcon icon={project.icon} size={24} />
          </div>
          <div>
            <p className="eyebrow light-eyebrow">Project context</p>
            <h1>{project.name}</h1>
            <p>{project.description}</p>
          </div>
        </div>
      </div>

      <div className="project-summary-row">
        <div>
          <span className="summary-number">{projectAnchors.length}</span>
          <span className="summary-label">anchors in this space</span>
        </div>
        <div>
          <span className="summary-number">{pinnedCount}</span>
          <span className="summary-label">kept close</span>
        </div>
        <div className="project-identity-summary">
          <EntityIdentity
            prefix="P"
            serialNumber={project.serialNumber}
            id={project.id}
            createdAt={project.createdAt}
            updatedAt={project.updatedAt || project.createdAt}
            exact
          />
        </div>
        <div className="project-actions-group">
          <button className="secondary-button" type="button" onClick={onEditProject}>
            <PenLine size={15} />
            Edit space
          </button>
          <button className="primary-button" type="button" onClick={onAddAnchor}>
            <Plus size={16} />
            Add context
          </button>
        </div>
      </div>

      <AIInsightCard
        className="project-ai-card"
        eyebrow="A smarter project space"
        title="Let Anchor help you move this forward"
        description="Use the context already in this project to find the next useful step, expose a gap, or make a calmer plan."
        context={buildProjectAIContext(project, anchors, decisions, notes)}
        prompts={[
          { label: 'Find the next step', prompt: 'What is the smallest meaningful next step for this project?' },
          { label: 'Find a gap', prompt: 'What important context or question is missing from this project?' },
          { label: 'Make a simple plan', prompt: 'Turn these anchors into a realistic plan for the next seven days.' },
        ]}
        settings={settings}
        onOpenSettings={onOpenSettings}
      />

      <div className="section-heading project-section-heading">
        <div>
          <p className="eyebrow">The things worth returning to</p>
          <h2>Project anchors</h2>
        </div>
      </div>
      {projectAnchors.length > 0 ? (
        <div className="anchor-grid">
          {projectAnchors.map((anchor) => (
            <AnchorListItem
              anchor={anchor}
              projects={[project]}
              key={anchor.id}
              onTogglePinned={onTogglePinned}
              onEdit={onEditAnchor}
              onOpen={onOpenAnchor}
              onAskAI={onAskAnchor}
            />
          ))}
        </div>
      ) : (
        <div className="empty-panel project-empty">
          <div className="empty-panel-icon">
            <CirclePlus size={21} />
          </div>
          <h2>Give this project a north star</h2>
          <p>Add the reminder you want to be able to return to when things get noisy.</p>
          <button className="secondary-button" type="button" onClick={onAddAnchor}>
            <Plus size={16} />
            Add project context
          </button>
        </div>
      )}
    </div>
  )
}

interface EmptyStateProps {
  title: string
  actionLabel: string
  onAction: () => void
}

function EmptyState({ title, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="inline-empty">
      <p>{title}</p>
      <button className="remember-button" type="button" onClick={onAction}>
        <Plus size={15} />
        {actionLabel}
      </button>
    </div>
  )
}

interface ModalProps {
  title: string
  eyebrow: string
  children: React.ReactNode
  onClose: () => void
}

function Modal({ title, eyebrow, children, onClose }: ModalProps) {
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h2 id="modal-title">{title}</h2>
          </div>
          <button className="icon-button modal-close" type="button" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

interface AnchorComposerProps {
  projects: Project[]
  defaultProjectId?: string
  settings: AISettings
  onOpenSettings: () => void
  onClose: () => void
  onSubmit: (formData: AnchorFormData) => void
}

function AnchorComposer({
  projects,
  defaultProjectId,
  settings,
  onOpenSettings,
  onClose,
  onSubmit,
}: AnchorComposerProps) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tag, setTag] = useState('')
  const [scope, setScope] = useState<AnchorScope>(defaultProjectId ? 'project' : 'global')
  const [projectId, setProjectId] = useState(defaultProjectId ?? projects[0]?.id ?? '')
  const [color, setColor] = useState<AccentColor>('coral')
  const [pinned, setPinned] = useState(true)
  const [evidenceLabel, setEvidenceLabel] = useState('')
  const [evidenceUrl, setEvidenceUrl] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!title.trim() || (scope === 'project' && !projectId)) {
      return
    }

    const evidence =
      evidenceLabel.trim() && evidenceUrl.trim()
        ? { label: evidenceLabel.trim(), url: evidenceUrl.trim() }
        : undefined

    onSubmit({
      title: title.trim(),
      body: body.trim(),
      tag: tag.trim() || (scope === 'global' ? 'Personal' : 'Project note'),
      scope,
      projectId: scope === 'project' ? projectId : undefined,
      color,
      pinned,
      evidence,
    })
  }

  return (
    <Modal eyebrow="Make it stay" title="New anchor" onClose={onClose}>
      <form className="composer-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>What do you want to remember?</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Patience is part of the strategy."
          />
        </label>
        <label className="form-field">
          <span>More context <em>optional</em></span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Add context if it helps you return to this later."
            rows={4}
          />
        </label>
        <AIWriterButton
          settings={settings}
          onOpenSettings={onOpenSettings}
          label="Draft with AI"
          disabled={!title.trim() && !body.trim()}
          prompt={`Turn this rough thought into a useful Anchor reminder. Preserve the person’s meaning, make the title memorable, and add context only when it is useful without inventing facts. Return only JSON with exactly these keys: title, body, tag. Context is optional; do not shorten or omit meaningful details.\n\nROUGH TITLE\n${title || '(empty)'}\n\nROUGH CONTEXT\n${body || '(none — context is optional)'}\n\nCURRENT TAG\n${tag || '(empty)'}`}
          onResult={(response) => {
            const draft = parseAnchorDraft(response)
            setTitle(draft.title)
            setBody(draft.body)
            if (draft.tag) setTag(draft.tag)
          }}
        />
        <div className="form-row">
          <fieldset className="form-field scope-field">
            <legend>Keep this in</legend>
            <div className="scope-toggle">
              <button
                className={scope === 'global' ? 'selected' : ''}
                type="button"
                onClick={() => setScope('global')}
              >
                <Compass size={14} /> Everywhere
              </button>
              <button
                className={scope === 'project' ? 'selected' : ''}
                type="button"
                onClick={() => setScope('project')}
              >
                <FolderOpen size={14} /> A project
              </button>
            </div>
          </fieldset>
          <label className="form-field">
            <span>Project</span>
            <div className="select-wrap">
              <select
                value={projectId}
                disabled={scope === 'global' || projects.length === 0}
                onChange={(event) => setProjectId(event.target.value)}
              >
                {projects.length === 0 && <option value="">Create a project first</option>}
                {projects.map((project) => (
                  <option value={project.id} key={project.id}>
                    {formatEntitySerial('P', project.serialNumber)} · {project.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} />
            </div>
          </label>
        </div>
        <div className="form-row form-row-bottom">
          <label className="form-field">
            <span>Tag <em>optional</em></span>
            <input value={tag} onChange={(event) => setTag(event.target.value)} placeholder="e.g. Patience" maxLength={32} />
          </label>
          <fieldset className="form-field color-field">
            <legend>Tone</legend>
            <div className="color-options">
              {colorOptions.map((option) => (
                <button
                  className={`color-option ${option} ${color === option ? 'selected' : ''}`}
                  key={option}
                  type="button"
                  aria-label={colorLabels[option]}
                  onClick={() => setColor(option)}
                >
                  {color === option && <Check size={12} />}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="form-row">
          <label className="form-field">
            <span>Evidence source <em>optional</em></span>
            <input
              value={evidenceLabel}
              onChange={(event) => setEvidenceLabel(event.target.value)}
              placeholder="e.g. WHO guidance"
              maxLength={40}
            />
          </label>
          <label className="form-field">
            <span>Evidence URL <em>optional</em></span>
            <input
              value={evidenceUrl}
              onChange={(event) => setEvidenceUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>
        </div>
        <label className="pin-toggle">
          <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
          <span className="fake-checkbox"><Check size={12} /></span>
          <span>Keep it in my daily rotation</span>
        </label>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" type="submit" disabled={!title.trim()}>
            <AnchorIcon size={16} />
            Save anchor
          </button>
        </div>
      </form>
    </Modal>
  )
}

interface AnchorEditModalProps {
  anchor: Anchor
  projects: Project[]
  settings: AISettings
  onOpenSettings: () => void
  onClose: () => void
  onSave: (anchor: Anchor) => void
  onDelete: (anchorId: string) => void
}

function AnchorEditModal({
  anchor,
  projects,
  settings,
  onOpenSettings,
  onClose,
  onSave,
  onDelete,
}: AnchorEditModalProps) {
  const [title, setTitle] = useState(anchor.title)
  const [body, setBody] = useState(anchor.body)
  const [tag, setTag] = useState(anchor.tag)
  const [scope, setScope] = useState<AnchorScope>(anchor.scope)
  const [projectId, setProjectId] = useState(anchor.projectId ?? projects[0]?.id ?? '')
  const [color, setColor] = useState<AccentColor>(anchor.color)
  const [pinned, setPinned] = useState(anchor.pinned)
  const [evidenceLabel, setEvidenceLabel] = useState(anchor.evidence?.label ?? '')
  const [evidenceUrl, setEvidenceUrl] = useState(anchor.evidence?.url ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!title.trim() || (scope === 'project' && !projectId)) {
      return
    }

    const evidence =
      evidenceLabel.trim() && evidenceUrl.trim()
        ? { label: evidenceLabel.trim(), url: evidenceUrl.trim() }
        : undefined

    onSave({
      ...anchor,
      title: title.trim(),
      body: body.trim(),
      tag: tag.trim() || (scope === 'global' ? 'Personal' : 'Project note'),
      scope,
      projectId: scope === 'project' ? projectId : undefined,
      color,
      pinned,
      evidence,
      updatedAt: new Date().toISOString(),
    })
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDelete(anchor.id)
  }

  return (
    <Modal eyebrow="Refine your context" title="Edit anchor" onClose={onClose}>
      <form className="composer-form" onSubmit={handleSubmit}>
        <EntityIdentity
          prefix="A"
          serialNumber={anchor.serialNumber}
          id={anchor.id}
          createdAt={anchor.createdAt}
          updatedAt={anchor.updatedAt}
          exact
        />
        <label className="form-field">
          <span>What do you want to remember?</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Patience is part of the strategy."
          />
        </label>
        <label className="form-field">
          <span>More context <em>optional</em></span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Add context if it helps you return to this later."
            rows={4}
          />
        </label>
        <AIWriterButton
          settings={settings}
          onOpenSettings={onOpenSettings}
          label="Polish with AI"
          prompt={`Polish this existing Anchor without changing its underlying meaning. Make it clear, memorable, and practical. Return only JSON with exactly these keys: title, body, tag. Preserve all meaningful details without shortening the content. Context is optional; do not invent evidence or claims.\n\nTITLE\n${title}\n\nCONTEXT\n${body || '(none — context is optional)'}\n\nTAG\n${tag}`}
          onResult={(response) => {
            const draft = parseAnchorDraft(response)
            setTitle(draft.title)
            setBody(draft.body)
            if (draft.tag) setTag(draft.tag)
          }}
        />
        <div className="form-row">
          <fieldset className="form-field scope-field">
            <legend>Keep this in</legend>
            <div className="scope-toggle">
              <button
                className={scope === 'global' ? 'selected' : ''}
                type="button"
                onClick={() => setScope('global')}
              >
                <Compass size={14} /> Everywhere
              </button>
              <button
                className={scope === 'project' ? 'selected' : ''}
                type="button"
                onClick={() => setScope('project')}
              >
                <FolderOpen size={14} /> A project
              </button>
            </div>
          </fieldset>
          <label className="form-field">
            <span>Project</span>
            <div className="select-wrap">
              <select
                value={projectId}
                disabled={scope === 'global' || projects.length === 0}
                onChange={(event) => setProjectId(event.target.value)}
              >
                {projects.length === 0 && <option value="">Create a project first</option>}
                {projects.map((project) => (
                  <option value={project.id} key={project.id}>
                    {formatEntitySerial('P', project.serialNumber)} · {project.name}
                  </option>
                ))}
              </select>
              <ChevronDown size={15} />
            </div>
          </label>
        </div>
        <div className="form-row form-row-bottom">
          <label className="form-field">
            <span>Tag <em>optional</em></span>
            <input value={tag} onChange={(event) => setTag(event.target.value)} placeholder="e.g. Patience" maxLength={32} />
          </label>
          <fieldset className="form-field color-field">
            <legend>Tone</legend>
            <div className="color-options">
              {colorOptions.map((option) => (
                <button
                  className={`color-option ${option} ${color === option ? 'selected' : ''}`}
                  key={option}
                  type="button"
                  aria-label={colorLabels[option]}
                  onClick={() => setColor(option)}
                >
                  {color === option && <Check size={12} />}
                </button>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="form-row">
          <label className="form-field">
            <span>Evidence source <em>optional</em></span>
            <input
              value={evidenceLabel}
              onChange={(event) => setEvidenceLabel(event.target.value)}
              placeholder="e.g. WHO guidance"
              maxLength={40}
            />
          </label>
          <label className="form-field">
            <span>Evidence URL <em>optional</em></span>
            <input
              value={evidenceUrl}
              onChange={(event) => setEvidenceUrl(event.target.value)}
              placeholder="https://..."
            />
          </label>
        </div>
        <label className="pin-toggle">
          <input type="checkbox" checked={pinned} onChange={(event) => setPinned(event.target.checked)} />
          <span className="fake-checkbox"><Check size={12} /></span>
          <span>Keep it in my daily rotation</span>
        </label>
        <div className="modal-actions modal-actions-split">
          <button
            className={`text-button delete-button ${confirmDelete ? 'delete-confirm' : ''}`}
            type="button"
            onClick={handleDelete}
          >
            <Trash2 size={15} />
            {confirmDelete ? 'Confirm delete' : 'Delete anchor'}
          </button>
          <div className="modal-actions-right">
            <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
            <button className="primary-button" type="submit" disabled={!title.trim()}>
              <Check size={16} />
              Save changes
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

interface ProjectComposerProps {
  settings: AISettings
  onOpenSettings: () => void
  onClose: () => void
  onSubmit: (formData: ProjectFormData) => void
}

function ProjectComposer({ settings, onOpenSettings, onClose, onSubmit }: ProjectComposerProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState<AccentColor>('sky')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!name.trim()) {
      return
    }

    onSubmit({
      name: name.trim(),
      description: description.trim() || 'A place for the context that matters here.',
      color,
    })
  }

  return (
    <Modal eyebrow="Create some room" title="New project" onClose={onClose}>
      <form className="composer-form" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>Project name</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Learn the piano" maxLength={48} />
        </label>
        <label className="form-field">
          <span>What is this space for? <em>optional</em></span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A short phrase to bring you back to the point." rows={3} maxLength={100} />
        </label>
        <AIWriterButton
          settings={settings}
          onOpenSettings={onOpenSettings}
          label="Shape with AI"
          disabled={!name.trim() && !description.trim()}
          prompt={`Turn this rough project idea into a clear project space. Keep it grounded in what the person wrote and avoid inventing goals. Return only JSON with exactly these keys: name and description. Keep name under 48 characters and description under 100 characters.\n\nROUGH NAME\n${name || '(empty)'}\n\nROUGH DESCRIPTION\n${description || '(empty)'}`}
          onResult={(response) => {
            const draft = parseProjectDraft(response)
            setName(draft.name.slice(0, 48))
            setDescription(draft.description.slice(0, 100))
          }}
        />
        <fieldset className="form-field color-field project-color-field">
          <legend>Choose a tone</legend>
          <div className="color-options large-color-options">
            {colorOptions.map((option) => (
              <button
                className={`color-option ${option} ${color === option ? 'selected' : ''}`}
                key={option}
                type="button"
                aria-label={colorLabels[option]}
                onClick={() => setColor(option)}
              >
                {color === option && <Check size={13} />}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="modal-actions">
          <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
          <button className="primary-button" type="submit" disabled={!name.trim()}>
            <FolderOpen size={16} />
            Create project
          </button>
        </div>
      </form>
    </Modal>
  )
}

interface ProjectEditModalProps {
  project: Project
  settings: AISettings
  onOpenSettings: () => void
  onClose: () => void
  onSave: (project: Project) => void
  onDelete: (projectId: string) => void
}

function ProjectEditModal({
  project,
  settings,
  onOpenSettings,
  onClose,
  onSave,
  onDelete,
}: ProjectEditModalProps) {
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description)
  const [color, setColor] = useState<AccentColor>(project.color)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!name.trim()) {
      return
    }

    onSave({
      ...project,
      name: name.trim(),
      description: description.trim() || 'A place for the context that matters here.',
      color,
    })
  }

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    onDelete(project.id)
  }

  return (
    <Modal eyebrow="Refine this space" title="Edit project" onClose={onClose}>
      <form className="composer-form" onSubmit={handleSubmit}>
        <EntityIdentity
          prefix="P"
          serialNumber={project.serialNumber}
          id={project.id}
          createdAt={project.createdAt}
          updatedAt={project.updatedAt || project.createdAt}
          exact
        />
        <label className="form-field">
          <span>Project name</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Learn the piano" maxLength={48} />
        </label>
        <label className="form-field">
          <span>What is this space for? <em>optional</em></span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A short phrase to bring you back to the point." rows={3} maxLength={100} />
        </label>
        <AIWriterButton
          settings={settings}
          onOpenSettings={onOpenSettings}
          label="Polish with AI"
          prompt={`Polish this project description while preserving its purpose. Return only JSON with exactly these keys: name and description. Keep name under 48 characters and description under 100 characters. Do not invent goals or commitments.\n\nPROJECT NAME\n${name}\n\nDESCRIPTION\n${description}`}
          onResult={(response) => {
            const draft = parseProjectDraft(response)
            setName(draft.name.slice(0, 48))
            setDescription(draft.description.slice(0, 100))
          }}
        />
        <fieldset className="form-field color-field project-color-field">
          <legend>Choose a tone</legend>
          <div className="color-options large-color-options">
            {colorOptions.map((option) => (
              <button
                className={`color-option ${option} ${color === option ? 'selected' : ''}`}
                key={option}
                type="button"
                aria-label={colorLabels[option]}
                onClick={() => setColor(option)}
              >
                {color === option && <Check size={13} />}
              </button>
            ))}
          </div>
        </fieldset>
        <div className="modal-actions modal-actions-split">
          <button
            className={`text-button delete-button ${confirmDelete ? 'delete-confirm' : ''}`}
            type="button"
            onClick={handleDelete}
          >
            <Trash2 size={15} />
            {confirmDelete ? 'Confirm delete (anchors become global)' : 'Delete space'}
          </button>
          <div className="modal-actions-right">
            <button className="secondary-button" type="button" onClick={onClose}>Cancel</button>
            <button className="primary-button" type="submit" disabled={!name.trim()}>
              <Check size={16} />
              Save changes
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}

interface UpdateModalProps {
  updateInfo: AppUpdateInfo
  onClose: () => void
}

function UpdateModal({ updateInfo, onClose }: UpdateModalProps) {
  const [isInstalling, setIsInstalling] = useState(false)
  const [installError, setInstallError] = useState<string>()

  const handleDownload = async () => {
    if (updateInfo.installUpdate) {
      setIsInstalling(true)
      setInstallError(undefined)
      try {
        await updateInfo.installUpdate()
      } catch (error) {
        setInstallError(error instanceof Error ? error.message : 'The update could not be installed. Please try again from the release page.')
      } finally {
        setIsInstalling(false)
      }
      return
    }

    if (updateInfo.platform === 'web') {
      window.location.reload()
      return
    }

    if (updateInfo.downloadUrl) {
      window.open(updateInfo.downloadUrl, '_blank', 'noopener,noreferrer')
    }
  }

  const actionLabel = isInstalling
    ? updateInfo.platform === 'android' ? 'Downloading & opening installer…' : 'Installing…'
    : updateInfo.installUpdate
      ? updateInfo.platform === 'android' ? 'Download & install' : 'Install and relaunch'
      : updateInfo.platform === 'android'
        ? 'Download APK'
        : updateInfo.platform === 'web'
          ? 'Refresh Anchor'
          : 'Download installer'

  return (
    <Modal eyebrow="A fresh release is ready" title={`Anchor v${updateInfo.latestVersion}`} onClose={onClose}>
      <div className="update-modal-content">
        <div className="update-version-row">
          <div className="version-pill current">Current: v{updateInfo.currentVersion}</div>
          <span className="version-arrow">→</span>
          <div className="version-pill target">Latest: v{updateInfo.latestVersion}</div>
        </div>
        <div className="update-notes-box">
          <h4>What&apos;s new in this release</h4>
          <div className="update-notes-body">{updateInfo.releaseNotes || 'Refinements, stability enhancements, and harbor polish.'}</div>
        </div>
        {updateInfo.assetName && (
          <p className="update-asset-note">
            Target installer for your {updateInfo.platform}: <code>{updateInfo.assetName}</code>
          </p>
        )}
        {updateInfo.platform === 'android' && updateInfo.installUpdate && (
          <p className="update-asset-note">Anchor will download the APK and open Android&apos;s installer. Android may ask you to allow installs from Anchor once.</p>
        )}
        {installError && <div className="update-install-error" role="alert"><CircleAlert size={14} /> <span>{installError}</span></div>}
        <div className="modal-actions modal-actions-split">
          <a
            className="text-button"
            href={updateInfo.htmlUrl}
            target="_blank"
            rel="noreferrer"
          >
            View on GitHub
          </a>
          <div className="modal-actions-right">
            <button className="secondary-button" type="button" onClick={onClose}>Later</button>
            <button className="primary-button" type="button" onClick={() => void handleDownload()} disabled={isInstalling}>
              {isInstalling ? <RefreshCw className="spin" size={15} /> : <Download size={15} />}
              {actionLabel}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  )
}

interface DashboardViewProps {
  anchorsCount: number
  projectsCount: number
  anchors: Anchor[]
  projects: Project[]
  decisions: Decision[]
  notes: Note[]
  settings: AISettings
  onOpenSettings: () => void
  onAnchorThought: (thought: PhilosophyThought) => void
  onOpenDecision: () => void
  onAddAnchor: () => void
}

function DashboardView({
  anchorsCount,
  projectsCount,
  anchors,
  projects,
  decisions,
  notes,
  settings,
  onOpenSettings,
  onAnchorThought,
  onOpenDecision,
  onAddAnchor,
}: DashboardViewProps) {
  const [thoughts, setThoughts] = useState<PhilosophyThought[]>(() => getCachedPhilosophyVault())
  const [activeCategory, setActiveCategory] = useState<PhilosophyCategory>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [spotlightThought, setSpotlightThought] = useState<PhilosophyThought>(() => getDailyPhilosophy())
  const [downloading, setDownloading] = useState(false)
  const [downloadMessage, setDownloadMessage] = useState<string>()

  const filteredThoughts = useMemo(() => {
    return thoughts.filter((t) => {
      const matchesCat = activeCategory === 'all' || t.category === activeCategory
      const query = searchQuery.trim().toLowerCase()
      if (!query) return matchesCat
      const matchesSearch =
        t.quote.toLowerCase().includes(query) ||
        t.author.toLowerCase().includes(query) ||
        t.school.toLowerCase().includes(query) ||
        (t.takeaway && t.takeaway.toLowerCase().includes(query))
      return matchesCat && matchesSearch
    })
  }, [thoughts, activeCategory, searchQuery])

  const shuffleSpotlight = () => {
    setSpotlightThought(getRandomPhilosophy(activeCategory, spotlightThought.id))
  }

  const handleExpandVault = async () => {
    setDownloading(true)
    try {
      const res = await downloadAndExpandPhilosophyVault(2500)
      setThoughts(getCachedPhilosophyVault())
      setDownloadMessage(`Wisdom library expanded! ${res.total} philosophies ready offline.`)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="dashboard-view page-enter">
      <div className="page-heading dashboard-heading">
        <div>
          <p className="eyebrow">The Harbor of Mind</p>
          <h1>
            Wisdom &amp; Philosophy<span className="accent-dot">.</span>
          </h1>
          <p className="page-subtitle">
            Ground your thinking with timeless perspectives from Stoicism, Eastern thought, and modern humanism.
          </p>
        </div>
        <div className="heading-actions">
          <button
            className="secondary-button"
            type="button"
            onClick={handleExpandVault}
            disabled={downloading}
            title="Download and cache thousands of philosophical thoughts locally"
          >
            <RefreshCw className={downloading ? 'spin' : ''} size={15} />
            {downloading ? 'Downloading vault…' : 'Expand library (Thousands)'}
          </button>
          <button className="secondary-button" type="button" onClick={onOpenDecision}>
            <WandSparkles size={16} />
            Think through
          </button>
          <button className="primary-button" type="button" onClick={onAddAnchor}>
            <Plus size={17} />
            New anchor
          </button>
        </div>
      </div>

      {downloadMessage && (
        <div className="model-success dashboard-banner">
          <Sparkles size={16} />
          <span>{downloadMessage}</span>
        </div>
      )}

      <AIInsightCard
        className="dashboard-ai-card"
        eyebrow="Your workspace intelligence"
        title="A little help seeing the whole picture"
        description="Anchor can connect the dots between your projects, reminders, notes, and decision rooms — only when you invite it."
        context={buildWorkspaceAIContext(anchors, projects, decisions, notes)}
        prompts={[
          { label: 'What needs attention?', prompt: 'What seems most worth my attention today, based on my saved context?' },
          { label: 'Find a pattern', prompt: 'What pattern, tension, or repeated theme do you notice across my workspace?' },
          { label: 'Choose one next step', prompt: 'Give me one small next step that would create useful momentum.' },
        ]}
        settings={settings}
        onOpenSettings={onOpenSettings}
      />

      <div className="dashboard-layout">
        <section className="philosophy-spotlight-card">
          <div className="spotlight-orbit orbit-one" />
          <div className="spotlight-orbit orbit-two" />
          <div className="philosophy-spotlight-inner">
            <div className="spotlight-header">
              <span className="eyebrow light-eyebrow">
                <Sparkles size={13} /> Daily Grounding Philosophy
              </span>
              <button
                className="philosophy-shuffle-btn"
                type="button"
                onClick={shuffleSpotlight}
                title="Shuffle thought"
                aria-label="Shuffle thought"
              >
                <RotateCcw size={14} />
              </button>
            </div>

            <blockquote className="philosophy-quote">
              &ldquo;{spotlightThought.quote}&rdquo;
            </blockquote>

            <div className="philosophy-author-row">
              <div className="philosophy-author-info">
                <strong>{spotlightThought.author}</strong>
                <span>{spotlightThought.school}{spotlightThought.source ? ` · ${spotlightThought.source}` : ''}</span>
                <small className="philosophy-thought-id">{formatEntitySerial('W', thoughts.findIndex((thought) => thought.id === spotlightThought.id) + 1)}</small>
              </div>
              <button
                className="primary-button anchor-thought-btn"
                type="button"
                onClick={() => onAnchorThought(spotlightThought)}
                title="Save as an Anchor in your workspace"
              >
                <AnchorIcon size={14} />
                Anchor this thought
              </button>
            </div>

            {spotlightThought.takeaway && (
              <p className="philosophy-takeaway">
                <strong>Core Takeaway:</strong> {spotlightThought.takeaway}
              </p>
            )}
          </div>
        </section>

        {/* Mindful Stats Bar */}
        <div className="mindful-stats-row">
          <div className="stat-card">
            <span className="stat-number">{anchorsCount}</span>
            <span className="stat-label">Anchors Grounded</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{projectsCount}</span>
            <span className="stat-label">Active Projects</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">{thoughts.length}</span>
            <span className="stat-label">Thoughts in Vault</span>
          </div>
          <div className="stat-card">
            <span className="stat-number">100%</span>
            <span className="stat-label">Local &amp; Offline Ready</span>
          </div>
        </div>

        {/* Category Filters and Search */}
        <div className="philosophy-filters-bar">
          <div className="category-pills" role="tablist">
            {(Object.keys(CATEGORY_LABELS) as PhilosophyCategory[]).map((cat) => (
              <button
                key={cat}
                type="button"
                className={`category-pill ${activeCategory === cat ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {CATEGORY_LABELS[cat]}
              </button>
            ))}
          </div>
          <div className="inline-search">
            <Search size={15} />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search philosophers, quotes, or keywords…"
            />
          </div>
        </div>

        {/* Philosophy Thought Grid */}
        <div className="philosophy-grid">
          {filteredThoughts.slice(0, 36).map((item) => (
            <div className="philosophy-card" key={item.id}>
              <div className="philosophy-card-header">
                <div className="philosophy-card-tags">
                  <span className="philosophy-school-tag">{item.school}</span>
                  <span className="philosophy-thought-id">{formatEntitySerial('W', thoughts.findIndex((thought) => thought.id === item.id) + 1)}</span>
                </div>
                <button
                  className="anchor-mini-btn"
                  type="button"
                  onClick={() => onAnchorThought(item)}
                  title="Anchor this thought"
                  aria-label="Anchor this thought"
                >
                  <AnchorIcon size={13} />
                  <span>Anchor</span>
                </button>
              </div>
              <p className="philosophy-card-quote">&ldquo;{item.quote}&rdquo;</p>
              <div className="philosophy-card-footer">
                <strong className="philosophy-card-author">{item.author}</strong>
                {item.takeaway && <small className="philosophy-card-takeaway">{item.takeaway}</small>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default App
