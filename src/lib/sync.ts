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
  dropboxRefreshToken?: string
  dropboxTokenExpiresAt?: number
  dropboxAccountId?: string
  dropboxPath?: string
  // WebDAV
  webdavUrl?: string
  webdavUsername?: string
  webdavPassword?: string
  // Metadata
  lastSyncedAt?: string
  lastSyncStatus?: 'idle' | 'syncing' | 'success' | 'error'
  lastSyncMessage?: string
}

export const SYNC_SETTINGS_STORAGE_KEY = 'anchor-sync-settings-v1'
export const DROPBOX_CALLBACK_PATH = '/dropbox/callback'
export const DEFAULT_VAULT_NAME = 'Anchor'
export const DROPBOX_BACKUP_FILE = 'anchor-vault.json'

// Dropbox client IDs are public. The release is preconfigured for normal users;
// self-hosted builds can override this with VITE_DROPBOX_APP_KEY.
const RELEASE_DROPBOX_APP_KEY = 'dsc3rxf2meqb4t8'
const LEGACY_DROPBOX_APP_KEYS = new Set(['k0k64j5r7z0u32b'])
const LEGACY_DROPBOX_BACKUP_PATH = '/anchor-vault.json'
export const DEFAULT_DROPBOX_APP_KEY = (
  import.meta.env.VITE_DROPBOX_APP_KEY || RELEASE_DROPBOX_APP_KEY
).trim()

const DROPBOX_TOKEN_ENDPOINT = 'https://api.dropboxapi.com/oauth2/token'
const DROPBOX_API_ENDPOINT = 'https://api.dropboxapi.com/2'
const DROPBOX_OAUTH_STORAGE_KEY = 'anchor-dropbox-oauth-pkce-v1'
const DROPBOX_TOKEN_SKEW_MS = 60_000

export const DEFAULT_SYNC_SETTINGS: SyncSettings = {
  enabled: false,
  provider: 'none',
  vaultName: DEFAULT_VAULT_NAME,
  autoSyncOnStartup: true,
  autoSyncIntervalMinutes: 15,
  dropboxAppKey: DEFAULT_DROPBOX_APP_KEY,
  dropboxPath: `/${DEFAULT_VAULT_NAME}/${DROPBOX_BACKUP_FILE}`,
  lastSyncStatus: 'idle',
}

function base64UrlEncode(value: ArrayBuffer | Uint8Array): string {
  const bytes = value instanceof Uint8Array ? value : new Uint8Array(value)
  let binary = ''
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function randomUrlString(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return base64UrlEncode(bytes)
}

function getDropboxOAuthStorage(): Storage | undefined {
  if (typeof window === 'undefined') return undefined

  try {
    return window.localStorage
  } catch {
    return undefined
  }
}

function getDropboxErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === 'object' && payload !== null) {
    if ('error_description' in payload && typeof payload.error_description === 'string') {
      return payload.error_description
    }
    if ('error_summary' in payload && typeof payload.error_summary === 'string') {
      return payload.error_summary
    }
    if ('error' in payload && typeof payload.error === 'string') {
      return payload.error
    }
  }

  return fallback
}

export function getDropboxRedirectUri(redirectUri?: string): string {
  if (redirectUri?.trim()) return redirectUri.trim()
  if (typeof window === 'undefined') return DROPBOX_CALLBACK_PATH
  return `${window.location.origin}${DROPBOX_CALLBACK_PATH}`
}

export function getDropboxVaultFolder(vaultName = DEFAULT_VAULT_NAME): string {
  const cleanVault = (vaultName.trim() || DEFAULT_VAULT_NAME).replace(/[^a-zA-Z0-9_-]/g, '_')
  return `/${cleanVault}`
}

export function getDropboxBackupPath(vaultName = DEFAULT_VAULT_NAME): string {
  return `${getDropboxVaultFolder(vaultName)}/${DROPBOX_BACKUP_FILE}`
}

