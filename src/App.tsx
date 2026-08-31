import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Anchor as AnchorIcon,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Clock3,
  Command,
  Compass,
  FolderOpen,
  Heart,
  Home,
  Layers3,
  Lightbulb,
  Menu,
  MoreHorizontal,
  PenLine,
  Pin,
  Plus,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  createId,
  filterAnchors,
  formatUpdatedAt,
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
  Project,
  ProjectIcon,
} from './lib/anchors'
import './App.css'

type View = 'home' | 'all' | 'global' | 'projects'

type AnchorFormData = Pick<Anchor, 'title' | 'body' | 'scope' | 'tag' | 'color' | 'pinned'> & {
  projectId?: string
}

type ProjectFormData = Pick<Project, 'name' | 'description' | 'color'>

const colorOptions: AccentColor[] = ['coral', 'sage', 'sky', 'gold', 'plum']

const colorLabels: Record<AccentColor, string> = {
  coral: 'Coral',
  sage: 'Sage',
  sky: 'Sky',
  gold: 'Gold',
  plum: 'Plum',
}

function App() {
  const [state, setState] = useState<AnchorState>(() => readAnchorState())
  const [activeView, setActiveView] = useState<View>('home')
  const [activeProjectId, setActiveProjectId] = useState<string>()
  const [listFilter, setListFilter] = useState<AnchorFilter>('all')
  const [query, setQuery] = useState('')
  const [spotlightIndex, setSpotlightIndex] = useState(0)
  const [isComposerOpen, setIsComposerOpen] = useState(false)
  const [isProjectComposerOpen, setIsProjectComposerOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [toast, setToast] = useState<string>()

  useEffect(() => {
    writeAnchorState(state)
  }, [state])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timeout = window.setTimeout(() => setToast(undefined), 3200)

    return () => window.clearTimeout(timeout)
  }, [toast])

  const pinnedAnchors = useMemo(
    () => state.anchors.filter((anchor) => anchor.pinned),
    [state.anchors],
  )
  const spotlight = pinnedAnchors[spotlightIndex % Math.max(pinnedAnchors.length, 1)]
  const activeProject = getProject(state.projects, activeProjectId)

  const navigate = (view: View, projectId?: string) => {
    setActiveView(view)
    setActiveProjectId(projectId)
    setListFilter(view === 'global' ? 'global' : 'all')
    setQuery('')
    setMobileMenuOpen(false)
  }

  const changeListFilter = (filter: AnchorFilter) => {
    setListFilter(filter)
    setActiveView(filter === 'global' ? 'global' : 'all')
    setActiveProjectId(undefined)
    setQuery('')
  }

  const openAnchorComposer = (projectId?: string) => {
    setActiveProjectId(projectId)
    setIsComposerOpen(true)
    setMobileMenuOpen(false)
  }

  const showToast = (message: string) => {
    setToast(message)
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

  const openSettings = () => {
    showToast('Settings will live here soon.')
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
        spotlightIndex={spotlightIndex}
        onNextSpotlight={() => setSpotlightIndex((index) => index + 1)}
        onRemember={markAsRemembered}
        onTogglePinned={togglePinned}
        onAddAnchor={() => openAnchorComposer()}
        onOpenAll={() => navigate('all')}
        onOpenProject={(projectId) => navigate('projects', projectId)}
        onOpenProjects={() => navigate('projects')}
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
    <div className="anchor-app">
      <aside className={`sidebar ${mobileMenuOpen ? 'sidebar-open' : ''}`}>
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">
            <AnchorIcon size={18} strokeWidth={2.5} />
          </div>
          <div className="brand-copy">
            <strong>anchor</strong>
            <span>your steady place</span>
          </div>
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
          <button className="settings-link" type="button" onClick={openSettings}>
            <Settings2 size={16} />
            <span>Settings</span>
          </button>
          <div className="user-row">
            <div className="avatar">A</div>
            <div className="user-copy">
              <strong>Alex Morgan</strong>
              <span>Personal space</span>
            </div>
            <button className="user-more" type="button" aria-label="Open profile menu" onClick={openSettings}>
              <MoreHorizontal size={17} />
            </button>
          </div>
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
                      : 'Projects')}
            </strong>
          </div>
          <div className="topbar-actions">
            <label className="top-search">
              <Search size={16} />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => {
                  if (activeView === 'home') {
                    navigate('all')
                  }
                }}
                placeholder="Search your anchors"
                aria-label="Search your anchors"
              />
              <kbd>
                <Command size={11} /> K
              </kbd>
            </label>
            <button className="icon-button notification-button" type="button" aria-label="Notifications" onClick={() => showToast('You are all caught up.') }>
              <Bell size={18} />
              <span className="notification-dot" />
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
          <MobileNavItem icon={Settings2} label="More" active={false} onClick={openSettings} />
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
}: HomeViewProps) {
  const recentAnchors = anchors.slice(0, 3)
  const dateLabel = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date())

  return (
    <div className="home-view page-enter">
      <div className="page-heading home-heading">
        <div>
          <p className="eyebrow">{dateLabel}</p>
          <h1>
            Good morning, Alex<span className="accent-dot">.</span>
          </h1>
          <p className="page-subtitle">Keep the things you&apos;ve learned close.</p>
        </div>
        <button className="primary-button" type="button" onClick={onAddAnchor}>
          <Plus size={17} />
          New anchor
        </button>
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
              {Array.from({ length: Math.min(pinnedCount, 4) }).map((_, index) => (
                <span className={index === spotlightIndex % 4 ? 'active' : ''} key={index} />
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
  onTogglePinned: (anchorId: string) => void
}

function AnchorListItem({ anchor, projects, onTogglePinned }: AnchorListItemProps) {
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
      <h3>{anchor.title}</h3>
      <p>{anchor.body}</p>
      <div className="anchor-item-footer">
        <span className="anchor-tag">{anchor.tag}</span>
        <span className="updated-label">
          <Clock3 size={12} />
          {formatUpdatedAt(anchor.updatedAt)}
        </span>
      </div>
    </article>
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
