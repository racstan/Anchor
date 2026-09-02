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
  CircleAlert,
  CirclePlus,
  Clock3,
  Cloud,
  Download,
  Command,
  Compass,
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
  formatUpdatedAt,
  matchSearchText,
  getProject,
  getProjectAnchorCount,
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
  Decision,
  EvidenceSource,
  Project,
} from './lib/anchors'
import {
  AI_PROVIDERS,
  completeAIChat,
  DEFAULT_AI_SETTINGS,
  discoverModels,
  readAISettings,
  writeAISettings,
} from './lib/ai'
import type { AIMessage, AIModel, AISettings } from './lib/ai'
import {
  mergeWorkspaceState,
  parseWorkspaceExport,
  readUserProfile,
  serializeWorkspaceExport,
  writeUserProfile,
} from './lib/workspace'
import type { UserProfile } from './lib/workspace'
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
  normalizeSyncSettings,
  readSyncSettings,
  startDropboxOAuth,
  testDropboxConnection,
  writeSyncSettings,
} from './lib/sync'
import type { SyncProviderType, SyncSettings } from './lib/sync'
import {
  CATEGORY_LABELS,
  downloadAndExpandPhilosophyVault,
  getCachedPhilosophyVault,
  getDailyPhilosophy,
  getRandomPhilosophy,
} from './lib/philosophy'
import type { PhilosophyCategory, PhilosophyThought } from './lib/philosophy'
import './App.css'

type View = 'home' | 'dashboard' | 'all' | 'global' | 'projects' | 'decide' | 'settings'

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

function displayName(name: string): string {
  return name.trim() || 'friend'
}