export function getDropboxAuthUrl(
  appKey = DEFAULT_DROPBOX_APP_KEY,
  redirectUri?: string,
  codeChallenge?: string,
  state?: string,
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: appKey.trim(),
    redirect_uri: getDropboxRedirectUri(redirectUri),
    token_access_type: 'offline',
  })

  if (codeChallenge) params.set('code_challenge_method', 'S256')
  if (codeChallenge) params.set('code_challenge', codeChallenge)
  if (state) params.set('state', state)

  return `https://www.dropbox.com/oauth2/authorize?${params.toString()}`
}

export async function startDropboxOAuth(
  appKey = DEFAULT_DROPBOX_APP_KEY,
  inNewTab = false,
): Promise<void> {
  if (typeof window === 'undefined') return
  const trimmedAppKey = appKey.trim()
  if (!trimmedAppKey) {
    throw new Error('Dropbox is not configured for this Anchor release.')
  }
  const browserCrypto = globalThis.crypto
  if (!browserCrypto?.subtle || !browserCrypto?.getRandomValues) {
    throw new Error('This browser cannot create the secure Dropbox authorization request.')
  }

  const verifier = randomUrlString(48)
  const challenge = base64UrlEncode(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)))
  const state = randomUrlString(32)
  const storage = getDropboxOAuthStorage()
  storage?.setItem(DROPBOX_OAUTH_STORAGE_KEY, JSON.stringify({
    verifier,
    state,
    appKey: trimmedAppKey,
    createdAt: Date.now(),
  }))

  const authUrl = getDropboxAuthUrl(trimmedAppKey, undefined, challenge, state)
  if (inNewTab) {
    const popup = window.open(authUrl, '_blank', 'noopener,noreferrer')
    if (!popup) window.location.href = authUrl
  } else {
    window.location.href = authUrl
  }
}

export interface DropboxOAuthResult {
  accessToken: string
  refreshToken?: string
  expiresAt?: number
  accountId?: string
  uid?: string
}

export async function completeDropboxOAuth(): Promise<DropboxOAuthResult | null> {
  if (typeof window === 'undefined') return null
  const callbackPath = window.location.pathname.replace(/\/$/, '') || '/'
  if (callbackPath !== DROPBOX_CALLBACK_PATH) return null

  const params = new URLSearchParams(window.location.search)
  const oauthError = params.get('error')
  if (oauthError) {
    getDropboxOAuthStorage()?.removeItem(DROPBOX_OAUTH_STORAGE_KEY)
    throw new Error(params.get('error_description') || `Dropbox authorization was ${oauthError.replace(/_/g, ' ')}.`)
  }

  const code = params.get('code')
  if (!code) return null

  const storage = getDropboxOAuthStorage()
  const rawSession = storage?.getItem(DROPBOX_OAUTH_STORAGE_KEY)
  if (!rawSession) {
    throw new Error('The Dropbox authorization session expired. Please click Connect Dropbox again.')
  }

  let session: { verifier?: string; state?: string; appKey?: string; createdAt?: number }
  try {
    session = JSON.parse(rawSession) as typeof session
  } catch {
    storage?.removeItem(DROPBOX_OAUTH_STORAGE_KEY)
    throw new Error('The Dropbox authorization session was invalid. Please try again.')
  }

  if (!session.verifier || !session.state || !session.appKey || (session.createdAt && Date.now() - session.createdAt > 10 * 60 * 1000)) {
    storage?.removeItem(DROPBOX_OAUTH_STORAGE_KEY)
    throw new Error('The Dropbox authorization session expired. Please click Connect Dropbox again.')
  }
  if (params.get('state') !== session.state) {
    storage?.removeItem(DROPBOX_OAUTH_STORAGE_KEY)
    throw new Error('Dropbox authorization state did not match. Please try again.')
  }

  const response = await fetch(DROPBOX_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: session.appKey,
      redirect_uri: getDropboxRedirectUri(),
      code_verifier: session.verifier,
    }),
  })
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  storage?.removeItem(DROPBOX_OAUTH_STORAGE_KEY)

  if (!response.ok || typeof payload.access_token !== 'string') {
    throw new Error(getDropboxErrorMessage(payload, `Dropbox token exchange failed (HTTP ${response.status}).`))
  }

  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : undefined
  return {
    accessToken: payload.access_token,
    refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token : undefined,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
    accountId: typeof payload.account_id === 'string' ? payload.account_id : undefined,
    uid: typeof payload.uid === 'string' ? payload.uid : undefined,
  }
}

