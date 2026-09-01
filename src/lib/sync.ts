import type { AnchorState } from './anchors'
import type { UserProfile } from './workspace'
import { parseWorkspaceExport, serializeWorkspaceExport } from './workspace'

export type SyncProviderType = 'none' | 'dropbox' | 'webdav'

export interface SyncSettings {
  enabled: boolean
  provider: SyncProviderType
  vaultName: string
  autoSyncOnStartup: boolean
  autoSyncIntervalMinutes: number
  // Dropbox
  dropboxAppKey?: string
  dropboxAccessToken?: string
  dropboxPath?: string
  // WebDAV
  webdavUrl?: string
  webdavUsername?: string
  webdavPassword?: string
  // Optional Encryption Password (E2EE)
  encryptionPassword?: string
  // Metadata
  lastSyncedAt?: string
  lastSyncStatus?: 'idle' | 'syncing' | 'success' | 'error'
  lastSyncMessage?: string
}

export const SYNC_SETTINGS_STORAGE_KEY = 'anchor-sync-settings-v1'

export const DEFAULT_DROPBOX_APP_KEY = ''

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  enabled: false,
  provider: 'none',
  vaultName: 'anchor-vault',
  autoSyncOnStartup: true,
  autoSyncIntervalMinutes: 15,
  dropboxPath: '/anchor-vault.json',
  lastSyncStatus: 'idle',
}

export function getDropboxAuthUrl(appKey: string, redirectUri?: string): string {
  const finalRedirect = redirectUri || (typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : '')
  const params = new URLSearchParams({
    client_id: appKey.trim(),
    response_type: 'token',
    redirect_uri: finalRedirect,
    token_access_type: 'offline',
  })
  return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`
}

export function startDropboxOAuth(appKey: string, inNewTab = true): void {
  if (typeof window === 'undefined') return
  if (!appKey.trim()) {
    throw new Error('Please enter your Dropbox App Key first.')
  }
  const authUrl = getDropboxAuthUrl(appKey)
  if (inNewTab) {
    window.open(authUrl, '_blank')
  } else {
    window.location.href = authUrl
  }
}

export function extractDropboxOAuthToken(): string | null {
  if (typeof window === 'undefined') return null

  // 1. Check URL hash: #access_token=...&account_id=...
  if (window.location.hash) {
    const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
    const params = new URLSearchParams(hash)
    const token = params.get('access_token')
    if (token) {
      return token
    }
  }

  // 2. Check query params: ?access_token=...
  if (window.location.search) {
    const params = new URLSearchParams(window.location.search)
    const token = params.get('access_token')
    if (token) {
      return token
    }
  }

  return null
}

export interface SyncResult {
  success: boolean
  message: string
  mergedState?: AnchorState
  mergedProfile?: UserProfile
  timestamp: string
}

// -------------------------------------------------------------
// End-to-End Encryption (E2EE) Helpers with Web Crypto API
// -------------------------------------------------------------

function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}

export async function encryptVault(plaintext: string, password: string): Promise<string> {
  const encoder = new TextEncoder()
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt'],
  )

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoder.encode(plaintext),
  )

  const payload = {
    format: 'anchor-encrypted-vault',
    version: 1,
    salt: bufferToBase64(salt.buffer),
    iv: bufferToBase64(iv.buffer),
    data: bufferToBase64(encrypted),
  }

  return JSON.stringify(payload)
}

export async function decryptVault(payloadString: string, password: string): Promise<string> {
  try {
    const payload = JSON.parse(payloadString)
    if (payload.format !== 'anchor-encrypted-vault' || !payload.salt || !payload.iv || !payload.data) {
      // Not encrypted, return as is
      return payloadString
    }

    const encoder = new TextEncoder()
    const decoder = new TextDecoder()
    const salt = new Uint8Array(base64ToBuffer(payload.salt))
    const iv = new Uint8Array(base64ToBuffer(payload.iv))
    const encryptedData = base64ToBuffer(payload.data)

    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveKey'],
    )

    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt,
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt'],
    )

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      encryptedData,
    )

    return decoder.decode(decrypted)
  } catch (error) {
    if (error instanceof Error && error.name === 'OperationError') {
      throw new Error('Incorrect sync encryption password. Could not decrypt vault.')
    }
    throw error
  }
}

// -------------------------------------------------------------
// Timestamp-Aware CRDT Merge
// -------------------------------------------------------------

function mergeRecordsByTimestamp<T extends { id: string; updatedAt?: string; createdAt?: string }>(
  current: T[],
  incoming: T[],
): T[] {
  const map = new Map<string, T>()

  current.forEach((item) => {
    map.set(item.id, item)
  })

  incoming.forEach((incomingItem) => {
    const existing = map.get(incomingItem.id)
    if (!existing) {
      map.set(incomingItem.id, incomingItem)
      return
    }

    const incomingTime = incomingItem.updatedAt || incomingItem.createdAt || ''
    const existingTime = existing.updatedAt || existing.createdAt || ''

    if (incomingTime >= existingTime) {
      map.set(incomingItem.id, incomingItem)
    }
  })

  return Array.from(map.values())
}

export function mergeSyncState(current: AnchorState, incoming: AnchorState): AnchorState {
  return {
    anchors: mergeRecordsByTimestamp(current.anchors, incoming.anchors),
    projects: mergeRecordsByTimestamp(current.projects, incoming.projects),
    decisions: mergeRecordsByTimestamp(current.decisions, incoming.decisions),
  }
}

// -------------------------------------------------------------
// Remote Storage Providers (Dropbox & WebDAV)
// -------------------------------------------------------------

function normalizeRemotePath(vaultName: string, customPath?: string): string {
  const cleanVault = (vaultName.trim() || 'anchor-vault').replace(/[^a-zA-Z0-9_-]/g, '_')
  if (customPath && customPath.trim().startsWith('/')) {
    return customPath.trim()
  }
  return `/${cleanVault}.json`
}

// Dropbox API v2 implementation
export async function downloadDropboxVault(
  accessToken: string,
  vaultName: string,
  customPath?: string,
): Promise<string | null> {
  const path = normalizeRemotePath(vaultName, customPath)

  const response = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      'Dropbox-API-Arg': JSON.stringify({ path }),
    },
  })

  if (response.status === 409 || response.status === 404) {
    // File does not exist yet
    return null
  }

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Dropbox download error (HTTP ${response.status}): ${errorText || response.statusText}`)
  }

  return response.text()
}

