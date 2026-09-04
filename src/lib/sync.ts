import { normalizeAnchorState } from './anchors'
import type { AnchorState } from './anchors'
import type { UserProfile, WorkspacePreferences } from './workspace'
import { mergeWorkspacePreferences, mergeWorkspaceProfile, parseWorkspaceExport, serializeWorkspaceExport } from './workspace'

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
export const DROPBOX_NATIVE_CALLBACK_SCHEME = 'anchor'
export const DEFAULT_VAULT_NAME = 'Anchor'
export const DROPBOX_BACKUP_FILE = 'anchor-vault.json'

// Dropbox client IDs and redirect URIs are public. The release is preconfigured
// for normal users; self-hosted builds can override these with VITE_ variables.
const RELEASE_DROPBOX_APP_KEY = 'dsc3rxf2meqb4t8'
export const DROPBOX_RELEASE_REDIRECT_URI = 'https://anchor-chi-eight.vercel.app/dropbox/callback'
const CONFIGURED_DROPBOX_REDIRECT_URI = (
  import.meta.env.VITE_DROPBOX_REDIRECT_URI || DROPBOX_RELEASE_REDIRECT_URI
).trim()
const LEGACY_DROPBOX_APP_KEYS = new Set(['k0k64j5r7z0u32b'])
const LEGACY_DROPBOX_BACKUP_PATH = '/anchor-vault.json'
export const DEFAULT_DROPBOX_APP_KEY = (
  import.meta.env.VITE_DROPBOX_APP_KEY || RELEASE_DROPBOX_APP_KEY
).trim()

const DROPBOX_TOKEN_ENDPOINT = 'https://api.dropboxapi.com/oauth2/token'
const DROPBOX_API_ENDPOINT = 'https://api.dropboxapi.com/2'
const DROPBOX_OAUTH_STORAGE_KEY = 'anchor-dropbox-oauth-pkce-v1'
const DROPBOX_NATIVE_CALLBACK_PATH = '/callback'
const DROPBOX_NATIVE_STATE_PREFIX = 'anchor-native-'
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

function isNativeTauriRuntime(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
    (window as unknown as { __TAURI__?: unknown }).__TAURI__ ||
    window.location.hostname === 'tauri.localhost',
  )
}

export function getDropboxRedirectUri(redirectUri?: string): string {
  if (redirectUri?.trim()) return redirectUri.trim()
  // Tauri's local `*.localhost` origin is not registered with Dropbox. Native
  // OAuth therefore always uses the release callback (or its build override).
  if (isNativeTauriRuntime()) return CONFIGURED_DROPBOX_REDIRECT_URI
  if (typeof window === 'undefined') return DROPBOX_CALLBACK_PATH
  return `${window.location.origin}${DROPBOX_CALLBACK_PATH}`
}

export function isNativeDropboxOAuthState(state?: string | null): boolean {
  return Boolean(state?.startsWith(DROPBOX_NATIVE_STATE_PREFIX))
}

export function isDropboxNativeCallbackUrl(callbackUrl: string | URL): boolean {
  try {
    const url = typeof callbackUrl === 'string' ? new URL(callbackUrl) : callbackUrl
    return url.protocol === `${DROPBOX_NATIVE_CALLBACK_SCHEME}:`
      && url.hostname === 'dropbox'
      && url.pathname.replace(/\/$/, '') === DROPBOX_NATIVE_CALLBACK_PATH
  } catch {
    return false
  }
}

/**
 * Sends a native OAuth result from the registered HTTPS callback back to the
 * installed app. The HTTPS URI stays registered with Dropbox; the custom URI
 * is only used for the final hand-off on the device.
 */
export function getDropboxNativeCallbackUrl(callbackUrl: string | URL): string {
  const source = typeof callbackUrl === 'string' ? new URL(callbackUrl) : callbackUrl
  const target = new URL(`${DROPBOX_NATIVE_CALLBACK_SCHEME}://dropbox${DROPBOX_NATIVE_CALLBACK_PATH}`)

  for (const parameter of ['code', 'state', 'error', 'error_description', 'error_uri']) {
    const value = source.searchParams.get(parameter)
    if (value !== null) target.searchParams.set(parameter, value)
  }

  return target.toString()
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
  const state = `${isNativeTauriRuntime() ? DROPBOX_NATIVE_STATE_PREFIX : ''}${randomUrlString(32)}`
  const storage = getDropboxOAuthStorage()
  storage?.setItem(DROPBOX_OAUTH_STORAGE_KEY, JSON.stringify({
    verifier,
    state,
    appKey: trimmedAppKey,
    createdAt: Date.now(),
  }))

  const authUrl = getDropboxAuthUrl(trimmedAppKey, undefined, challenge, state)
  if (isNativeTauriRuntime()) {
    // OAuth must happen in the system browser on mobile. The callback is
    // bounced back through the `anchor://` deep link once Dropbox redirects
    // to Anchor's registered HTTPS callback.
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener')
      await openUrl(authUrl)
      return
    } catch {
      // Keep a browser-navigation fallback for older/native builds without
      // the opener plugin or when the OS refuses to open the browser.
    }
  }

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