export async function refreshDropboxAccessToken(
  appKey: string,
  refreshToken: string,
): Promise<DropboxOAuthResult> {
  const response = await fetch(DROPBOX_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken.trim(),
      client_id: (appKey.trim() || DEFAULT_DROPBOX_APP_KEY),
    }),
  })
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>

  if (!response.ok || typeof payload.access_token !== 'string') {
    throw new Error(getDropboxErrorMessage(payload, `Dropbox token refresh failed (HTTP ${response.status}).`))
  }

  const expiresIn = typeof payload.expires_in === 'number' ? payload.expires_in : undefined
  return {
    accessToken: payload.access_token,
    refreshToken: typeof payload.refresh_token === 'string' ? payload.refresh_token : refreshToken,
    expiresAt: expiresIn ? Date.now() + expiresIn * 1000 : undefined,
  }
}

export function extractDropboxOAuthToken(): string | null {
  if (typeof window === 'undefined') return null

  // Keep accepting legacy implicit-flow links so an in-progress old login can finish.
  const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash
  const hashToken = new URLSearchParams(hash).get('access_token')
  if (hashToken) return hashToken

  return new URLSearchParams(window.location.search).get('access_token')
}

export interface SyncResult {
  success: boolean
  message: string
  mergedState?: AnchorState
  mergedProfile?: UserProfile
  updatedSyncSettings?: Partial<SyncSettings>
  timestamp: string
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

function normalizeWebDAVPath(vaultName: string, customPath?: string): string {
  const cleanVault = (vaultName.trim() || DEFAULT_VAULT_NAME).replace(/[^a-zA-Z0-9_-]/g, '_')
  if (customPath && customPath.trim().startsWith('/')) {
    return customPath.trim()
  }
  return `/${cleanVault}.json`
}

async function readDropboxError(response: Response): Promise<string> {
  const errorText = await response.text().catch(() => '')
  if (!errorText) return response.statusText

  try {
    const payload = JSON.parse(errorText) as unknown
    return getDropboxErrorMessage(payload, errorText)
  } catch {
    return errorText
  }
}

export async function ensureDropboxFolder(accessToken: string, vaultName = DEFAULT_VAULT_NAME): Promise<string> {
  const path = getDropboxVaultFolder(vaultName)
  const response = await fetch(`${DROPBOX_API_ENDPOINT}/files/create_folder_v2`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ path, autorename: false }),
  })

  if (response.ok) return path

  if (response.status === 409) {
    // create_folder_v2 is intentionally idempotent for an existing folder. Verify
    // that a conflicting path is really a folder rather than a file.
    const metadataResponse = await fetch(`${DROPBOX_API_ENDPOINT}/files/get_metadata`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path }),
    })
    if (metadataResponse.ok) {
      const metadata = await metadataResponse.json() as { ".tag"?: string }
      if (metadata['.tag'] === 'folder') return path
    }
  }

  const errorMessage = await readDropboxError(response)
  if (errorMessage.includes('files.content.write')) {
    throw new Error('The Anchor Dropbox app is missing the files.content.write permission. Enable it in Dropbox App Console → Permissions, then revoke and reconnect Dropbox.')
  }

  throw new Error(`Dropbox folder setup failed (HTTP ${response.status}): ${errorMessage}`)
}