export async function uploadDropboxVault(
  accessToken: string,
  vaultName: string,
  content: string,
  customPath?: string,
): Promise<void> {
  const path = normalizeRemotePath(vaultName, customPath)

  const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      'Dropbox-API-Arg': JSON.stringify({
        path,
        mode: 'overwrite',
        autorename: false,
        mute: true,
        strict_conflict: false,
      }),
      'Content-Type': 'application/octet-stream',
    },
    body: new TextEncoder().encode(content),
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => '')
    throw new Error(`Dropbox upload error (HTTP ${response.status}): ${errorText || response.statusText}`)
  }
}

export async function testDropboxConnection(accessToken: string): Promise<string> {
  const response = await fetch('https://api.dropboxapi.com/2/users/get_current_account', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
    },
  })

  if (!response.ok) {
    throw new Error('Invalid Dropbox access token. Please check credentials.')
  }

  const data = await response.json()
  const name = data.name?.display_name || data.email || 'Connected user'
  return `Connected to Dropbox account: ${name}`
}

// WebDAV implementation
export async function downloadWebDAVVault(settings: SyncSettings): Promise<string | null> {
  if (!settings.webdavUrl) throw new Error('WebDAV URL is required.')

  const path = normalizeRemotePath(settings.vaultName, '')
  const fullUrl = settings.webdavUrl.replace(/\/+$/, '') + path
  const headers: HeadersInit = {}

  if (settings.webdavUsername && settings.webdavPassword) {
    headers.Authorization = `Basic ${btoa(`${settings.webdavUsername}:${settings.webdavPassword}`)}`
  }

  const response = await fetch(fullUrl, { method: 'GET', headers })

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`WebDAV download failed (HTTP ${response.status})`)
  }

  return response.text()
}

