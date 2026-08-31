export type AnchorScope = 'global' | 'project'
export type AnchorFilter = 'all' | 'global' | 'projects'
export type AccentColor = 'coral' | 'sage' | 'sky' | 'gold' | 'plum'
export type ProjectIcon = 'chart' | 'pen' | 'heart' | 'spark'

export interface Project {
  id: string
  name: string
  description: string
  color: AccentColor
  icon: ProjectIcon
  createdAt: string
}

export interface Anchor {
  id: string
  title: string
  body: string
  scope: AnchorScope
  projectId?: string
  tag: string
  color: AccentColor
  pinned: boolean
  createdAt: string
  updatedAt: string
  lastSeenAt?: string
}

export interface AnchorState {
  anchors: Anchor[]
  projects: Project[]
}

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

export const initialState: AnchorState = {
  projects: [
    {
      id: 'trading-discipline',
      name: 'Trading discipline',
      description: 'Stay patient. Follow the plan.',
      color: 'coral',
      icon: 'chart',
      createdAt: daysAgo(38),
    },
    {
      id: 'small-studio',
      name: 'Small studio',
      description: 'Build slowly, share often.',
      color: 'sky',
      icon: 'pen',
      createdAt: daysAgo(18),
    },
    {
      id: 'feel-better',
      name: 'Feel better',
      description: 'Energy before efficiency.',
      color: 'sage',
      icon: 'heart',
      createdAt: daysAgo(11),
    },
  ],
  anchors: [
    {
      id: 'pause-before-pivot',
      title: 'Pause before you pivot.',
      body: 'A new idea is not automatically a better direction. Give the current one a fair, quiet attempt before you abandon it.',
      scope: 'global',
      tag: 'Decision making',
      color: 'coral',
      pinned: true,
      createdAt: daysAgo(12),
      updatedAt: daysAgo(1),
    },
    {
      id: 'write-it-down',
      title: 'Write it down. Don’t carry it.',
      body: 'If a thought matters, put it somewhere trustworthy. Your brain is for noticing, not storing every open loop.',
      scope: 'global',
      tag: 'Mental space',
      color: 'sage',
      pinned: true,
      createdAt: daysAgo(9),
      updatedAt: daysAgo(3),
    },
    {
      id: 'make-next-step-smaller',
      title: 'Make the next step smaller.',
      body: 'When everything feels urgent, find the one action that takes less than ten minutes.',
      scope: 'global',
      tag: 'Momentum',
      color: 'gold',
      pinned: false,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(4),
    },
    {
      id: 'feelings-are-signals',
      title: 'Feelings are signals, not commands.',
      body: 'Notice what is here without handing it the steering wheel. You can choose the next move with care.',
      scope: 'global',
      tag: 'Self-trust',
      color: 'plum',
      pinned: false,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
    {
      id: 'trade-the-plan',
      title: 'Trade the plan, not the outcome.',
      body: 'The job is to execute the setup. A win is not proof of skill; a loss is not proof of failure.',
      scope: 'project',
      projectId: 'trading-discipline',
      tag: 'Strategy',
      color: 'coral',
      pinned: true,
      createdAt: daysAgo(35),
      updatedAt: daysAgo(2),
    },
    {
      id: 'patience-is-strategy',
      title: 'Patience is part of the strategy.',
      body: 'No setup means no trade. Boredom is not an entry signal.',
      scope: 'project',
      projectId: 'trading-discipline',
      tag: 'Patience',
      color: 'gold',
      pinned: true,
      createdAt: daysAgo(30),
      updatedAt: daysAgo(7),
    },
    {
      id: 'no-revenge-trades',
      title: 'No revenge trades.',
      body: 'After a loss, step away for 20 minutes and come back only if the setup is still valid.',
      scope: 'project',
      projectId: 'trading-discipline',
      tag: 'Risk',
      color: 'plum',
      pinned: false,
      createdAt: daysAgo(28),
      updatedAt: daysAgo(5),
    },
    {
      id: 'ship-the-first-version',
      title: 'Let version one be visible.',
      body: 'A finished, imperfect thing can teach you more than a perfect idea kept in your head.',
      scope: 'project',
      projectId: 'small-studio',
      tag: 'Momentum',
      color: 'sky',
      pinned: true,
      createdAt: daysAgo(16),
      updatedAt: daysAgo(1),
    },
    {
      id: 'protect-morning-energy',
      title: 'Protect the first hour.',
      body: 'Before the world asks for your attention, give your body water, light, and a little quiet.',
      scope: 'project',
      projectId: 'feel-better',
      tag: 'Energy',
      color: 'sage',
      pinned: false,
      createdAt: daysAgo(9),
      updatedAt: daysAgo(6),
    },
  ],
}

export const STORAGE_KEY = 'anchor-state-v1'

export function cloneInitialState(): AnchorState {
  return JSON.parse(JSON.stringify(initialState)) as AnchorState
}

export function readAnchorState(): AnchorState {
  if (typeof window === 'undefined') {
    return cloneInitialState()
  }

  try {
    const savedState = window.localStorage.getItem(STORAGE_KEY)

    if (!savedState) {
      return cloneInitialState()
    }

    const parsedState = JSON.parse(savedState) as AnchorState

    if (!Array.isArray(parsedState.anchors) || !Array.isArray(parsedState.projects)) {
      return cloneInitialState()
    }

    return parsedState
  } catch {
    return cloneInitialState()
  }
}

export function writeAnchorState(state: AnchorState): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function filterAnchors(
  anchors: Anchor[],
  filter: AnchorFilter,
  projectId: string | undefined,
  query: string,
): Anchor[] {
  const normalizedQuery = query.trim().toLowerCase()

  return anchors.filter((anchor) => {
    const matchesFilter =
      filter === 'all' ||
      (filter === 'global' && anchor.scope === 'global') ||
      (filter === 'projects' && anchor.scope === 'project')
    const matchesProject = !projectId || anchor.projectId === projectId
    const searchableText = `${anchor.title} ${anchor.body} ${anchor.tag}`.toLowerCase()
    const matchesQuery = !normalizedQuery || searchableText.includes(normalizedQuery)

    return matchesFilter && matchesProject && matchesQuery
  })
}

export function getProjectAnchorCount(anchors: Anchor[], projectId: string): number {
  return anchors.filter((anchor) => anchor.projectId === projectId).length
}

export function getProject(projects: Project[], projectId: string | undefined): Project | undefined {
  return projects.find((project) => project.id === projectId)
}

export function createId(prefix: string): string {
  const randomPart =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2)

  return `${prefix}-${randomPart}`
}

export function formatUpdatedAt(updatedAt: string): string {
  const elapsed = Date.now() - new Date(updatedAt).getTime()
  const elapsedDays = Math.floor(elapsed / (24 * 60 * 60 * 1000))

  if (elapsedDays <= 0) {
    return 'Updated today'
  }

  if (elapsedDays === 1) {
    return 'Updated yesterday'
  }

  return `Updated ${elapsedDays} days ago`
}
