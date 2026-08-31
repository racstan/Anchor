import { useEffect, useMemo, useRef, useState } from 'react'
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
  TrendingUp,
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
  Project,
  ProjectIcon,
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
import './App.css'

type View = 'home' | 'all' | 'global' | 'projects' | 'decide' | 'settings'

type AnchorFormData = Pick<Anchor, 'title' | 'body' | 'scope' | 'tag' | 'color' | 'pinned'> & {
  projectId?: string
}

type ProjectFormData = Pick<Project, 'name' | 'description' | 'color'>
type Theme = 'light' | 'dark'

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

function App() {
  const [state, setState] = useState<AnchorState>(() => readAnchorState())
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
  const [isProjectComposerOpen, setIsProjectComposerOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toast, setToast] = useState<string>()
  const topSearchRef = useRef<HTMLInputElement>(null)
  const searchWrapRef = useRef<HTMLDivElement>(null)
  const notificationWrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    writeAnchorState(state)
  }, [state])

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

  const showToast = (message: string) => {
    setToast(message)
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

  let pageContent: React.ReactNode

  if (activeProjectId && activeProject) {
    pageContent = (
      <ProjectView
        project={activeProject}
        anchors={state.anchors}
        onBack={() => navigate('projects')}
        onAddAnchor={() => openAnchorComposer(activeProject.id)}
        onTogglePinned={togglePinned}
      />
    )
  } else if (activeView === 'home') {
    pageContent = (
      <HomeView
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
        onAddAnchor={() => openAnchorComposer()}
        onOpenAll={() => navigate('all')}
        onOpenProject={(projectId) => navigate('projects', projectId)}
        onOpenProjects={() => navigate('projects')}
        onOpenDecision={() => navigate('decide')}
      />
    )
  } else if (activeView === 'decide') {
    pageContent = (
      <DecisionView
        projects={state.projects}
        anchors={state.anchors}
        settings={aiSettings}
        decisions={state.decisions}
        onOpenSettings={() => navigate('settings')}
        onSaveDecision={saveDecision}
      />
    )
  } else if (activeView === 'settings') {
    pageContent = (
      <SettingsView
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
      />
    )
  } else if (activeView === 'projects') {
    pageContent = (
      <ProjectsView
        projects={state.projects}
        anchors={state.anchors}
        onOpenProject={(projectId) => navigate('projects', projectId)}
        onAddProject={() => setIsProjectComposerOpen(true)}
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
        onTogglePinned={togglePinned}
      />
    )
  }

  return (
    <div className={`anchor-app ${theme === 'dark' ? 'theme-dark' : ''}`}>
      <aside className={`sidebar ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            <AnchorIcon size={18} strokeWidth={2.5} />
          </div>
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
            icon={Layers3}
            label="All anchors"
            active={activeView === 'all' && !activeProjectId}
            onClick={() => navigate('all')}
            count={state.anchors.length}
          />
          <NavItem
            icon={Compass}
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
            <span className="avatar">A</span>
            <span className="user-copy">
              <strong>Alex Morgan</strong>
              <span>Personal space</span>
            </span>
            <span className="user-more" aria-hidden="true">
              <MoreHorizontal size={17} />
            </span>
          </button>
        </div>
      </aside>

      <div className="app-main">
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
            <button
              className="icon-button theme-toggle"
              type="button"
              aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
              onClick={() => setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="top-avatar">A</div>
          </div>
        </header>

        <main className="page-content">{pageContent}</main>

        <nav className="mobile-nav" aria-label="Mobile navigation">
          <MobileNavItem icon={Home} label="Today" active={activeView === 'home' && !activeProjectId} onClick={() => navigate('home')} />
          <MobileNavItem icon={Layers3} label="Anchors" active={(activeView === 'all' || activeView === 'global') && !activeProjectId} onClick={() => navigate('all')} />
          <button className="mobile-add" type="button" aria-label="Add anchor" onClick={() => openAnchorComposer()}>
            <Plus size={21} />
          </button>
          <MobileNavItem icon={FolderOpen} label="Projects" active={activeView === 'projects'} onClick={() => navigate('projects')} />
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
      {isProjectComposerOpen && (
        <ProjectComposer onClose={() => setIsProjectComposerOpen(false)} onSubmit={addProject} />
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
    <button className={`nav-item ${active ? 'active' : ''}`} type="button" onClick={onClick}>
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
  icon: ProjectIcon
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
  anchors: Anchor[]
  projects: Project[]
  spotlight?: Anchor
  pinnedCount: number
  spotlightIndex: number
  onNextSpotlight: () => void
  onRemember: (anchorId: string) => void
  onTogglePinned: (anchorId: string) => void
  onAddAnchor: () => void
  onOpenAll: () => void
  onOpenProject: (projectId: string) => void
  onOpenProjects: () => void
  onOpenDecision: () => void
}

function HomeView({
  anchors,
  projects,
  spotlight,
  pinnedCount,
  spotlightIndex,
  onNextSpotlight,
  onRemember,
  onTogglePinned,
  onAddAnchor,
  onOpenAll,
  onOpenProject,
  onOpenProjects,
  onOpenDecision,
}: HomeViewProps) {
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
        <div>
          <p className="eyebrow">{dateLabel}</p>
          <h1>
            Happy morning, dear Alex<span className="accent-dot">.</span>
          </h1>
          <p className="page-subtitle">Keep the things you&apos;ve learned close.</p>
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
                <button className="spotlight-menu" type="button" aria-label="More spotlight options">
                  <MoreHorizontal size={18} />
                </button>
              </div>
              {spotlight ? (
                <>
                  <blockquote>{spotlight.title}</blockquote>
                  <p className="spotlight-body">{spotlight.body}</p>
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
}

function AnchorListItem({ anchor, projects, query, onTogglePinned }: AnchorListItemProps) {
  const project = getProject(projects, anchor.projectId)

  return (
    <article className={`anchor-item accent-${anchor.color}`}>
      <div className="anchor-item-header">
        <div className="anchor-context">
          <span className={`context-dot ${anchor.color}`} />
          <span>{project?.name ?? 'Global context'}</span>
        </div>
        <button
          className={`pin-button ${anchor.pinned ? 'pinned' : ''}`}
          type="button"
          aria-label={anchor.pinned ? 'Unpin anchor' : 'Pin anchor'}
          onClick={() => onTogglePinned(anchor.id)}
        >
          <Pin size={16} fill={anchor.pinned ? 'currentColor' : 'none'} />
        </button>
      </div>
      <h3><HighlightedText value={anchor.title} query={query} /></h3>
      <p><HighlightedText value={anchor.body} query={query} /></p>
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
  projects: Project[]
  anchors: Anchor[]
  settings: AISettings
  decisions: Decision[]
  onOpenSettings: () => void
  onSaveDecision: (decision: Decision) => void
}

function decisionSystemPrompt(
  project: Project | undefined,
  projectAnchors: Anchor[],
  globalAnchors: Anchor[],
): string {
  const projectContext = project
    ? `\nImported project: ${project.name}\nProject description: ${project.description}\nProject anchors:\n${projectAnchors.map((anchor) => `- ${anchor.title}: ${anchor.body}`).join('\n') || '- No project anchors yet.'}`
    : '\nNo project was imported. Treat this as a personal, general decision.'
  const globalContext = globalAnchors.length
    ? `\nGlobal context the person chose to keep close:\n${globalAnchors.map((anchor) => `- ${anchor.title}: ${anchor.body}`).join('\n')}`
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
  projects,
  anchors,
  settings,
  decisions,
  onOpenSettings,
  onSaveDecision,
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
      ? `\n\nIMPORTED PROJECT CONTEXT\nProject: ${selectedProject.name}\nDescription: ${selectedProject.description}\nAnchors:\n${projectAnchors.map((anchor) => `- ${anchor.title}: ${anchor.body}`).join('\n') || '- None yet.'}`
      : ''
    const globalContextText = globalAnchors.length
      ? `\n\nGLOBAL ANCHORS\n${globalAnchors.map((anchor) => `- ${anchor.title}: ${anchor.body}`).join('\n')}`
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
          <h1>Happy thinking, dear Alex<span className="accent-dot">.</span></h1>
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
                <button
                  className={`decision-history-item ${activeDecisionId === decision.id ? 'active' : ''}`}
                  type="button"
                  key={decision.id}
                  onClick={() => loadDecision(decision)}
                >
                  <span className="history-orb"><MessageCircle size={13} /></span>
                  <span>{decisionPreview(decision)}</span>
                  <ChevronRight size={13} />
                </button>
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
}

function SettingsView({
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
}: SettingsViewProps) {
  const [showKey, setShowKey] = useState(false)
  const provider = AI_PROVIDERS.find((item) => item.id === settings.providerId) ?? AI_PROVIDERS[0]
  const currentModelIsLoaded = availableModels.some((model) => model.id === settings.model)

  return (
    <div className="settings-view page-enter">
      <div className="page-heading settings-heading">
        <div>
          <p className="eyebrow">A space that works your way</p>
          <h1>Settings, dear Alex<span className="accent-dot">.</span></h1>
          <p className="page-subtitle">Choose how Anchor thinks with you, and make the room feel like yours.</p>
        </div>
      </div>

      <div className="settings-layout">
        <section className="settings-card ai-settings-card">
          <div className="settings-card-heading">
            <span className="settings-card-icon ai"><SlidersHorizontal size={18} /></span>
            <div>
              <p className="eyebrow">Decision companion</p>
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

        <div className="settings-side-column">
          <section className="settings-card appearance-card">
            <div className="settings-card-heading compact">
              <span className="settings-card-icon appearance"><Sun size={18} /></span>
              <div>
                <p className="eyebrow">The atmosphere</p>
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

          <section className="settings-card privacy-card">
            <div className="settings-card-heading compact">
              <span className="settings-card-icon privacy"><ShieldCheck size={18} /></span>
              <div>
                <p className="eyebrow">Your trust matters</p>
                <h2>Private by default</h2>
              </div>
            </div>
            <p className="settings-card-copy">Your key and connection settings stay in this device&apos;s local storage. Anchor only sends your decision context when you press the thinking button.</p>
            <div className="privacy-note"><KeyRound size={14} /> For a public production release, add a secure server-side proxy before storing keys.</div>
          </section>

          <section className="settings-card profile-card">
            <div className="settings-card-heading compact">
              <span className="settings-card-icon profile"><UserRound size={18} /></span>
              <div>
                <p className="eyebrow">This is your room</p>
                <h2>Personal space</h2>
              </div>
            </div>
            <div className="profile-preview"><span className="avatar">A</span><div><strong>Alex Morgan</strong><span>Happy to have you here.</span></div></div>
          </section>
        </div>
      </div>
    </div>
  )
}

interface ProjectsViewProps {
  projects: Project[]
  anchors: Anchor[]
  onOpenProject: (projectId: string) => void
  onAddProject: () => void
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
  onTogglePinned: (anchorId: string) => void
}

function ProjectView({ project, anchors, onBack, onAddAnchor, onTogglePinned }: ProjectViewProps) {
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
        <button className="project-hero-more" type="button" aria-label="More project options">
          <MoreHorizontal size={19} />
        </button>
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
        <button className="secondary-button" type="button" onClick={onAddAnchor}>
          <Plus size={16} />
          Add context
        </button>
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

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!title.trim() || !body.trim() || (scope === 'project' && !projectId)) {
      return
    }

    onSubmit({
      title: title.trim(),
      body: body.trim(),
      tag: tag.trim() || (scope === 'global' ? 'Personal' : 'Project note'),
      scope,
      projectId: scope === 'project' ? projectId : undefined,
      color,
      pinned,
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

export default App