function profileInitial(name: string): string {
  const trimmedName = name.trim()

  return trimmedName ? trimmedName.charAt(0).toUpperCase() : '?'
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

interface OnboardingViewProps {
  theme: Theme
  onComplete: (name: string, keepExamples: boolean, pin?: string) => Promise<void>
}

function OnboardingView({ theme, onComplete }: OnboardingViewProps) {
  const [name, setName] = useState('')
  const [starterChoice, setStarterChoice] = useState<'examples' | 'fresh'>('fresh')
  const [pin, setPin] = useState('')
  const [pinConfirmation, setPinConfirmation] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string>()

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

  return (
    <div className={`onboarding-shell ${theme === 'dark' ? 'theme-dark' : ''}`}>
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
          <button className="primary-button onboarding-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Setting up…' : 'Enter my space'} <ArrowUpRight size={16} />
          </button>
        </form>
        <p className="onboarding-note"><ShieldCheck size={14} /> Your name and optional PIN stay on this device. Change them later in Settings.</p>
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

  return (
    <div className={`pin-lock-shell onboarding-shell ${theme === 'dark' ? 'theme-dark' : ''}`}>
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
  const [listFilter, setListFilter] = useState<AnchorFilter>('all')
  const [query, setQuery] = useState('')
  const [spotlightAnchorId, setSpotlightAnchorId] = useState<string | undefined>(() => getInitialSpotlightId())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() =>
    readStoredBoolean(SIDEBAR_STORAGE_KEY, false),
  )
  const [theme, setTheme] = useState<Theme>(() => readStoredTheme())
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() =>
    readStoredIds(NOTIFICATIONS_STORAGE_KEY),
  )
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchPaletteOpen, setSearchPaletteOpen] = useState(false)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [editingAnchor, setEditingAnchor] = useState<Anchor | undefined>(undefined)
  const [isProjectComposerOpen, setIsProjectComposerOpen] = useState(false)
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined)
  const [syncSettings, setSyncSettings] = useState<SyncSettings>(() => readSyncSettings())
  const [syncBusy, setSyncBusy] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<AppUpdateInfo>()
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toast, setToast] = useState<string>()
  const topSearchRef = useRef<HTMLInputElement>(null)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const notificationWrapRef = useRef<HTMLDivElement>(null)
  const stateRef = useRef(state)
  const profileRef = useRef(profile)
  const syncSettingsRef = useRef(syncSettings)
  const dropboxCallbackHandledRef = useRef(false)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  useEffect(() => {
    syncSettingsRef.current = syncSettings
  }, [syncSettings])

  const showToast = (message: string) => {
    setToast(message)
  }

  useEffect(() => {
    writeSyncSettings(syncSettings)
  }, [syncSettings])

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
      const result = await executeWorkspaceSync(stateRef.current, profileRef.current, currentSync)
      if (result.success && result.mergedState) {
        setState(result.mergedState)
        if (result.mergedProfile && result.mergedProfile.name.trim()) {
          setProfile(result.mergedProfile)
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
    if (syncSettings.enabled && syncSettings.autoSyncOnStartup && syncSettings.provider !== 'none') {
      const timer = setTimeout(() => {
        void triggerSync(false)
      }, 1200)
      return () => clearTimeout(timer)
    }
  }, [syncSettings.enabled, syncSettings.autoSyncOnStartup, syncSettings.provider, triggerSync])

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
      const name = await testDropboxConnection(token, vaultName)
      const nextSettings = normalizeSyncSettings({
        ...syncSettingsRef.current,
        enabled: true,
        provider: 'dropbox',
        dropboxAppKey: syncSettingsRef.current.dropboxAppKey || DEFAULT_DROPBOX_APP_KEY,
        dropboxAccessToken: token,
        dropboxRefreshToken: tokenDetails.refreshToken || syncSettingsRef.current.dropboxRefreshToken,
        dropboxTokenExpiresAt: tokenDetails.expiresAt,
        dropboxAccountId: tokenDetails.accountId || syncSettingsRef.current.dropboxAccountId,
        lastSyncStatus: 'success',
        lastSyncMessage: `Connected to ${name}`,
      })
      setSyncSettings(nextSettings)
      setActiveView('settings')
      setActiveProjectId(undefined)
      setListFilter('all')
      setQuery('')
      setSearchPaletteOpen(false)
      setNotificationsOpen(false)
      setMobileMenuOpen(false)
      showToast(`Successfully connected to ${name}!`)
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

    if (window.location.pathname.replace(/\/$/, '') === '/dropbox/callback' && !dropboxCallbackHandledRef.current) {
      dropboxCallbackHandledRef.current = true
      void completeDropboxOAuth()
        .then((result) => {
          if (!result) return
          return applyDropboxToken(result.accessToken, result)
        })
        .catch((err) => showToast(`Dropbox connection error: ${err instanceof Error ? err.message : 'authorization failed.'}`))
        .finally(cleanDropboxCallbackUrl)
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

    return () => window.removeEventListener('message', handleMessage)
  }, [])

  const anchorPhilosophyThought = (thought: PhilosophyThought) => {
    const timestamp = new Date().toISOString()
    const newAnchor: Anchor = {
      id: createId('anchor'),
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
  const notifications = useMemo(
    () => buildNotifications(state.anchors, state.projects, readNotificationIds),
    [readNotificationIds, state.anchors, state.projects],
  )
  const unreadNotifications = notifications.filter((notification) => !notification.isRead)

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
    setActiveView(view)
    setActiveProjectId(projectId)
    setListFilter(view === 'global' ? 'global' : 'all')
    setQuery('')
    setSearchPaletteOpen(false)
    setNotificationsOpen(false)
    setMobileMenuOpen(false)
  }

  const changeListFilter = (filter: AnchorFilter) => {
    setListFilter(filter)
    setActiveView(filter === 'global' ? 'global' : 'all')
    setActiveProjectId(undefined)
    setQuery('')
    setSearchPaletteOpen(false)
  }

  const openAnchorComposer = (projectId?: string) => {
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

    setAISettings((currentSettings) => ({ ...currentSettings, ...changes }))
  }

  const saveAISettings = () => {
    writeAISettings(aiSettings)
    showToast('Your AI connection is saved on this device.')
    void refreshModels(aiSettings)
  }

  const saveDecision = (decision: Decision) => {
    setState((currentState) => ({
      ...currentState,
      decisions: [
        decision,
        ...currentState.decisions.filter((savedDecision) => savedDecision.id !== decision.id),
      ],
    }))
  }

  const togglePinned = (anchorId: string) => {
    setState((currentState) => ({
      ...currentState,
      anchors: currentState.anchors.map((anchor) =>
        anchor.id === anchorId ? { ...anchor, pinned: !anchor.pinned } : anchor,
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
      icon: 'spark',
      createdAt: timestamp,
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
    setState((currentState) => ({
      ...currentState,
      projects: currentState.projects.map((project) =>
        project.id === updated.id ? updated : project,
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

  const openNotification = (notification: AppNotification) => {
    markNotificationRead(notification.id)
    setNotificationsOpen(false)
    const anchor = state.anchors.find((item) => item.id === notification.anchorId)

    if (!anchor) {
      return
    }

    if (anchor.scope === 'project' && anchor.projectId) {
      navigate('projects', anchor.projectId)
      return
    }

    navigate('global')
  }

  const openSearchResult = (anchor: Anchor) => {
    setQuery('')
    setSearchPaletteOpen(false)

    if (anchor.scope === 'project' && anchor.projectId) {
      navigate('projects', anchor.projectId)
      return
    }

    navigate('global')
  }

  const openSettings = () => {
    navigate('settings')
  }

  const saveProfile = (nextProfile: UserProfile) => {
    const name = nextProfile.name.trim()

    if (!name) {
      return
    }

    setProfile({ name })
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
    const file = new Blob([serializeWorkspaceExport(state, profile)], { type: 'application/json' })
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

    setState(nextState)

    if (imported.profile.name) {
      setProfile(imported.profile)
    }

    const summary = `${nextState.anchors.length} anchors, ${nextState.projects.length} projects, and ${nextState.decisions.length} decisions`
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
        onComplete={async (name, keepExamples, pin) => {
          if (pin) {
            await savePin(pin)
          } else {
            setSecurity({})
            setIsLocked(false)
          }

          setProfile({ name })
          if (!keepExamples) {
            setState({ anchors: [], projects: [], decisions: [] })
            setSpotlightAnchorId(undefined)
          }
        }}
      />
    )
  }

  let pageContent: React.ReactNode

  if (activeProjectId && activeProject) {
    pageContent = (
      <ProjectView
        project={activeProject}
        anchors={state.anchors}
        onBack={() => navigate('projects')}
        onAddAnchor={() => openAnchorComposer(activeProject.id)}
        onEditAnchor={setEditingAnchor}
        onEditProject={() => setEditingProject(activeProject)}
        onTogglePinned={togglePinned}
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
        onAddAnchor={() => openAnchorComposer()}
        onOpenAll={() => navigate('all')}
        onOpenProject={(projectId) => navigate('projects', projectId)}
        onOpenProjects={() => navigate('projects')}
        onOpenDecision={() => navigate('decide')}
      />
    )
  } else if (activeView === 'dashboard') {
    pageContent = (
      <DashboardView
        anchorsCount={state.anchors.length}
        projectsCount={state.projects.length}
        onAnchorThought={anchorPhilosophyThought}
        onOpenDecision={() => navigate('decide')}
        onAddAnchor={() => openAnchorComposer()}
      />
    )
  } else if (activeView === 'decide') {
    pageContent = (
      <DecisionView
        name={profile.name}
        projects={state.projects}
        anchors={state.anchors}
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
        availableModels={availableModels}
        modelsLoading={modelsLoading}
        modelsError={modelsError}
        theme={theme}
        onThemeChange={setTheme}
        onSettingsChange={updateAISettings}
        onSave={saveAISettings}
        onRefreshModels={() => void refreshModels(aiSettings)}
        onReset={() => {
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
      />
    )
  } else if (activeView === 'projects') {
    pageContent = (
      <ProjectsView
        projects={state.projects}
        anchors={state.anchors}
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
        filter={activeView === 'global' ? 'global' : listFilter}
        query={query}
        onQueryChange={setQuery}
        onFilterChange={changeListFilter}
        onAddAnchor={() => openAnchorComposer()}
        onEditAnchor={setEditingAnchor}
        onTogglePinned={togglePinned}
      />
    )
  }

  const isDecisionRoute = activeView === 'decide' && !activeProjectId

  return (
    <div className={`anchor-app ${theme === 'dark' ? 'theme-dark' : ''}`}>
      <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <button
            className="brand-mark-btn"
            type="button"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Anchor home'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Anchor home'}
            onClick={() => {
              if (sidebarCollapsed) {
                setSidebarCollapsed(false)
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
            onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
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
              title={project.name}
              aria-label={project.name}
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
            <strong>
              {activeProject?.name ??
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
                      ? `Synced with ${syncSettings.provider} (${formatUpdatedAt(syncSettings.lastSyncedAt)}). Click to sync now.`
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
              onClick={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
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
          onClose={() => setIsComposerOpen(false)}
          onSubmit={addAnchor}
        />
      )}
      {editingAnchor && (
        <AnchorEditModal
          anchor={editingAnchor}
          projects={state.projects}
          onClose={() => setEditingAnchor(undefined)}
          onSave={updateAnchor}
          onDelete={deleteAnchor}
        />
      )}
      {isProjectComposerOpen && (
        <ProjectComposer onClose={() => setIsProjectComposerOpen(false)} onSubmit={addProject} />
      )}
      {editingProject && (
        <ProjectEditModal
          project={editingProject}
          onClose={() => setEditingProject(undefined)}
          onSave={updateProject}
          onDelete={deleteProject}
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
                  <span>{anchor.title}</span>
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
  onAddAnchor: () => void
  onOpenAll: () => void
  onOpenProject: (projectId: string) => void
  onOpenProjects: () => void
  onOpenDecision: () => void
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
  onAddAnchor,
  onOpenAll,
  onOpenProject,
  onOpenProjects,
  onOpenDecision,
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
  onTogglePinned: (anchorId: string) => void
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
  onTogglePinned,
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
  onTogglePinned: (anchorId: string) => void
  onEdit?: (anchor: Anchor) => void
}

function AnchorListItem({ anchor, projects, query, onTogglePinned, onEdit }: AnchorListItemProps) {
  const project = getProject(projects, anchor.projectId)

  return (
    <article className={`anchor-item accent-${anchor.color}`}>
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
              onClick={() => onEdit(anchor)}
            >
              <PenLine size={14} />
            </button>
          )}
          <button
            className={`pin-button ${anchor.pinned ? 'pinned' : ''}`}
            type="button"
            aria-label={anchor.pinned ? 'Unpin anchor' : 'Pin anchor'}
            title={anchor.pinned ? 'Unpin anchor' : 'Pin anchor'}
            onClick={() => onTogglePinned(anchor.id)}
          >
            <Pin size={15} fill={anchor.pinned ? 'currentColor' : 'none'} />
          </button>
        </div>
      </div>
      <h3><HighlightedText value={anchor.title} query={query} /></h3>
      <p><HighlightedText value={anchor.body} query={query} /></p>
      {anchor.evidence && (
        <a
          className="evidence-link"
          href={anchor.evidence.url}
          target="_blank"
          rel="noreferrer"
        >
          <ShieldCheck size={12} />
          Evidence-informed · {anchor.evidence.label}
          <ArrowUpRight size={11} />
        </a>
      )}
      <div className="anchor-item-footer">
        <span className="anchor-tag"><HighlightedText value={anchor.tag} query={query} /></span>
        <span className="updated-label">
          <Clock3 size={12} />
          {formatUpdatedAt(anchor.updatedAt)}
        </span>
      </div>
    </article>
  )
}

interface DecisionViewProps {
  name: string
  projects: Project[]
  anchors: Anchor[]
  settings: AISettings
  decisions: Decision[]
  onOpenSettings: () => void
  onSaveDecision: (decision: Decision) => void
  onDeleteDecision: (decisionId: string) => void
}

function anchorPromptLine(anchor: Anchor): string {
  const evidence = anchor.evidence ? ` [Evidence reference: ${anchor.evidence.label} — ${anchor.evidence.url}]` : ''

  return `- ${anchor.title}: ${anchor.body}${evidence}`
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
  return decision.situation.replace(/\s+/g, ' ').trim() || 'Untitled decision'
}

function inlineMarkdown(value: string): React.ReactNode {
  return value.split(/(\*\*[^*]+\*\*|__[^_]+__|`[^`]+`)/g).map((part, index) => {
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>
    }

    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>
    }

    return part
  })
}

function ChatRichText({ content }: { content: string }) {
  const blocks: React.ReactNode[] = []
  const paragraphLines: string[] = []
  const listItems: string[] = []
  let listType: 'ul' | 'ol' | undefined
  let blockIndex = 0

  const flushParagraph = () => {
    if (paragraphLines.length === 0) {
      return
    }

    blocks.push(<p key={`paragraph-${blockIndex++}`}>{inlineMarkdown(paragraphLines.join(' '))}</p>)
    paragraphLines.length = 0
  }

  const flushList = () => {
    if (!listType || listItems.length === 0) {
      return
    }

    const List = listType
    blocks.push(
      <List key={`list-${blockIndex++}`}>
        {listItems.map((item, index) => <li key={`${item}-${index}`}>{inlineMarkdown(item)}</li>)}
      </List>,
    )
    listType = undefined
    listItems.length = 0
  }

  content.split(/\r?\n/).forEach((line) => {
    const trimmedLine = line.trim()

    if (!trimmedLine) {
      flushParagraph()
      flushList()
      return
    }

    const heading = trimmedLine.match(/^#{1,3}\s+(.+)$/)
    const unorderedItem = trimmedLine.match(/^[-*]\s+(.+)$/)
    const orderedItem = trimmedLine.match(/^\d+[.)]\s+(.+)$/)

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

  return <div className="chat-rich-text">{blocks}</div>
}

function DecisionView({
  name,
  projects,
  anchors,
  settings,
  decisions,
  onOpenSettings,
  onSaveDecision,
  onDeleteDecision,
}: DecisionViewProps) {
  const firstDecision = decisions[0]
  const [activeDecisionId, setActiveDecisionId] = useState<string | undefined>(firstDecision?.id)
  const [projectId, setProjectId] = useState(firstDecision?.projectId ?? '')
  const [projectImported, setProjectImported] = useState(Boolean(firstDecision?.projectId))
  const [briefCollapsed, setBriefCollapsed] = useState(false)
  const [situation, setSituation] = useState(firstDecision?.situation ?? '')
  const [additionalContext, setAdditionalContext] = useState(firstDecision?.additionalContext ?? '')
  const [messages, setMessages] = useState<ChatMessage[]>(firstDecision?.messages ?? [])
  const [chatInput, setChatInput] = useState('')
  const [isThinking, setIsThinking] = useState(false)
  const [error, setError] = useState<string>()
  const requestControllerRef = useRef<AbortController | undefined>(undefined)
  const selectedProject = getProject(projects, projectId)
  const projectAnchors = projectImported && selectedProject
    ? anchors.filter((anchor) => anchor.projectId === selectedProject.id)
    : []
  const globalAnchors = anchors.filter((anchor) => anchor.scope === 'global' && anchor.pinned).slice(0, 6)
  const provider = AI_PROVIDERS.find((item) => item.id === settings.providerId)
  const connectionReady = Boolean(settings.apiKey.trim() && settings.model.trim() && (!provider?.requiresAccountId || settings.accountId.trim()))

  const saveCurrentDecision = (nextMessages: ChatMessage[]) => {
    const now = new Date().toISOString()
    const existingDecision = decisions.find((decision) => decision.id === activeDecisionId)
    const id = activeDecisionId ?? createId('decision')

    setActiveDecisionId(id)
    onSaveDecision({
      id,
      projectId: projectImported && projectId ? projectId : undefined,
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
      role: 'user',
      content: trimmedContent,
      createdAt: new Date().toISOString(),
    }
    const nextMessages = [...messages, userMessage]
    const aiMessages: AIMessage[] = [
      {
        role: 'system',
        content: decisionSystemPrompt(selectedProject && projectImported ? selectedProject : undefined, projectAnchors, globalAnchors),
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
        role: 'assistant',
        content: response,
        createdAt: new Date().toISOString(),
      }
      const completedMessages = [...nextMessages, assistantMessage]

      setMessages(completedMessages)
      saveCurrentDecision(completedMessages)
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

  const handleAnalyze = () => {
    if (!situation.trim()) {
      setError('Start with the situation that is asking for your attention.')
      return
    }

    void sendToAI(buildUserPrompt())
  }

  const handleChatSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!messages.length) {
      handleAnalyze()
      return
    }

    void sendToAI(chatInput)
  }

  const startNewDecision = () => {
    requestControllerRef.current?.abort()
    requestControllerRef.current = undefined
    setIsThinking(false)
    setBriefCollapsed(false)
    setActiveDecisionId(undefined)
    setProjectId('')
    setProjectImported(false)
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
    setProjectId(decision.projectId ?? '')
    setProjectImported(Boolean(decision.projectId))
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
          <p className="eyebrow">A little room before the next move</p>
          <h1>Happy thinking, dear {displayName(name)}<span className="accent-dot">.</span></h1>
          <p className="page-subtitle">Bring the whole situation here. We&apos;ll look at it gently, together.</p>
        </div>
        <button className="secondary-button" type="button" onClick={startNewDecision}>
          <RotateCcw size={16} />
          New decision
        </button>
      </div>

      <div className={`decision-layout ${briefCollapsed ? 'brief-collapsed' : ''}`}>
        <section className="decision-brief">
          <div className="decision-panel-heading">
            <span className="step-badge">01</span>
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
                    <option value={project.id} key={project.id}>{project.name}</option>
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

          <label className="form-field decision-field">
            <span>The situation</span>
            <textarea
              className="decision-situation-input"
              value={situation}
              onChange={(event) => setSituation(event.target.value)}
              placeholder="What happened? What choice is in front of you?"
              rows={5}
              maxLength={1200}
            />
            <small>{situation.length}/1200</small>
          </label>
          <label className="form-field decision-field">
            <span>More context <em>optional</em></span>
            <textarea
              className="decision-context-input"
              value={additionalContext}
              onChange={(event) => setAdditionalContext(event.target.value)}
              placeholder="What have you tried? What are you worried might happen?"
              rows={4}
              maxLength={1800}
            />
            <small>{additionalContext.length}/1800</small>
          </label>

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

          <button className="primary-button decision-submit" type="button" onClick={handleAnalyze} disabled={!situation.trim() || isThinking}>
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
                    <span>{decisionPreview(decision)}</span>
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
            <button className={`connection-pill ${connectionReady ? 'connected' : ''}`} type="button" onClick={onOpenSettings}>
              <span className="connection-pill-dot" />
              <span>{connectionReady ? `${provider?.name ?? 'AI'} · ${settings.model}` : 'Connect AI'}</span>
              <ChevronRight size={13} />
            </button>
          </div>

          <div className="chat-messages" aria-live="polite">
            {messages.length === 0 ? (
              <div className="chat-welcome">
                <div className="chat-welcome-icon"><Bot size={22} /></div>
                <p className="eyebrow">A quiet place to think</p>
                <h2>Let&apos;s slow this down together.</h2>
                <p>Share the situation on the left, and I&apos;ll help you see the options, trade-offs, and possible paths without rushing you toward one.</p>
                <div className="chat-welcome-points">
                  <span><span>01</span>What matters most</span>
                  <span><span>02</span>What could happen</span>
                  <span><span>03</span>What to do next</span>
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div className={`chat-message-row ${message.role}`} key={message.id}>
                  <span className="chat-message-avatar">
                    {message.role === 'assistant' ? <Bot size={15} /> : <UserRound size={15} />}
                  </span>
                  <div className="chat-message-bubble">
                    <span className="chat-message-label">{message.role === 'assistant' ? 'Anchor' : 'You'}</span>
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

interface SettingsViewProps {
  profile: UserProfile
  security: SecuritySettings
  settings: AISettings
  availableModels: AIModel[]
  modelsLoading: boolean
  modelsError?: string
  theme: Theme
  onThemeChange: (theme: Theme) => void
  onSettingsChange: (changes: Partial<AISettings>) => void
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
}

function SettingsView({
  profile,
  security,
  settings,
  availableModels,
  modelsLoading,
  modelsError,
  theme,
  onThemeChange,
  onSettingsChange,
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
  const [showSyncPassword, setShowSyncPassword] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string }>()
  const [testingDropbox, setTestingDropbox] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const provider = AI_PROVIDERS.find((item) => item.id === settings.providerId) ?? AI_PROVIDERS[0]
  const hasManagedDropboxApp = syncDraft.dropboxAppKey === DEFAULT_DROPBOX_APP_KEY

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
              <span>Models are discovered live from the provider you choose.</span>
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

        <section className="settings-card privacy-card">
          <div className="settings-card-heading compact">
            <span className="settings-card-icon privacy"><ShieldCheck size={18} /></span>
            <div>
              <p className="eyebrow">05 — Your trust matters</p>
              <h2>Private by default</h2>
            </div>
          </div>
          <p className="settings-card-copy">Your key and connection settings stay in this device&apos;s local storage. Anchor only sends them to your chosen provider when you test or think.</p>
          <div className="privacy-note"><ShieldCheck size={14} /> The relay forwards requests without saving your key or decision context.</div>
        </section>

        <section className="settings-card data-card">
          <div className="settings-card-heading compact">
            <span className="settings-card-icon data"><Download size={18} /></span>
            <div>
              <p className="eyebrow">06 — Keep your context close</p>
              <h2>Workspace data</h2>
            </div>
          </div>
          <p className="settings-card-copy">Export your anchors, projects, decisions, and profile as a portable JSON backup. API keys are never included.</p>
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
              <p className="eyebrow">07 — Always getting steadier</p>
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
              <p className="eyebrow">08 — Shared across all your devices</p>
              <h2>Cloud sync (Remotely Save)</h2>
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
                All your devices connect to the same remote storage vault and sync their anchors.
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
                    required
                  />
                  <small className="field-help">
                    Use the exact same vault name on your PCs, laptops, phones, and tablets so they share the same data.
                  </small>
                </div>

                {syncDraft.provider === 'dropbox' && (
                  <>
                    <div className="dropbox-oauth-card">
                      <div className="dropbox-oauth-copy">
                        <strong>Connect with Dropbox</strong>
                        <span>
                          One secure authorization connects this device. Anchor will create <strong>/{syncDraft.vaultName || DEFAULT_VAULT_NAME}</strong> inside the Dropbox app folder automatically.
                        </span>
                      </div>
                      <button
                        className="primary-button dropbox-authorize-btn"
                        type="button"
                        disabled={testingDropbox}
                        onClick={() => {
                          const appKey = syncDraft.dropboxAppKey?.trim() || DEFAULT_DROPBOX_APP_KEY
                          onSaveSyncSettings(normalizeSyncSettings({
                            ...syncDraft,
                            enabled: true,
                            provider: 'dropbox',
                            dropboxAppKey: appKey,
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
                        {testingDropbox ? 'Opening Dropbox…' : 'Connect Dropbox'}
                      </button>
                    </div>

                    {hasManagedDropboxApp ? (
                      <div className="sync-note-muted">
                        Dropbox is already configured for Anchor. You do not need to enter an App Key or Access Token; Dropbox creates those credentials during authorization and Anchor keeps them on this device.
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

                    {(syncDraft.dropboxAccessToken || syncSettings.dropboxAccessToken) && (
                      <div className="model-success sync-connected-pill">
                        <Check size={14} />
                        <span>Dropbox account connected. Vault: <strong>{syncDraft.vaultName}</strong></span>
                        <button
                          className="text-button disconnect-btn"
                          type="button"
                          onClick={() => {
                            const disconnected = normalizeSyncSettings({
                              ...syncDraft,
                              enabled: false,
                              provider: 'none',
                              dropboxAccessToken: undefined,
                              dropboxRefreshToken: undefined,
                              dropboxTokenExpiresAt: undefined,
                              dropboxAccountId: undefined,
                            })
                            setSyncDraft(disconnected)
                            onSaveSyncSettings(disconnected)
                          }}
                        >
                          Disconnect
                        </button>
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

                <div className="form-field">
                  <div className="field-label-row">
                    <label htmlFor="sync-encryption-pass">End-to-End Encryption (E2EE) password (Optional)</label>
                    <button
                      className="field-action-button"
                      type="button"
                      onClick={() => setShowSyncPassword((prev) => !prev)}
                    >
                      {showSyncPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                  <input
                    id="sync-encryption-pass"
                    type={showSyncPassword ? 'text' : 'password'}
                    value={syncDraft.encryptionPassword ?? ''}
                    onChange={(e) => setSyncDraft((prev) => ({ ...prev, encryptionPassword: e.target.value }))}
                    placeholder="Leave empty for plaintext JSON in your private storage"
                    autoComplete="new-password"
                  />
                  <small className="field-help">
                    Zero-knowledge AES-GCM encryption. If set, data is encrypted before leaving your device. All your devices must use this identical password.
                  </small>
                </div>

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
                  <div className="form-field">
                    <label className="checkbox-label" style={{ marginTop: '26px' }}>
                      <input
                        type="checkbox"
                        checked={syncDraft.autoSyncOnStartup}
                        onChange={(e) => setSyncDraft((prev) => ({ ...prev, autoSyncOnStartup: e.target.checked }))}
                      />
                      <span>Auto-sync when Anchor opens</span>
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
                        ? `Last synced: ${formatUpdatedAt(syncSettings.lastSyncedAt)}`
                        : 'Never synced'}
                      {syncSettings.lastSyncMessage ? ` · ${syncSettings.lastSyncMessage}` : ''}
                    </span>
                  </div>
                  <div className="sync-footer-actions">
                    <button
                      className="primary-button"
                      type="button"
                      onClick={onTriggerSync}
                      disabled={syncBusy}
                    >
                      <RefreshCw className={syncBusy ? 'spin' : ''} size={15} />
                      {syncBusy ? 'Syncing…' : 'Sync now'}
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
  onOpenProject: (projectId: string) => void
  onAddProject: () => void
  onEditProject?: (project: Project) => void
}

function ProjectsView({ projects, anchors, onOpenProject, onAddProject }: ProjectsViewProps) {
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

      <div className="projects-grid">
        {projects.map((project) => (
          <ProjectCard
            project={project}
            anchorCount={getProjectAnchorCount(anchors, project.id)}
            key={project.id}
            onClick={() => onOpenProject(project.id)}
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
}

function ProjectCard({ project, anchorCount, onClick }: ProjectCardProps) {
  return (
    <button className={`project-card card-${project.color}`} type="button" onClick={onClick}>
      <div className="project-card-top">
        <span className={`large-project-icon ${project.color}`}>
          <ProjectIcon icon={project.icon} size={21} />
        </span>
        <span className="project-card-arrow">
          <ArrowUpRight size={17} />
        </span>
      </div>
      <div className="project-card-copy">
        <h2>{project.name}</h2>
        <p>{project.description}</p>
      </div>
      <div className="project-card-footer">
        <span>{anchorCount} {anchorCount === 1 ? 'anchor' : 'anchors'}</span>
        <span>Open space</span>
      </div>
    </button>
  )
}

interface ProjectViewProps {
  project: Project
  anchors: Anchor[]
  onBack: () => void
  onAddAnchor: () => void
  onEditAnchor: (anchor: Anchor) => void
  onEditProject: () => void
  onTogglePinned: (anchorId: string) => void
}

function ProjectView({
  project,
  anchors,
  onBack,
  onAddAnchor,
  onEditAnchor,
  onEditProject,
  onTogglePinned,
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
  onClose: () => void
  onSubmit: (formData: AnchorFormData) => void
}

function AnchorComposer({ projects, defaultProjectId, onClose, onSubmit }: AnchorComposerProps) {
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

    if (!title.trim() || !body.trim() || (scope === 'project' && !projectId)) {
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
            maxLength={100}
          />
        </label>
        <label className="form-field">
          <span>Give it some context</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Why does this matter when you forget it?"
            rows={4}
            maxLength={320}
          />
          <small>{body.length}/320</small>
        </label>
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
                    {project.name}
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
          <button className="primary-button" type="submit" disabled={!title.trim() || !body.trim()}>
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
  onClose: () => void
  onSave: (anchor: Anchor) => void
  onDelete: (anchorId: string) => void
}

function AnchorEditModal({ anchor, projects, onClose, onSave, onDelete }: AnchorEditModalProps) {
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

    if (!title.trim() || !body.trim() || (scope === 'project' && !projectId)) {
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
        <label className="form-field">
          <span>What do you want to remember?</span>
          <input
            autoFocus
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Patience is part of the strategy."
            maxLength={100}
          />
        </label>
        <label className="form-field">
          <span>Give it some context</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Why does this matter when you forget it?"
            rows={4}
            maxLength={320}
          />
          <small>{body.length}/320</small>
        </label>
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
                    {project.name}
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
            <button className="primary-button" type="submit" disabled={!title.trim() || !body.trim()}>
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
  onClose: () => void
  onSubmit: (formData: ProjectFormData) => void
}

function ProjectComposer({ onClose, onSubmit }: ProjectComposerProps) {
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
  onClose: () => void
  onSave: (project: Project) => void
  onDelete: (projectId: string) => void
}

function ProjectEditModal({ project, onClose, onSave, onDelete }: ProjectEditModalProps) {
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
        <label className="form-field">
          <span>Project name</span>
          <input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Learn the piano" maxLength={48} />
        </label>
        <label className="form-field">
          <span>What is this space for? <em>optional</em></span>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="A short phrase to bring you back to the point." rows={3} maxLength={100} />
        </label>
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
  const handleDownload = () => {
    if (updateInfo.downloadUrl) {
      window.open(updateInfo.downloadUrl, '_blank')
    }
  }

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
            <button className="primary-button" type="button" onClick={handleDownload}>
              <Download size={15} />
              Download &amp; Update
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
  onAnchorThought: (thought: PhilosophyThought) => void
  onOpenDecision: () => void
  onAddAnchor: () => void
}

function DashboardView({
  anchorsCount,
  projectsCount,
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
                <span className="philosophy-school-tag">{item.school}</span>
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
