import { formatAnchorSerial, formatEntitySerial, matchSearchText } from './anchors'
import type { Anchor, Decision, Note, Project } from './anchors'
import type { AIToolDefinition } from './ai'
import type { NotificationSettings } from './notifications'

export interface WorkspaceToolInput {
  anchors: Anchor[]
  projects: Project[]
  notes: Note[]
  decisions: Decision[]
  notifications?: NotificationSettings
}

export interface WorkspaceToolset {
  definitions: readonly AIToolDefinition[]
  execute: (name: string, input: Record<string, unknown>) => string
}

type RecordKind = 'anchor' | 'project' | 'note' | 'decision'
type SearchKind = RecordKind | 'all'

interface SearchRecord {
  kind: RecordKind
  id: string
  reference: string
  title: string
  summary: string
  searchText: string
  project?: string
  updatedAt: string
}

export const WORKSPACE_AI_TOOLS: readonly AIToolDefinition[] = [
  {
    name: 'search_workspace',
    description: 'Find relevant anchors, projects, notes, and decision rooms by title, content, tag, reference, or ID.',
    input: '{"query":"words to find", "kind":"all|anchor|project|note|decision", "limit":8}',
  },
  {
    name: 'get_anchor',
    description: 'Read one exact anchor, including its full context, project, evidence, and attachments.',
    input: '{"id":"machine ID or readable reference"}',
  },
  {
    name: 'get_project',
    description: 'Read one exact project and its anchors.',
    input: '{"id":"machine ID, project name, or P-0001"}',
  },
  {
    name: 'get_note',
    description: 'Read one exact saved note.',
    input: '{"id":"machine ID, title, or N-0001"}',
  },
  {
    name: 'get_decision',
    description: 'Read one exact decision room, including its situation and recent conversation.',
    input: '{"id":"machine ID, title, or D-0001"}',
  },
  {
    name: 'get_workspace_overview',
    description: 'Read workspace totals and a short list of recently updated records.',
    input: '{}',
  },
  {
    name: 'get_notification_settings',
    description: 'Read the current notification permission choices and reminder schedule.',
    input: '{}',
  },
]

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function limit(value: unknown, fallback = 8): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(1, Math.min(12, Math.floor(value)))
    : fallback
}