export async function uploadWebDAVVault(settings: SyncSettings, content: string): Promise<void> {
  if (!settings.webdavUrl) throw new Error('WebDAV URL is required.')

  const path = normalizeRemotePath(settings.vaultName, '')
  const fullUrl = settings.webdavUrl.replace(/\/+$/, '') + path
  const headers: HeadersInit = {
    'Content-Type': 'application/json; charset=utf-8',
  }

  if (settings.webdavUsername && settings.webdavPassword) {
    headers.Authorization = `Basic ${btoa(`${settings.webdavUsername}:${settings.webdavPassword}`)}`
  }

  const response = await fetch(fullUrl, {
    method: 'PUT',
    headers,
    body: new TextEncoder().encode(content),
  })

  if (!response.ok) {
    throw new Error(`WebDAV upload failed (HTTP ${response.status})`)
  }
}

// -------------------------------------------------------------
// Orchestrated Multi-Device Sync Pipeline
// -------------------------------------------------------------

export async function executeWorkspaceSync(
  localState: AnchorState,
  localProfile: UserProfile,
  settings: SyncSettings,
): Promise<SyncResult> {
  const timestamp = new Date().toISOString()

  if (!settings.enabled || settings.provider === 'none') {
    return {
      success: false,
      message: 'Cloud sync is not enabled.',
      timestamp,
    }
  }

  try {
    let remotePayload: string | null = null

    // 1. Download Remote Data
    if (settings.provider === 'dropbox') {
      if (!settings.dropboxAccessToken?.trim()) {
        throw new Error('Dropbox Access Token is missing. Enter your token in Settings.')
      }
      remotePayload = await downloadDropboxVault(
        settings.dropboxAccessToken,
        settings.vaultName,
        settings.dropboxPath,
      )
    } else if (settings.provider === 'webdav') {
      remotePayload = await downloadWebDAVVault(settings)
    }

    let mergedState = localState
    let mergedProfile = localProfile

    // 2. Decrypt & Merge if Remote Data Exists
    if (remotePayload) {
      let plaintextRemote = remotePayload
      if (settings.encryptionPassword) {
        plaintextRemote = await decryptVault(remotePayload, settings.encryptionPassword)
      }

      const parsedRemote = parseWorkspaceExport(plaintextRemote)
      mergedState = mergeSyncState(localState, parsedRemote.state)
      mergedProfile = {
        name: localProfile.name.trim() || parsedRemote.profile.name.trim() || 'friend',
      }
    }

    // 3. Prepare Upload Payload (Encrypt if password set)
    let uploadContent = serializeWorkspaceExport(mergedState, mergedProfile)
    if (settings.encryptionPassword) {
      uploadContent = await encryptVault(uploadContent, settings.encryptionPassword)
    }

    // 4. Upload Merged Result to Remote
    if (settings.provider === 'dropbox' && settings.dropboxAccessToken) {
      await uploadDropboxVault(
        settings.dropboxAccessToken,
        settings.vaultName,
        uploadContent,
        settings.dropboxPath,
      )
    } else if (settings.provider === 'webdav') {
      await uploadWebDAVVault(settings, uploadContent)
    }

    const providerLabel = settings.provider === 'dropbox' ? 'Dropbox' : 'WebDAV'

    return {
      success: true,
      message: `Vault synced with ${providerLabel} (${settings.vaultName})`,
      mergedState,
      mergedProfile,
      timestamp,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown sync failure.'
    return {
      success: false,
      message: errorMsg,
      timestamp,
    }
  }
}

// -------------------------------------------------------------
// Storage Persistence for Sync Settings
// -------------------------------------------------------------

export function readSyncSettings(): SyncSettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_SYNC_SETTINGS }
  }

  try {
    const raw = window.localStorage.getItem(SYNC_SETTINGS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_SYNC_SETTINGS }
    return { ...DEFAULT_SYNC_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SYNC_SETTINGS }
  }
}

export function writeSyncSettings(settings: SyncSettings): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SYNC_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Local storage quota or unavailable
  }
}
