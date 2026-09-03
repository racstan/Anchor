import { normalizeAnchorState } from './anchors'
import type { Anchor, AnchorAttachment, AnchorState, ChatMessage, Decision, EvidenceSource, Note, Project } from './anchors'
import type { NotificationSettings } from './notifications'

export interface UserProfile {
  name: string
  updatedAt?: string
}

export interface WorkspaceAISettings {
  providerId: string
  model: string
  baseUrl: string
  accountId: string
  // Optional for backwards compatibility with pre-AI-key sync snapshots.
  apiKey?: string
}

// Workspace exports omit the API key by default. Cloud sync explicitly opts in
// because a second device cannot use the synced AI connection without it. The
// Dropbox/WebDAV credentials and device PIN remain device-only.
export interface WorkspacePreferences {
  updatedAt?: string
  theme?: 'light' | 'dark'
  sidebarCollapsed?: boolean
  ai?: WorkspaceAISettings
  notifications?: NotificationSettings
}

export const PROFILE_STORAGE_KEY = 'anchor-user-profile-v1'
export const EMPTY_PROFILE: UserProfile = { name: '' }

export interface WorkspaceExport {
  format: 'anchor-workspace'
  version: 1
  exportedAt: string
  profile: UserProfile
  preferences: WorkspacePreferences
  state: AnchorState
}

export interface WorkspaceSerializationOptions {
  includeAIKey?: boolean
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

function isAnchorAttachment(value: unknown): value is AnchorAttachment {
  if (!isRecord(value)) {
    return false
  }

  if (
    !isString(value.id) ||
    !isString(value.name) ||
    !isString(value.url) ||
    (value.mimeType !== undefined && !isString(value.mimeType)) ||
    (value.size !== undefined && (typeof value.size !== 'number' || !Number.isFinite(value.size) || value.size < 0))
  ) {
    return false
  }

  if (value.source === 'link') {
    return value.kind === 'link' && /^https?:\/\//i.test(value.url)
  }

  return value.source === 'file' &&
    (value.kind === 'image' || value.kind === 'video' || value.kind === 'audio') &&
    value.url === `attachment:${value.id}`
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
    (value.evidence === undefined || isEvidenceSource(value.evidence)) &&
    (value.attachments === undefined || (Array.isArray(value.attachments) && value.attachments.every(isAnchorAttachment)))
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
    (value.anchorIds === undefined || (Array.isArray(value.anchorIds) && value.anchorIds.every(isString))) &&
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

  return {
    name: value.name.trim(),
    ...(isString(value.updatedAt) ? { updatedAt: value.updatedAt } : {}),
  }
}

function readWorkspacePreferencesValue(
  value: unknown,
  options: { includeAIKey?: boolean } = {},
): WorkspacePreferences {
  const includeAIKey = options.includeAIKey !== false

  if (!isRecord(value)) {
    return {}
  }

  const preferences: WorkspacePreferences = {}

  if (value.updatedAt !== undefined && isString(value.updatedAt)) {
    preferences.updatedAt = value.updatedAt
  }
  if (value.theme === 'light' || value.theme === 'dark') {
    preferences.theme = value.theme
  }
  if (typeof value.sidebarCollapsed === 'boolean') {
    preferences.sidebarCollapsed = value.sidebarCollapsed
  }

  if (isRecord(value.ai) && isString(value.ai.providerId) && isString(value.ai.model) && isString(value.ai.baseUrl) && isString(value.ai.accountId)) {
    preferences.ai = {
      providerId: value.ai.providerId,
      model: value.ai.model,
      baseUrl: value.ai.baseUrl,
      accountId: value.ai.accountId,
      ...(includeAIKey && isString(value.ai.apiKey) ? { apiKey: value.ai.apiKey } : {}),
    }
  }

  if (
    isRecord(value.notifications) &&
    typeof value.notifications.enabled === 'boolean' &&
    typeof value.notifications.aiResponses === 'boolean' &&
    typeof value.notifications.anchorReminders === 'boolean' &&
    typeof value.notifications.thoughtReminders === 'boolean' &&
    (value.notifications.frequency === 'off' || value.notifications.frequency === 'hourly' || value.notifications.frequency === 'daily' || value.notifications.frequency === 'weekdays' || value.notifications.frequency === 'weekly') &&
    isString(value.notifications.time) &&
    typeof value.notifications.weekday === 'number' &&
    Number.isInteger(value.notifications.weekday) &&
    value.notifications.weekday >= 1 &&
    value.notifications.weekday <= 7
  ) {
    preferences.notifications = {
      enabled: value.notifications.enabled,
      aiResponses: value.notifications.aiResponses,
      anchorReminders: value.notifications.anchorReminders,
      thoughtReminders: value.notifications.thoughtReminders,
      frequency: value.notifications.frequency,
      time: value.notifications.time,
      weekday: value.notifications.weekday,
    }
  }

  return preferences
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

export function createWorkspaceExport(
  state: AnchorState,
  profile: UserProfile,
  preferences: WorkspacePreferences = {},
  options: WorkspaceSerializationOptions = {},
): WorkspaceExport {
  const normalizedState = normalizeAnchorState(state)

  return {
    format: 'anchor-workspace',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: readProfileValue(profile),
    preferences: readWorkspacePreferencesValue(preferences, { includeAIKey: options.includeAIKey === true }),
    state: normalizedState,
  }
}

export function serializeWorkspaceExport(
  state: AnchorState,
  profile: UserProfile,
  preferences: WorkspacePreferences = {},
  options: WorkspaceSerializationOptions = {},
): string {
  return JSON.stringify(createWorkspaceExport(state, profile, preferences, options), null, 2)
}

export function parseWorkspaceExport(rawValue: string): {
  state: AnchorState
  profile: UserProfile
  preferences: WorkspacePreferences
} {
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
      preferences: readWorkspacePreferencesValue(parsedValue.preferences),
    }
  }

  return {
    state: validateState(parsedValue),
    profile: { ...EMPTY_PROFILE },
    preferences: {},
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

export function mergeWorkspacePreferences(
  current: WorkspacePreferences,
  incoming: WorkspacePreferences,
): WorkspacePreferences {
  const hasIncomingPreferences = Object.keys(incoming).length > 0
  if (!hasIncomingPreferences) {
    return current
  }

  if (
    (current.updatedAt && !incoming.updatedAt) ||
    (current.updatedAt && incoming.updatedAt && incoming.updatedAt < current.updatedAt)
  ) {
    return current
  }

  const mergedAI: WorkspaceAISettings | undefined = incoming.ai
    ? {
      ...(current.ai ?? incoming.ai),
      ...incoming.ai,
      ...(incoming.ai.apiKey === undefined && current.ai?.apiKey !== undefined
        ? { apiKey: current.ai.apiKey }
        : {}),
    }
    : current.ai

  return {
    ...current,
    ...incoming,
    ...(mergedAI ? { ai: mergedAI } : {}),
  }
}

export function mergeWorkspaceProfile(current: UserProfile, incoming: UserProfile): UserProfile {
  if (!incoming.name.trim()) {
    return current
  }

  if (
    (current.updatedAt && !incoming.updatedAt) ||
    (current.updatedAt && incoming.updatedAt && incoming.updatedAt < current.updatedAt)
  ) {
    return current
  }

  return readProfileValue(incoming)
}
