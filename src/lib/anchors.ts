export type AnchorScope = 'global' | 'project'
export type AnchorFilter = 'all' | 'global' | 'projects'
export type AccentColor = 'coral' | 'sage' | 'sky' | 'gold' | 'plum'
export type ProjectIcon = 'chart' | 'pen' | 'heart' | 'spark'
export type EntitySerialPrefix = 'A' | 'P' | 'D' | 'N' | 'M' | 'W'

interface SerialRecord {
  serialNumber?: number
}

export interface Project extends SerialRecord {
  id: string
  name: string
  description: string
  color: AccentColor
  icon: ProjectIcon
  createdAt: string
  updatedAt?: string
}

export interface EvidenceSource {
  label: string
  url: string
}

export type AnchorAttachmentKind = 'image' | 'video' | 'audio' | 'link'
export type AnchorAttachmentSource = 'file' | 'link'

export interface AnchorAttachment {
  id: string
  kind: AnchorAttachmentKind
  source: AnchorAttachmentSource
  name: string
  url: string
  mimeType?: string
  size?: number
}

export interface Anchor extends SerialRecord {
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
  attachments?: AnchorAttachment[]
}

export type ChatRole = 'user' | 'assistant'

export interface ChatMessage extends SerialRecord {
  id: string
  role: ChatRole
  content: string
  createdAt: string
}

export interface Decision extends SerialRecord {
  id: string
  title?: string
  projectId?: string
  noteIds?: string[]
  anchorIds?: string[]
  situation: string
  additionalContext: string
  messages: ChatMessage[]
  createdAt: string
  updatedAt: string
}

export interface Note extends SerialRecord {
  id: string
  title: string
  content: string
  createdAt: string
  updatedAt: string
}

export interface AnchorState {
  anchors: Anchor[]
  projects: Project[]
  decisions: Decision[]
  notes: Note[]
}

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

export const initialState: AnchorState = {
  decisions: [],
  notes: [],
  projects: [
    {
      id: 'evidence-informed-wellbeing',
      serialNumber: 1,
      name: 'Evidence-informed wellbeing',
      description: 'Small practices, no miracle claims.',
      color: 'sage',
      icon: 'heart',
      createdAt: daysAgo(18),
      updatedAt: daysAgo(18),
    },
    {
      id: 'clearer-days',
      serialNumber: 2,
      name: 'Clearer days',
      description: 'Make helpful actions easier to repeat.',
      color: 'sky',
      icon: 'spark',
      createdAt: daysAgo(11),
      updatedAt: daysAgo(11),
    },
  ],
  anchors: [
    {
      id: 'movement-adds-up',
      serialNumber: 1,
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
      serialNumber: 2,
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
      serialNumber: 3,
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
      serialNumber: 4,
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
      serialNumber: 5,
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
      serialNumber: 6,
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

export function formatEntitySerial(prefix: EntitySerialPrefix, serialNumber: number | undefined): string {
  const safeSerial = Number.isInteger(serialNumber) && (serialNumber ?? 0) > 0 ? serialNumber : 0

  return `${prefix}-${String(safeSerial).padStart(4, '0')}`
}

export function nextSerialNumber(records: SerialRecord[]): number {
  return records.reduce((highest, record) => {
    const serial = record.serialNumber
    return Number.isInteger(serial) && (serial ?? 0) > highest ? serial ?? highest : highest
  }, 0) + 1
}

function normalizeSerials<T extends SerialRecord>(records: T[]): T[] {
  const used = new Set<number>()
  let next = nextSerialNumber(records)

  return records.map((record) => {
    const candidate = record.serialNumber
    const hasUsableCandidate = Number.isInteger(candidate) && (candidate ?? 0) > 0 && !used.has(candidate ?? 0)
    const serialNumber = hasUsableCandidate ? candidate ?? next : next++

    used.add(serialNumber)
    return { ...record, serialNumber }
  })
}

export function normalizeAnchorState(state: AnchorState): AnchorState {
  const projects = normalizeSerials(state.projects).map((project) => ({
    ...project,
    updatedAt: project.updatedAt || project.createdAt,
  }))
  const decisions = normalizeSerials(state.decisions).map((decision) => ({
    ...decision,
    messages: normalizeSerials(decision.messages),
  }))

  return {
    projects,
    anchors: normalizeSerials(state.anchors),
    decisions,
    notes: normalizeSerials(state.notes),
  }
}

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

    return normalizeAnchorState({
      anchors: parsedState.anchors,
      projects: parsedState.projects,
      decisions: Array.isArray(parsedState.decisions) ? parsedState.decisions : [],
      notes: Array.isArray(parsedState.notes) ? parsedState.notes : [],
    })
  } catch {
    return cloneInitialState()
  }
}

export function writeAnchorState(state: AnchorState): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeAnchorState(state)))
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
  attachments: TextSearchMatch | null
  id: TextSearchMatch | null
  serial: TextSearchMatch | null
}

