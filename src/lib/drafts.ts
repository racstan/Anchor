export type DraftKind = 'anchor' | 'project' | 'note' | 'decision' | 'profile'

export interface StoredDraft<T> {
  key: string
  kind: DraftKind
  updatedAt: string
  data: T
}

const DRAFT_STORAGE_PREFIX = 'anchor-draft-v1:'
const DRAFT_VERSION = 1

function storageKey(key: string): string {
  return `${DRAFT_STORAGE_PREFIX}${key}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseStoredDraft<T>(key: string, kind: DraftKind, rawValue: string): StoredDraft<T> | undefined {
  try {
    const parsed = JSON.parse(rawValue) as unknown

    if (!isRecord(parsed) || parsed.version !== DRAFT_VERSION || parsed.kind !== kind || typeof parsed.updatedAt !== 'string' || !('data' in parsed)) {
      return undefined
    }

    return {
      key,
      kind,
      updatedAt: parsed.updatedAt,
      data: parsed.data as T,
    }
  } catch {
    return undefined
  }
}

export function readDraft<T>(key: string, kind: DraftKind): StoredDraft<T> | undefined {
  if (typeof window === 'undefined') {
    return undefined
  }

  try {
    const rawValue = window.localStorage.getItem(storageKey(key))
    return rawValue ? parseStoredDraft<T>(key, kind, rawValue) : undefined
  } catch {
    return undefined
  }
}

export function listDrafts<T>(kind: DraftKind): StoredDraft<T>[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const drafts: StoredDraft<T>[] = []

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const storedKey = window.localStorage.key(index)

      if (!storedKey?.startsWith(DRAFT_STORAGE_PREFIX)) {
        continue
      }

      const key = storedKey.slice(DRAFT_STORAGE_PREFIX.length)
      const rawValue = window.localStorage.getItem(storedKey)
      if (!rawValue) {
        continue
      }

      const draft = parseStoredDraft<T>(key, kind, rawValue)
      if (draft) {
        drafts.push(draft)
      }
    }

    return drafts.sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
  } catch {
    return []
  }
}

export function writeDraft<T>(key: string, kind: DraftKind, data: T): boolean {
  if (typeof window === 'undefined') {
    return false
  }

  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify({
      version: DRAFT_VERSION,
      kind,
      updatedAt: new Date().toISOString(),
      data,
    }))
    return true
  } catch {
    // Drafts are a safety net. A storage quota or privacy setting should not
    // interrupt the writing experience.
    return false
  }
}

export function removeDraft(key: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(storageKey(key))
  } catch {
    // Persistence is optional when storage is unavailable.
  }
}
