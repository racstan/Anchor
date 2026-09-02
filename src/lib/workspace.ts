import { normalizeAnchorState } from './anchors'
import type { Anchor, AnchorState, ChatMessage, Decision, EvidenceSource, Note, Project } from './anchors'

export interface UserProfile {
  name: string
}

export const PROFILE_STORAGE_KEY = 'anchor-user-profile-v1'
export const EMPTY_PROFILE: UserProfile = { name: '' }

export interface WorkspaceExport {
  format: 'anchor-workspace'
  version: 1
  exportedAt: string
  profile: UserProfile
  state: AnchorState
}

const accentColors = new Set(['coral', 'sage', 'sky', 'gold', 'plum'])
const projectIcons = new Set(['chart', 'pen', 'heart', 'spark'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string'
}

function isEvidenceSource(value: unknown): value is EvidenceSource {
  if (!isRecord(value)) {
    return false
  }

  return isString(value.label) && isString(value.url) && /^https?:\/\//i.test(value.url)
}

function isAnchor(value: unknown): value is Anchor {
  if (!isRecord(value)) {
    return false
  }

  return isString(value.id) &&
    (value.serialNumber === undefined || (typeof value.serialNumber === 'number' && Number.isInteger(value.serialNumber) && value.serialNumber > 0)) &&
    isString(value.title) &&
    isString(value.body) &&
    (value.scope === 'global' || value.scope === 'project') &&
    isString(value.tag) &&
    isString(value.color) && accentColors.has(value.color) &&
    typeof value.pinned === 'boolean' &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    (value.projectId === undefined || isString(value.projectId)) &&
    (value.lastSeenAt === undefined || isString(value.lastSeenAt)) &&
    (value.evidence === undefined || isEvidenceSource(value.evidence))
}

function isProject(value: unknown): value is Project {
  if (!isRecord(value)) {
    return false
  }

  return isString(value.id) &&
    (value.serialNumber === undefined || (typeof value.serialNumber === 'number' && Number.isInteger(value.serialNumber) && value.serialNumber > 0)) &&
    isString(value.name) &&
    isString(value.description) &&
    isString(value.color) && accentColors.has(value.color) &&
    isString(value.icon) && projectIcons.has(value.icon) &&
    isString(value.createdAt) &&
    (value.updatedAt === undefined || isString(value.updatedAt))
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (!isRecord(value)) {
    return false
  }

  return isString(value.id) &&
    (value.serialNumber === undefined || (typeof value.serialNumber === 'number' && Number.isInteger(value.serialNumber) && value.serialNumber > 0)) &&
    (value.role === 'user' || value.role === 'assistant') &&
    isString(value.content) &&
    isString(value.createdAt)
}

function isDecision(value: unknown): value is Decision {
  if (!isRecord(value)) {
    return false
  }

  return isString(value.id) &&
    (value.serialNumber === undefined || (typeof value.serialNumber === 'number' && Number.isInteger(value.serialNumber) && value.serialNumber > 0)) &&
    (value.title === undefined || isString(value.title)) &&
    (value.projectId === undefined || isString(value.projectId)) &&
    (value.noteIds === undefined || (Array.isArray(value.noteIds) && value.noteIds.every(isString))) &&
    isString(value.situation) &&
    isString(value.additionalContext) &&
    Array.isArray(value.messages) && value.messages.every(isChatMessage) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
}

function isNote(value: unknown): value is Note {
  if (!isRecord(value)) {
    return false
  }

  return isString(value.id) &&
    (value.serialNumber === undefined || (typeof value.serialNumber === 'number' && Number.isInteger(value.serialNumber) && value.serialNumber > 0)) &&
    isString(value.title) &&
    isString(value.content) &&
    isString(value.createdAt) &&
    isString(value.updatedAt)
}

function validateState(value: unknown): AnchorState {
  if (!isRecord(value) || !Array.isArray(value.anchors) || !value.anchors.every(isAnchor)) {
    throw new Error('This backup does not contain a valid anchor list.')
  }

  if (!Array.isArray(value.projects) || !value.projects.every(isProject)) {
    throw new Error('This backup does not contain a valid project list.')
  }

  if (value.decisions !== undefined && (!Array.isArray(value.decisions) || !value.decisions.every(isDecision))) {
    throw new Error('This backup does not contain valid decision history.')
  }

  if (value.notes !== undefined && (!Array.isArray(value.notes) || !value.notes.every(isNote))) {
    throw new Error('This backup does not contain valid notes.')
  }

  return normalizeAnchorState({
    anchors: value.anchors,
    projects: value.projects,
    decisions: value.decisions ?? [],
    notes: value.notes ?? [],
  })
}

function readProfileValue(value: unknown): UserProfile {
  if (!isRecord(value) || !isString(value.name)) {
    return { ...EMPTY_PROFILE }
  }

  return { name: value.name.trim() }
}

export function readUserProfile(): UserProfile {
  if (typeof window === 'undefined') {
    return { ...EMPTY_PROFILE }
  }

  try {
    const savedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY)

    return savedProfile ? readProfileValue(JSON.parse(savedProfile)) : { ...EMPTY_PROFILE }
  } catch {
    return { ...EMPTY_PROFILE }
  }
}

export function writeUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(readProfileValue(profile)))
}

export function createWorkspaceExport(state: AnchorState, profile: UserProfile): WorkspaceExport {
  const normalizedState = normalizeAnchorState(state)

  return {
    format: 'anchor-workspace',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: readProfileValue(profile),
    state: normalizedState,
  }
}

export function serializeWorkspaceExport(state: AnchorState, profile: UserProfile): string {
  return JSON.stringify(createWorkspaceExport(state, profile), null, 2)
}

export function parseWorkspaceExport(rawValue: string): { state: AnchorState; profile: UserProfile } {
  let parsedValue: unknown

  try {
    parsedValue = JSON.parse(rawValue) as unknown
  } catch {
    throw new Error('That file is not valid JSON.')
  }

  if (isRecord(parsedValue) && parsedValue.format === 'anchor-workspace') {
    if (parsedValue.version !== 1) {
      throw new Error('This Anchor backup uses a version that is not supported yet.')
    }

    return {
      state: validateState(parsedValue.state),
      profile: readProfileValue(parsedValue.profile),
    }
  }

  return {
    state: validateState(parsedValue),
    profile: { ...EMPTY_PROFILE },
  }
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const merged = new Map(current.map((item) => [item.id, item]))

  incoming.forEach((item) => merged.set(item.id, item))

  return Array.from(merged.values())
}

export function mergeWorkspaceState(current: AnchorState, incoming: AnchorState): AnchorState {
  return normalizeAnchorState({
    anchors: mergeById(current.anchors, incoming.anchors),
    projects: mergeById(current.projects, incoming.projects),
    decisions: mergeById(current.decisions, incoming.decisions),
    notes: mergeById(current.notes, incoming.notes),
  })
}