// Dropbox API v2 implementation. The backup always lives inside a folder named
// after the Anchor vault, matching Remotely Save's App Folder layout.
async function downloadDropboxFile(accessToken: string, path: string): Promise<string | null> {
  const response = await fetch('https://content.dropboxapi.com/2/files/download', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      'Dropbox-API-Arg': JSON.stringify({ path }),
    },
  })

  if (response.status === 409 || response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Dropbox download error (HTTP ${response.status}): ${await readDropboxError(response)}`)
  }

  return response.text()
}

export async function downloadDropboxVault(
  accessToken: string,
  vaultName: string,
  _customPath?: string,
): Promise<string | null> {
  const path = getDropboxBackupPath(vaultName)
  const content = await downloadDropboxFile(accessToken, path)
  if (content !== null || path === LEGACY_DROPBOX_BACKUP_PATH) return content

  // Preserve backups created by Anchor 0.1.3 and earlier while moving them into
  // the new vault-named folder. The next sync writes the migrated copy there.
  return downloadDropboxFile(accessToken, LEGACY_DROPBOX_BACKUP_PATH)
}

export async function uploadDropboxVault(
  accessToken: string,
  vaultName: string,
  content: string,
  _customPath?: string,
): Promise<void> {
  const path = getDropboxBackupPath(vaultName)

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
    throw new Error(`Dropbox upload error (HTTP ${response.status}): ${await readDropboxError(response)}`)
  }
}

export async function testDropboxConnection(
  accessToken: string,
  vaultName = DEFAULT_VAULT_NAME,
): Promise<string> {
  const response = await fetch(`${DROPBOX_API_ENDPOINT}/users/get_current_account`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
    },
  })

  if (!response.ok) {
    throw new Error(`Dropbox connection failed (HTTP ${response.status}): ${await readDropboxError(response)}`)
  }

  const data = await response.json() as { name?: { display_name?: string }; email?: string }
  await ensureDropboxFolder(accessToken, vaultName)
  const name = data.name?.display_name || data.email || 'Connected user'
  return `Connected to Dropbox account: ${name}`
}

export function normalizeSyncSettings(settings: SyncSettings): SyncSettings {
  const rawVaultName = settings.vaultName?.trim()
  // Migrate the old default without changing a user's deliberately chosen name.
  const vaultName = !rawVaultName || rawVaultName === 'anchor-vault' ? DEFAULT_VAULT_NAME : rawVaultName
  const provider = settings.provider || 'none'
  const rawAppKey = settings.dropboxAppKey?.trim() || ''
  const isLegacyApp = LEGACY_DROPBOX_APP_KEYS.has(rawAppKey)
  const settingsWithoutEncryption = { ...settings } as SyncSettings & { encryptionPassword?: string }
  // Remove the old optional encryption setting so existing devices immediately
  // return to the normal plaintext workspace format without keeping a stale password.
  delete settingsWithoutEncryption.encryptionPassword

  return {
    ...DEFAULT_SYNC_SETTINGS,
    ...settingsWithoutEncryption,
    ...(isLegacyApp ? {
      dropboxAccessToken: undefined,
      dropboxRefreshToken: undefined,
      dropboxTokenExpiresAt: undefined,
      dropboxAccountId: undefined,
    } : {}),
    enabled: provider !== 'none' && Boolean(settings.enabled),
    provider,
    vaultName,
    dropboxAppKey: isLegacyApp || !rawAppKey ? DEFAULT_DROPBOX_APP_KEY : rawAppKey,
    dropboxPath: provider === 'dropbox' ? getDropboxBackupPath(vaultName) : settings.dropboxPath,
  }
}

// WebDAV implementation
export async function downloadWebDAVVault(settings: SyncSettings): Promise<string | null> {
  if (!settings.webdavUrl) throw new Error('WebDAV URL is required.')

  const path = normalizeWebDAVPath(settings.vaultName, '')
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

  const path = normalizeWebDAVPath(settings.vaultName, '')
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

async function getUsableDropboxToken(settings: SyncSettings): Promise<{
  accessToken: string
  updatedSettings?: Partial<SyncSettings>
}> {
  const accessToken = settings.dropboxAccessToken?.trim()
  const expiresAt = settings.dropboxTokenExpiresAt ?? 0

  if (accessToken && (!expiresAt || expiresAt > Date.now() + DROPBOX_TOKEN_SKEW_MS)) {
    return { accessToken }
  }

  if (!settings.dropboxRefreshToken?.trim()) {
    if (accessToken && !expiresAt) return { accessToken }
    if (accessToken) throw new Error('Your Dropbox session expired. Reconnect Dropbox in Settings.')
    throw new Error('Connect Dropbox in Settings before syncing this vault.')
  }

  const refreshed = await refreshDropboxAccessToken(
    settings.dropboxAppKey || DEFAULT_DROPBOX_APP_KEY,
    settings.dropboxRefreshToken,
  )
  return {
    accessToken: refreshed.accessToken,
    updatedSettings: {
      dropboxAccessToken: refreshed.accessToken,
      dropboxRefreshToken: refreshed.refreshToken,
      dropboxTokenExpiresAt: refreshed.expiresAt,
    },
  }
}

export async function revokeDropboxAccess(settings: SyncSettings): Promise<void> {
  const { accessToken } = await getUsableDropboxToken(settings)
  const response = await fetch(`${DROPBOX_API_ENDPOINT}/auth/token/revoke`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
    },
  })

  // Dropbox returns 401 when the token was already revoked or expired. In that
  // case there is nothing left for Anchor to revoke remotely.
  if (!response.ok && response.status !== 401) {
    throw new Error(`Dropbox revoke failed (HTTP ${response.status}): ${await readDropboxError(response)}`)
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
    const effectiveSettings = normalizeSyncSettings(settings)
    let remotePayload: string | null = null
    let dropboxAccessToken: string | undefined
    let updatedSyncSettings: Partial<SyncSettings> | undefined

    if (effectiveSettings.provider === 'dropbox') {
      const usableToken = await getUsableDropboxToken(effectiveSettings)
      dropboxAccessToken = usableToken.accessToken
      updatedSyncSettings = usableToken.updatedSettings
      // The folder setup is explicit, idempotent, and happens before every
      // transfer so a new device never needs manual Dropbox folder work.
      await ensureDropboxFolder(dropboxAccessToken, effectiveSettings.vaultName)
      remotePayload = await downloadDropboxVault(
        dropboxAccessToken,
        effectiveSettings.vaultName,
        effectiveSettings.dropboxPath,
      )
    } else if (effectiveSettings.provider === 'webdav') {
      remotePayload = await downloadWebDAVVault(effectiveSettings)
    }

    let mergedState = localState
    let mergedProfile = localProfile

    if (remotePayload) {
      const parsedRemote = parseWorkspaceExport(remotePayload)
      mergedState = mergeSyncState(localState, parsedRemote.state)
      mergedProfile = {
        name: localProfile.name.trim() || parsedRemote.profile.name.trim() || 'friend',
      }
    }

    const uploadContent = serializeWorkspaceExport(mergedState, mergedProfile)

    if (effectiveSettings.provider === 'dropbox' && dropboxAccessToken) {
      await uploadDropboxVault(
        dropboxAccessToken,
        effectiveSettings.vaultName,
        uploadContent,
        effectiveSettings.dropboxPath,
      )
    } else if (effectiveSettings.provider === 'webdav') {
      await uploadWebDAVVault(effectiveSettings, uploadContent)
    }

    const providerLabel = effectiveSettings.provider === 'dropbox' ? 'Dropbox' : 'WebDAV'

    return {
      success: true,
      message: `Vault synced with ${providerLabel} (${effectiveSettings.vaultName})`,
      mergedState,
      mergedProfile,
      updatedSyncSettings,
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
    return normalizeSyncSettings(JSON.parse(raw) as SyncSettings)
  } catch {
    return { ...DEFAULT_SYNC_SETTINGS }
  }
}

export function writeSyncSettings(settings: SyncSettings): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(SYNC_SETTINGS_STORAGE_KEY, JSON.stringify(normalizeSyncSettings(settings)))
  } catch {
    // Local storage quota or unavailable
  }
}