export async function completeDropboxOAuth(callbackUrl?: string | URL): Promise<DropboxOAuthResult | null> {
  if (typeof window === 'undefined' && !callbackUrl) return null

  let callback: URL
  try {
    callback = callbackUrl
      ? (typeof callbackUrl === 'string' ? new URL(callbackUrl) : callbackUrl)
      : new URL(window.location.href)
  } catch {
    return null
  }

  const callbackPath = callback.pathname.replace(/\/$/, '') || '/'
  if (!isDropboxNativeCallbackUrl(callback) && callbackPath !== DROPBOX_CALLBACK_PATH) return null

  const params = callback.searchParams
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
      // Dropbox validates this against the URI used in the authorization
      // request, not the temporary `anchor://` hand-off URI.
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

export type SyncPhase = 'pulling' | 'merging' | 'pushing'

export interface SyncOptions {
  onPhase?: (phase: SyncPhase) => void
}

export interface SyncResult {
  success: boolean
  message: string
  mergedState?: AnchorState
  mergedProfile?: UserProfile
  mergedPreferences?: WorkspacePreferences
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
  return normalizeAnchorState({
    anchors: mergeRecordsByTimestamp(current.anchors, incoming.anchors),
    projects: mergeRecordsByTimestamp(current.projects, incoming.projects),
    decisions: mergeRecordsByTimestamp(current.decisions, incoming.decisions),
    notes: mergeRecordsByTimestamp(current.notes, incoming.notes),
  })
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
interface DropboxFileSnapshot {
  content: string
  revision?: string
}

interface DropboxVaultSnapshot extends DropboxFileSnapshot {
  isCurrentPath: boolean
}

class SyncConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SyncConflictError'
  }
}

function isSyncConflictError(error: unknown): error is SyncConflictError {
  return error instanceof SyncConflictError
}

async function downloadDropboxFile(accessToken: string, path: string): Promise<DropboxFileSnapshot | null> {
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

  let revision: string | undefined
  const metadataHeader = response.headers.get('Dropbox-API-Result')
  if (metadataHeader) {
    try {
      const metadata = JSON.parse(metadataHeader) as { rev?: unknown }
      revision = typeof metadata.rev === 'string' ? metadata.rev : undefined
    } catch {
      // A missing revision only disables optimistic conflict protection. The
      // content is still usable and the sync can continue normally.
    }
  }

  return {
    content: await response.text(),
    revision,
  }
}

async function downloadDropboxVaultSnapshot(
  accessToken: string,
  vaultName: string,
  _customPath?: string,
): Promise<DropboxVaultSnapshot | null> {
  const path = getDropboxBackupPath(vaultName)
  const currentSnapshot = await downloadDropboxFile(accessToken, path)
  if (currentSnapshot !== null || path === LEGACY_DROPBOX_BACKUP_PATH) {
    return currentSnapshot ? { ...currentSnapshot, isCurrentPath: true } : null
  }

  // Preserve backups created by Anchor 0.1.3 and earlier while moving them into
  // the new vault-named folder. The next sync writes the migrated copy there.
  const legacySnapshot = await downloadDropboxFile(accessToken, LEGACY_DROPBOX_BACKUP_PATH)
  return legacySnapshot ? { ...legacySnapshot, isCurrentPath: false, revision: undefined } : null
}

export async function downloadDropboxVault(
  accessToken: string,
  vaultName: string,
  customPath?: string,
): Promise<string | null> {
  return (await downloadDropboxVaultSnapshot(accessToken, vaultName, customPath))?.content ?? null
}