function compact(value: string, maxLength: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}…` : normalized
}

function decisionTitle(decision: Decision): string {
  return decision.title?.trim() || compact(decision.situation, 90) || 'Untitled decision'
}

function recordMatches(record: SearchRecord, id: string): boolean {
  const query = id.toLocaleLowerCase()
  return [record.id, record.reference, record.title].some((value) => value.toLocaleLowerCase() === query)
}

function readRecord(
  records: SearchRecord[],
  kind: RecordKind,
  id: string,
): SearchRecord | undefined {
  const normalizedId = id.toLocaleLowerCase()
  return records.find((record) => record.kind === kind && recordMatches(record, normalizedId))
}

function serializeAnchor(anchor: Anchor, projectName: string | undefined): Record<string, unknown> {
  return {
    kind: 'anchor',
    id: anchor.id,
    reference: formatAnchorSerial(anchor, projectName),
    title: anchor.title,
    body: anchor.body,
    scope: anchor.scope,
    projectId: anchor.projectId,
    project: projectName,
    tag: anchor.tag,
    color: anchor.color,
    pinned: anchor.pinned,
    evidence: anchor.evidence,
    attachments: anchor.attachments ?? [],
    createdAt: anchor.createdAt,
    updatedAt: anchor.updatedAt,
  }
}

function serializeProject(project: Project, anchors: Anchor[]): Record<string, unknown> {
  return {
    kind: 'project',
    id: project.id,
    reference: formatEntitySerial('P', project.serialNumber),
    name: project.name,
    description: project.description,
    anchors: anchors
      .filter((anchor) => anchor.projectId === project.id)
      .map((anchor) => ({
        id: anchor.id,
        reference: formatAnchorSerial(anchor, project.name),
        title: anchor.title,
        body: compact(anchor.body, 500),
        pinned: anchor.pinned,
      })),
    createdAt: project.createdAt,
    updatedAt: project.updatedAt ?? project.createdAt,
  }
}

function serializeNote(note: Note): Record<string, unknown> {
  return {
    kind: 'note',
    id: note.id,
    reference: formatEntitySerial('N', note.serialNumber),
    title: note.title,
    content: note.content,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}

function serializeDecision(decision: Decision): Record<string, unknown> {
  return {
    kind: 'decision',
    id: decision.id,
    reference: formatEntitySerial('D', decision.serialNumber),
    title: decisionTitle(decision),
    situation: decision.situation,
    additionalContext: decision.additionalContext,
    projectId: decision.projectId,
    anchorIds: decision.anchorIds ?? [],
    noteIds: decision.noteIds ?? [],
    messages: decision.messages.slice(-12).map((message) => ({
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
    })),
    createdAt: decision.createdAt,
    updatedAt: decision.updatedAt,
  }
}

function safeJson(value: unknown): string {
  try {
    return JSON.stringify(value)
  } catch {
    return JSON.stringify({ error: 'The workspace record could not be serialized.' })
  }
}

export function createWorkspaceToolset(workspace: WorkspaceToolInput): WorkspaceToolset {
  const projectNames = new Map(workspace.projects.map((project) => [project.id, project.name]))
  const searchRecords: SearchRecord[] = [
    ...workspace.anchors.map((anchor) => ({
      kind: 'anchor' as const,
      id: anchor.id,
      reference: formatAnchorSerial(anchor, anchor.projectId ? projectNames.get(anchor.projectId) ?? anchor.projectId : ''),
      title: anchor.title || 'Untitled anchor',
      summary: compact(anchor.body, 360),
      searchText: [
        anchor.title,
        anchor.body,
        anchor.tag,
        anchor.evidence?.label,
        anchor.id,
        formatAnchorSerial(anchor, anchor.projectId ? projectNames.get(anchor.projectId) ?? anchor.projectId : ''),
        anchor.projectId ? projectNames.get(anchor.projectId) ?? anchor.projectId : '',
      ].filter(Boolean).join(' '),
      project: anchor.projectId ? projectNames.get(anchor.projectId) ?? 'Unknown project' : undefined,
      updatedAt: anchor.updatedAt,
    })),
    ...workspace.projects.map((project) => ({
      kind: 'project' as const,
      id: project.id,
      reference: formatEntitySerial('P', project.serialNumber),
      title: project.name,
      summary: compact(project.description, 360),
      searchText: [project.name, project.description, project.id, formatEntitySerial('P', project.serialNumber)].join(' '),
      updatedAt: project.updatedAt ?? project.createdAt,
    })),
    ...workspace.notes.map((note) => ({
      kind: 'note' as const,
      id: note.id,
      reference: formatEntitySerial('N', note.serialNumber),
      title: note.title || 'Untitled note',
      summary: compact(note.content, 360),
      searchText: [note.title, note.content, note.id, formatEntitySerial('N', note.serialNumber)].join(' '),
      updatedAt: note.updatedAt,
    })),
    ...workspace.decisions.map((decision) => ({
      kind: 'decision' as const,
      id: decision.id,
      reference: formatEntitySerial('D', decision.serialNumber),
      title: decisionTitle(decision),
      summary: compact(`${decision.situation} ${decision.additionalContext}`, 360),
      searchText: [
        decisionTitle(decision),
        decision.situation,
        decision.additionalContext,
        decision.messages.map((message) => message.content).join(' '),
        decision.id,
        formatEntitySerial('D', decision.serialNumber),
      ].join(' '),
      updatedAt: decision.updatedAt,
    })),
  ]

  const findById = (kind: RecordKind, value: unknown): SearchRecord | undefined => {
    const id = text(value)
    if (!id) return undefined
    return readRecord(searchRecords, kind, id)
  }

  const execute = (name: string, input: Record<string, unknown>): string => {
    if (name === 'search_workspace') {
      const query = text(input.query)
      const kind = text(input.kind) as SearchKind
      const allowedKind: SearchKind = ['all', 'anchor', 'project', 'note', 'decision'].includes(kind) ? kind : 'all'
      const results = searchRecords
        .filter((record) => allowedKind === 'all' || record.kind === allowedKind)
        .map((record, index) => ({
          record,
          index,
          match: query ? matchSearchText(record.searchText, query) : { score: 0, indices: [] },
        }))
        .filter((entry) => entry.match !== null)
        .sort((first, second) => (second.match?.score ?? 0) - (first.match?.score ?? 0) || Date.parse(second.record.updatedAt) - Date.parse(first.record.updatedAt) || first.index - second.index)
        .slice(0, limit(input.limit))
        .map(({ record }) => ({
          kind: record.kind,
          id: record.id,
          reference: record.reference,
          title: record.title,
          summary: record.summary || 'No summary.',
          ...(record.project ? { project: record.project } : {}),
          updatedAt: record.updatedAt,
        }))

      return safeJson({ query, kind: allowedKind, results, note: 'These are local workspace records. Use an exact id or reference with a get tool for full detail.' })
    }

    if (name === 'get_notification_settings') {
      if (!workspace.notifications) {
        return safeJson({ error: 'Notification settings are not available in this context.' })
      }
      return safeJson({
        enabled: workspace.notifications.enabled,
        aiResponses: workspace.notifications.aiResponses,
        anchorReminders: workspace.notifications.anchorReminders,
        thoughtReminders: workspace.notifications.thoughtReminders,
        schedule: {
          type: workspace.notifications.frequency,
          time: workspace.notifications.time,
          weekday: workspace.notifications.weekday,
          weekdays: workspace.notifications.weekdays,
          intervalMinutes: workspace.notifications.intervalMinutes,
        },
      })
    }

    if (name === 'get_workspace_overview') {
      const recent = [...searchRecords]
        .sort((first, second) => Date.parse(second.updatedAt) - Date.parse(first.updatedAt))
        .slice(0, 8)
        .map((record) => ({ kind: record.kind, id: record.id, reference: record.reference, title: record.title, updatedAt: record.updatedAt }))
      return safeJson({
        counts: {
          anchors: workspace.anchors.length,
          projects: workspace.projects.length,
          notes: workspace.notes.length,
          decisions: workspace.decisions.length,
        },
        recent,
      })
    }

    if (name === 'get_anchor') {
      const record = findById('anchor', input.id)
      const anchor = record ? workspace.anchors.find((item) => item.id === record.id) : undefined
      return anchor
        ? safeJson(serializeAnchor(anchor, anchor.projectId ? projectNames.get(anchor.projectId) ?? anchor.projectId : undefined))
        : safeJson({ error: 'Anchor not found. Search the workspace first and use the exact id or reference.' })
    }

    if (name === 'get_project') {
      const record = findById('project', input.id)
      const project = record ? workspace.projects.find((item) => item.id === record.id) : undefined
      return project
        ? safeJson(serializeProject(project, workspace.anchors))
        : safeJson({ error: 'Project not found. Search the workspace first and use the exact id or reference.' })
    }

    if (name === 'get_note') {
      const record = findById('note', input.id)
      const note = record ? workspace.notes.find((item) => item.id === record.id) : undefined
      return note
        ? safeJson(serializeNote(note))
        : safeJson({ error: 'Note not found. Search the workspace first and use the exact id or reference.' })
    }

    if (name === 'get_decision') {
      const record = findById('decision', input.id)
      const decision = record ? workspace.decisions.find((item) => item.id === record.id) : undefined
      return decision
        ? safeJson(serializeDecision(decision))
        : safeJson({ error: 'Decision room not found. Search the workspace first and use the exact id or reference.' })
    }

    return safeJson({ error: `Unknown workspace tool: ${name}` })
  }

  return { definitions: WORKSPACE_AI_TOOLS, execute }
}
