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

export interface EvidenceSource {
  label: string
  url: string
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
  evidence?: EvidenceSource
}

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: string
}

export interface Decision {
  id: string
  projectId?: string
  situation: string
  additionalContext: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface AnchorState {
  anchors: Anchor[]
  projects: Project[]
  decisions: Decision[]
}

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

export const initialState: AnchorState = {
  decisions: [],
  projects: [
    {
      id: 'evidence-informed-wellbeing',
      name: 'Evidence-informed wellbeing',
      description: 'Small practices, no miracle claims.',
      color: 'sage',
      icon: 'heart',
      createdAt: daysAgo(18),
    },
    {
      id: 'clearer-days',
      name: 'Clearer days',
      description: 'Make helpful actions easier to repeat.',
      color: 'sky',
      icon: 'spark',
      createdAt: daysAgo(11),
    },
  ],
  anchors: [
    {
      id: 'movement-adds-up',
      title: 'Small amounts of movement still count.',
      body: 'Work toward 150 minutes of moderate activity each week, but begin where you are. Short walks and smaller sessions can add up.',
      scope: 'global',
      tag: 'Movement',
      color: 'sage',
      pinned: true,
      createdAt: daysAgo(12),
      updatedAt: daysAgo(1),
      evidence: {
        label: 'WHO physical activity guidance',
        url: 'https://www.who.int/news-room/fact-sheets/detail/physical-activity',
      },
    },
    {
      id: 'protect-sleep-window',
      title: 'Protect a regular sleep window.',
      body: 'Keep a consistent sleep and wake time, dim bright light before bed, and seek clinical advice if sleep problems persist.',
      scope: 'global',
      tag: 'Sleep',
      color: 'sky',
      pinned: true,
      createdAt: daysAgo(9),
      updatedAt: daysAgo(3),
      evidence: {
        label: 'CDC sleep hygiene guidance',
        url: 'https://www.cdc.gov/sleep/about_sleep/sleep_hygiene.html',
      },
    },
    {
      id: 'build-meals-around-basics',
      title: 'Build meals around the basics.',
      body: 'Favor a varied pattern of vegetables, fruit, legumes, whole grains, nuts, and adequate protein. Treat supplements as something to discuss with a qualified professional.',
      scope: 'global',
      tag: 'Nutrition',
      color: 'gold',
      pinned: true,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(4),
      evidence: {
        label: 'WHO healthy diet guidance',
        url: 'https://www.who.int/news-room/fact-sheets/detail/healthy-diet',
      },
    },
    {
      id: 'slow-breathing-pause',
      title: 'Create a pause before reacting.',
      body: 'When stress rises, try a few slow breaths, then name one next action. Relaxation techniques can support coping, but they do not replace professional care.',
      scope: 'global',
      tag: 'Stress',
      color: 'plum',
      pinned: false,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
      evidence: {
        label: 'NCCIH relaxation techniques overview',
        url: 'https://www.nccih.nih.gov/health/relaxation-techniques-what-you-need-to-know',
      },
    },
    {
      id: 'bring-symptoms-to-care',
      title: 'Bring persistent symptoms to a clinician.',
      body: 'Note when a symptom started, what changes it, medicines or supplements you take, and your questions. Use the notes to support an assessment, not to self-diagnose.',
      scope: 'project',
      projectId: 'evidence-informed-wellbeing',
      tag: 'Health conversations',
      color: 'coral',
      pinned: true,
      createdAt: daysAgo(15),
      updatedAt: daysAgo(2),
      evidence: {
        label: 'MedlinePlus talking with your doctor',
        url: 'https://medlineplus.gov/ency/patientinstructions/000456.htm',
      },
    },
    {
      id: 'make-next-action-visible',
      title: 'Make the next action visible.',
      body: 'Write one small, observable action and when you will do it. If it keeps slipping, reduce the action again instead of judging yourself.',
      scope: 'project',
      projectId: 'clearer-days',
      tag: 'Follow-through',
      color: 'sky',
      pinned: false,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(5),
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

    return {
      ...parsedState,
      decisions: Array.isArray(parsedState.decisions) ? parsedState.decisions : [],
    }
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

export interface TextSearchMatch {
  indices: number[]
  score: number
}

export interface AnchorSearchMatch {
  score: number
  title: TextSearchMatch | null
  body: TextSearchMatch | null
  tag: TextSearchMatch | null
}

export function matchSearchText(value: string, query: string): TextSearchMatch | null {
  const normalizedQuery = query.trim().toLocaleLowerCase()

  if (!normalizedQuery) {
    return { indices: [], score: 0 }
  }

  const normalizedValue = value.toLocaleLowerCase()
  const indices: number[] = []
  let valueIndex = 0

  for (const character of normalizedQuery) {
    const matchIndex = normalizedValue.indexOf(character, valueIndex)

    if (matchIndex === -1) {
      return null
    }

    indices.push(matchIndex)
    valueIndex = matchIndex + 1
  }

  const span = indices[indices.length - 1] - indices[0]
  const consecutiveCharacters = indices.reduce(
    (total, index, position) => total + (position > 0 && index === indices[position - 1] + 1 ? 1 : 0),
    0,
  )
  const isSubstring = normalizedValue.includes(normalizedQuery)
  const startsWithQuery = normalizedValue.startsWith(normalizedQuery)
  const score =
    (isSubstring ? 1000 : 500) +
    (startsWithQuery ? 140 : 0) +
    consecutiveCharacters * 20 -
    indices[0] * 1.5 -
    span * 2

  return { indices, score }
}

export function getAnchorSearchMatch(anchor: Anchor, query: string): AnchorSearchMatch | null {
  if (!query.trim()) {
    return { score: 0, title: null, body: null, tag: null }
  }

  const title = matchSearchText(anchor.title, query)
  const body = matchSearchText(anchor.body, query)
  const tag = matchSearchText(anchor.tag, query)
  const weightedMatches = [
    { match: title, weight: 150 },
    { match: tag, weight: 80 },
    { match: body, weight: 20 },
  ].filter((entry): entry is { match: TextSearchMatch; weight: number } => entry.match !== null)

  if (weightedMatches.length === 0) {
    return null
  }

  const score = Math.max(...weightedMatches.map((entry) => entry.match.score + entry.weight))

  return { score, title, body, tag }
}

export function filterAnchors(
  anchors: Anchor[],
  filter: AnchorFilter,
  projectId: string | undefined,
  query: string,
): Anchor[] {
  const matches = anchors
    .filter((anchor) => {
      const matchesFilter =
        filter === 'all' ||
        (filter === 'global' && anchor.scope === 'global') ||
        (filter === 'projects' && anchor.scope === 'project')
      const matchesProject = !projectId || anchor.projectId === projectId

      return matchesFilter && matchesProject
    })
    .map((anchor) => ({ anchor, match: getAnchorSearchMatch(anchor, query) }))
    .filter((entry): entry is { anchor: Anchor; match: AnchorSearchMatch } => entry.match !== null)

  if (!query.trim()) {
    return matches.map((entry) => entry.anchor)
  }

  return matches
    .sort((first, second) => second.match.score - first.match.score)
    .map((entry) => entry.anchor)
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