export async function uploadDropboxVault(
  accessToken: string,
  vaultName: string,
  content: string,
  _customPath?: string,
  expectedRevision?: string | null,
): Promise<void> {
  const path = getDropboxBackupPath(vaultName)

  const response = await fetch('https://content.dropboxapi.com/2/files/upload', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken.trim()}`,
      'Dropbox-API-Arg': JSON.stringify({
        path,
        mode: expectedRevision === null
          ? 'add'
          : expectedRevision
            ? { '.tag': 'update', update: expectedRevision }
            : 'overwrite',
        autorename: false,
        mute: true,
        strict_conflict: expectedRevision !== undefined,
      }),
      'Content-Type': 'application/octet-stream',
    },
    body: new TextEncoder().encode(content),
  })

  if (!response.ok) {
    const errorMessage = await readDropboxError(response)
    if (response.status === 409) {
      throw new SyncConflictError('The Dropbox vault changed while syncing. Anchor will pull it again before retrying.')
    }
    throw new Error(`Dropbox upload error (HTTP ${response.status}): ${errorMessage}`)
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
interface WebDAVVaultSnapshot {
  content: string
  etag?: string
}

async function downloadWebDAVVaultSnapshot(settings: SyncSettings): Promise<WebDAVVaultSnapshot | null> {
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

  return {
    content: await response.text(),
    etag: response.headers.get('ETag') ?? undefined,
  }
}

export async function downloadWebDAVVault(settings: SyncSettings): Promise<string | null> {
  return (await downloadWebDAVVaultSnapshot(settings))?.content ?? null
}

export async function uploadWebDAVVault(
  settings: SyncSettings,
  content: string,
  expectedEtag?: string | null,
): Promise<void> {
  if (!settings.webdavUrl) throw new Error('WebDAV URL is required.')

  const path = normalizeWebDAVPath(settings.vaultName, '')
  const fullUrl = settings.webdavUrl.replace(/\/+$/, '') + path
  const headers: HeadersInit = {
    'Content-Type': 'application/json; charset=utf-8',
    ...(expectedEtag ? { 'If-Match': expectedEtag } : {}),
    ...(expectedEtag === null ? { 'If-None-Match': '*' } : {}),
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
    if (response.status === 409 || response.status === 412) {
      throw new SyncConflictError('The WebDAV vault changed while syncing. Anchor will pull it again before retrying.')
    }
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
  localPreferences: WorkspacePreferences = {},
  options: SyncOptions = {},
): Promise<SyncResult> {
  const timestamp = new Date().toISOString()

  if (!settings.enabled || settings.provider === 'none') {
    return {
      success: false,
      message: 'Cloud sync is not enabled.',
      timestamp,
    }
  }

  let mergedState: AnchorState | undefined
  let mergedProfile: UserProfile | undefined
  let mergedPreferences: WorkspacePreferences | undefined
  let updatedSyncSettings: Partial<SyncSettings> | undefined

  try {
    const effectiveSettings = normalizeSyncSettings(settings)
    let dropboxAccessToken: string | undefined

    if (effectiveSettings.provider === 'dropbox') {
      const usableToken = await getUsableDropboxToken(effectiveSettings)
      dropboxAccessToken = usableToken.accessToken
      updatedSyncSettings = usableToken.updatedSettings
      // The folder setup is explicit, idempotent, and happens before every
      // transfer so a new device never needs manual Dropbox folder work.
      await ensureDropboxFolder(dropboxAccessToken, effectiveSettings.vaultName)
    }

    const providerLabel = effectiveSettings.provider === 'dropbox' ? 'Dropbox' : 'WebDAV'
    let conflictRetry = 0

    while (true) {
      let remotePayload: string | null = null
      let expectedDropboxRevision: string | null | undefined
      let expectedWebDAVTag: string | null | undefined

      // Every pass is deliberately ordered: pull the current remote snapshot,
      // merge it with the local snapshot, then push the merged result.
      options.onPhase?.('pulling')

      if (effectiveSettings.provider === 'dropbox' && dropboxAccessToken) {
        const snapshot = await downloadDropboxVaultSnapshot(
          dropboxAccessToken,
          effectiveSettings.vaultName,
          effectiveSettings.dropboxPath,
        )
        remotePayload = snapshot?.content ?? null
        expectedDropboxRevision = snapshot
          ? snapshot.isCurrentPath ? snapshot.revision : null
          : null
      } else if (effectiveSettings.provider === 'webdav') {
        const snapshot = await downloadWebDAVVaultSnapshot(effectiveSettings)
        remotePayload = snapshot?.content ?? null
        expectedWebDAVTag = snapshot?.etag ?? (snapshot ? undefined : null)
      }

      options.onPhase?.('merging')

      mergedState = localState
      mergedProfile = localProfile
      mergedPreferences = localPreferences

      if (remotePayload !== null) {
        const parsedRemote = parseWorkspaceExport(remotePayload)
        mergedState = mergeSyncState(localState, parsedRemote.state)
        mergedProfile = mergeWorkspaceProfile(localProfile, parsedRemote.profile)
        mergedPreferences = mergeWorkspacePreferences(localPreferences, parsedRemote.preferences)
      }

      options.onPhase?.('pushing')
      const uploadContent = serializeWorkspaceExport(
        mergedState ?? localState,
        mergedProfile ?? localProfile,
        mergedPreferences ?? localPreferences,
        { includeAIKey: true },
      )

      try {
        if (effectiveSettings.provider === 'dropbox' && dropboxAccessToken) {
          await uploadDropboxVault(
            dropboxAccessToken,
            effectiveSettings.vaultName,
            uploadContent,
            effectiveSettings.dropboxPath,
            expectedDropboxRevision,
          )
        } else if (effectiveSettings.provider === 'webdav') {
          await uploadWebDAVVault(effectiveSettings, uploadContent, expectedWebDAVTag)
        }
      } catch (error) {
        if (isSyncConflictError(error) && conflictRetry < 2) {
          conflictRetry += 1
          continue
        }
        throw error
      }

      break
    }

    return {
      success: true,
      message: `Vault synced with ${providerLabel} (${effectiveSettings.vaultName})`,
      mergedState,
      mergedProfile,
      mergedPreferences,
      updatedSyncSettings,
      timestamp,
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown sync failure.'
    return {
      success: false,
      message: errorMsg,
      ...(mergedState ? { mergedState } : {}),
      ...(mergedProfile ? { mergedProfile } : {}),
      ...(mergedPreferences ? { mergedPreferences } : {}),
      ...(updatedSyncSettings ? { updatedSyncSettings } : {}),
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