export function matchSearchText(value: string, query: string): TextSearchMatch | null {
  const normalizedQuery = query.trim().toLocaleLowerCase()

  if (!normalizedQuery) {
    return { indices: [], score: 0 }
  }

  const normalizedValue = value.toLocaleLowerCase()
  const sequentialIndices: number[] = []
  let valueIndex = 0
  let matchedSequential = true

  for (const character of normalizedQuery) {
    const matchIndex = normalizedValue.indexOf(character, valueIndex)

    if (matchIndex === -1) {
      matchedSequential = false
      break
    }

    sequentialIndices.push(matchIndex)
    valueIndex = matchIndex + 1
  }

  if (matchedSequential) {
    const span = sequentialIndices[sequentialIndices.length - 1] - sequentialIndices[0]
    const consecutiveCharacters = sequentialIndices.reduce(
      (total, index, position) => total + (position > 0 && index === sequentialIndices[position - 1] + 1 ? 1 : 0),
      0,
    )
    const isSubstring = normalizedValue.includes(normalizedQuery)
    const startsWithQuery = normalizedValue.startsWith(normalizedQuery)
    const score =
      (isSubstring ? 1000 : 500) +
      (startsWithQuery ? 140 : 0) +
      consecutiveCharacters * 20 -
      sequentialIndices[0] * 1.5 -
      span * 2

    return { indices: sequentialIndices, score }
  }

  const words = normalizedQuery.split(/\s+/).filter(Boolean)
  if (words.length > 1) {
    const wordIndices: number[] = []
    let totalScore = 0
    let allWordsMatched = true

    for (const word of words) {
      const wordMatch = matchSearchText(value, word)
      if (!wordMatch) {
        allWordsMatched = false
        break
      }
      wordIndices.push(...wordMatch.indices)
      totalScore += wordMatch.score
    }

    if (allWordsMatched) {
      const uniqueIndices = Array.from(new Set(wordIndices)).sort((a, b) => a - b)
      return { indices: uniqueIndices, score: totalScore }
    }
  }

  return null
}

export function getAnchorSearchMatch(anchor: Anchor, query: string): AnchorSearchMatch | null {
  if (!query.trim()) {
    return { score: 0, title: null, body: null, tag: null, attachments: null, id: null, serial: null }
  }

  const title = matchSearchText(anchor.title, query)
  const body = matchSearchText(anchor.body, query)
  const tag = matchSearchText(anchor.tag, query)
  const attachmentText = anchor.attachments?.map((attachment) => `${attachment.name} ${attachment.url}`).join(' ') ?? ''
  const attachments = matchSearchText(attachmentText, query)
  const id = matchSearchText(anchor.id, query)
  const serial = matchSearchText(formatEntitySerial('A', anchor.serialNumber), query)
  const evidence = anchor.evidence ? matchSearchText(anchor.evidence.label, query) : null

  const weightedMatches = [
    { match: title, weight: 150 },
    { match: serial, weight: 130 },
    { match: id, weight: 120 },
    { match: tag, weight: 80 },
    { match: body, weight: 20 },
    { match: attachments, weight: 35 },
    { match: evidence, weight: 40 },
  ].filter((entry): entry is { match: TextSearchMatch; weight: number } => entry.match !== null)

  if (weightedMatches.length === 0) {
    return null
  }

  const score = Math.max(...weightedMatches.map((entry) => entry.match.score + entry.weight))

  return { score, title, body, tag, attachments, id, serial }
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

export function formatUpdatedAt(updatedAt: string, now = Date.now()): string {
  const time = new Date(updatedAt).getTime()

  if (Number.isNaN(time)) {
    return 'Recently updated'
  }

  const elapsed = Math.max(0, now - time)
  const elapsedMinutes = Math.floor(elapsed / (60 * 1000))
  const elapsedHours = Math.floor(elapsed / (60 * 60 * 1000))
  const elapsedDays = Math.floor(elapsed / (24 * 60 * 60 * 1000))

  if (elapsedMinutes < 2) {
    return 'Updated just now'
  }

  if (elapsedHours < 1) {
    return `Updated ${elapsedMinutes}m ago`
  }

  if (elapsedHours < 24 && new Date(updatedAt).toDateString() === new Date(now).toDateString()) {
    return `Updated ${elapsedHours}h ago`
  }

  if (elapsedDays <= 1) {
    return 'Updated yesterday'
  }

  return `Updated ${elapsedDays} days ago`
}

export function formatTimestamp(value: string | undefined): string {
  if (!value) {
    return 'Time not recorded'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Time not recorded'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
