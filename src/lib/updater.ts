import packageMetadata from '../../package.json'
import { APP_CHANGELOG } from './changelog'
import type { AppChangelogEntry } from './changelog'

export type PlatformType = 'web' | 'desktop-windows' | 'desktop-macos' | 'desktop-linux' | 'android'

export const CURRENT_APP_VERSION = packageMetadata.version
export const GITHUB_REPO = 'racstan/Anchor'
export const RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
export const RELEASES_HISTORY_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases?per_page=100`
export const RELEASES_WEB_URL = `https://github.com/${GITHUB_REPO}/releases/latest`
const ANDROID_UPDATE_FILENAME = 'anchor-update.apk'
const MAX_ANDROID_UPDATE_BYTES = 250 * 1024 * 1024

export interface ReleaseAsset {
  name: string
  browser_download_url: string
  size: number
}

interface GithubReleasePayload {
  tag_name?: unknown
  name?: unknown
  body?: unknown
  published_at?: unknown
  html_url?: unknown
  draft?: unknown
  prerelease?: unknown
  assets?: unknown
}

export interface AppUpdateProgress {
  downloadedBytes: number
  totalBytes?: number
  percent?: number
  transferSpeed?: number
}

export type AppUpdateProgressHandler = (progress: AppUpdateProgress) => void

export interface AppUpdateInfo {
  isAvailable: boolean
  currentVersion: string
  latestVersion: string
  releaseName: string
  releaseNotes: string
  publishedAt: string
  changelog: AppChangelogEntry[]
  downloadUrl?: string
  assetName?: string
  installUpdate?: (onProgress?: AppUpdateProgressHandler) => Promise<void>
  htmlUrl: string
  platform: PlatformType
  isNative: boolean
}

/**
 * Detects whether the app is running in Tauri (native desktop or mobile) or web.
 */
export function isNativeApp(): boolean {
  if (typeof window === 'undefined') return false
  return Boolean(
    (window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__ ||
    (window as unknown as { __TAURI__?: unknown }).__TAURI__,
  )
}

/**
 * Detects the runtime platform.
 */
export function getAppPlatform(): PlatformType {
  if (typeof window === 'undefined') return 'web'

  const userAgent = navigator.userAgent.toLowerCase()
  const isNative = isNativeApp()

  if (userAgent.includes('android')) {
    return 'android'
  }

  if (isNative) {
    if (userAgent.includes('win')) return 'desktop-windows'
    if (userAgent.includes('mac')) return 'desktop-macos'
    if (userAgent.includes('linux')) return 'desktop-linux'
    return 'desktop-linux'
  }

  return 'web'
}

/**
 * Parses and compares semver strings (e.g. "0.1.2" > "0.1.1").
 */
export function isNewerVersion(latestTag: string, currentVersion: string): boolean {
  const cleanLatest = latestTag.replace(/^v/i, '').trim()
  const cleanCurrent = currentVersion.replace(/^v/i, '').trim()

  if (!cleanLatest || !cleanCurrent) return false

  const latestParts = cleanLatest.split('.').map((p) => Number.parseInt(p, 10) || 0)
  const currentParts = cleanCurrent.split('.').map((p) => Number.parseInt(p, 10) || 0)

  const maxLen = Math.max(latestParts.length, currentParts.length)
  for (let i = 0; i < maxLen; i++) {
    const l = latestParts[i] ?? 0
    const c = currentParts[i] ?? 0
    if (l > c) return true
    if (l < c) return false
  }

  return false
}

function normalizeReleaseVersion(value: unknown): string {
  if (typeof value !== 'string') return ''
  const version = value.replace(/^v/i, '').trim()
  return /^\d+(?:\.\d+){1,2}(?:[-+][0-9A-Za-z.-]+)?$/.test(version) ? version : ''
}

function compareReleaseVersions(first: string, second: string): number {
  const firstParts = first.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const secondParts = second.split('.').map((part) => Number.parseInt(part, 10) || 0)
  const length = Math.max(firstParts.length, secondParts.length)

  for (let index = 0; index < length; index += 1) {
    const difference = (firstParts[index] ?? 0) - (secondParts[index] ?? 0)
    if (difference !== 0) return difference
  }

  return first.localeCompare(second)
}

function releaseBodySummary(body: string): string {
  const summary = body
    .replace(/\r/g, '')
    .split(/\n+/)
    .map((line) => line.replace(/^\s{0,3}#+\s*/, '').replace(/^\s*[-*+]\s+/, '').replace(/^>\s*/, '').trim())
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')

  if (!summary) return 'Refinements, stability improvements, and a little more room to think.'
  return summary.length > 220 ? `${summary.slice(0, 217).trimEnd()}…` : summary
}

function releaseBodyHighlights(body: string): string[] {
  return body
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/^\s{0,3}#+\s*/, '').replace(/^\s*[-*+]\s+/, '').replace(/^>\s*/, '').trim())
    .filter((line) => line.length > 0)
    .filter((line) => !/^anchor\s+v?\d/i.test(line))
    .slice(0, 4)
}

function githubReleaseToChangelogEntry(release: GithubReleasePayload): AppChangelogEntry | undefined {
  const version = normalizeReleaseVersion(release.tag_name)
  if (!version) return undefined

  const body = typeof release.body === 'string' ? release.body.trim() : ''
  const title = typeof release.name === 'string' && release.name.trim()
    ? release.name.trim().replace(/^anchor\s+/i, '')
    : `Anchor v${version}`
  const publishedAt = typeof release.published_at === 'string' ? release.published_at : undefined
  const releaseUrl = typeof release.html_url === 'string' ? release.html_url : undefined
  const highlights = releaseBodyHighlights(body)

  return {
    version,
    title,
    summary: releaseBodySummary(body),
    highlights: highlights.length > 0 ? highlights : [releaseBodySummary(body)],
    ...(publishedAt ? { releasedAt: publishedAt } : {}),
    ...(releaseUrl ? { releaseUrl } : {}),
  }
}

function mergeReleaseChangelog(releases: GithubReleasePayload[] = []): AppChangelogEntry[] {
  const entries = new Map<string, AppChangelogEntry>(
    APP_CHANGELOG.map((entry) => [entry.version, { ...entry, highlights: [...entry.highlights] }]),
  )

  releases.forEach((release) => {
    if (release.draft === true || release.prerelease === true) return
    const entry = githubReleaseToChangelogEntry(release)
    if (!entry) return

    const existing = entries.get(entry.version)
    if (existing) {
      entries.set(entry.version, {
        ...existing,
        ...(existing.releasedAt ? {} : entry.releasedAt ? { releasedAt: entry.releasedAt } : {}),
        ...(existing.releaseUrl ? {} : entry.releaseUrl ? { releaseUrl: entry.releaseUrl } : {}),
      })
    } else {
      entries.set(entry.version, entry)
    }
  })

  return [...entries.values()].sort((first, second) => compareReleaseVersions(first.version, second.version))
}

let releaseChangelogPromise: Promise<AppChangelogEntry[]> | undefined

async function loadReleaseChangelog(latestRelease?: GithubReleasePayload): Promise<AppChangelogEntry[]> {
  if (!releaseChangelogPromise) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    releaseChangelogPromise = fetch(RELEASES_HISTORY_API_URL, {
      headers: { Accept: 'application/vnd.github.v3+json' },
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`Failed to load release history (HTTP ${response.status})`)
        const data: unknown = await response.json()
        return Array.isArray(data) ? data.filter((release): release is GithubReleasePayload => typeof release === 'object' && release !== null) : []
      })
      .then((releases) => mergeReleaseChangelog(releases))
      .catch(() => mergeReleaseChangelog())
      .finally(() => clearTimeout(timeout))
  }

  const changelog = await releaseChangelogPromise
  return latestRelease ? mergeReleaseChangelog([...changelog.map((entry) => ({
    tag_name: entry.version,
    name: entry.title,
    body: `${entry.summary}\n${entry.highlights.map((highlight) => `- ${highlight}`).join('\n')}`,
    published_at: entry.releasedAt,
    html_url: entry.releaseUrl,
  })), latestRelease]) : changelog
}

/**
 * Finds the most suitable download asset for the current platform from the GitHub release assets.
 */
export function findPlatformAsset(assets: ReleaseAsset[], platform: PlatformType): ReleaseAsset | undefined {
  if (!assets || assets.length === 0) return undefined

  if (platform === 'android') {
    return assets.find((a) => a.name.endsWith('.apk'))
  }

  if (platform === 'desktop-windows') {
    return (
      assets.find((a) => a.name.endsWith('.msi')) ||
      assets.find((a) => a.name.endsWith('.exe')) ||
      assets.find((a) => a.name.includes('setup') || a.name.includes('x64_en-US.msi'))
    )
  }

  if (platform === 'desktop-macos') {
    return (
      assets.find((a) => a.name.endsWith('.dmg')) ||
      assets.find((a) => a.name.endsWith('.app.tar.gz'))
    )
  }

  if (platform === 'desktop-linux') {
    return (
      assets.find((a) => a.name.endsWith('.AppImage')) ||
      assets.find((a) => a.name.endsWith('.deb'))
    )
  }

  return assets[0]
}

function isAllowedAndroidUpdateUrl(downloadUrl: string): boolean {
  try {
    const url = new URL(downloadUrl)
    return url.protocol === 'https:' && (
      url.hostname === 'github.com' ||
      url.hostname === 'release-assets.githubusercontent.com' ||
      url.hostname === 'objects.githubusercontent.com'
    )
  } catch {
    return false
  }
}

/**
 * Downloads an Android release into the app cache and launches Android's
 * package installer. Android always shows a confirmation screen; silent
 * installation is not available to ordinary apps.
 */
export async function downloadAndInstallAndroidUpdate(
  downloadUrl: string,
  onProgress?: AppUpdateProgressHandler,
): Promise<void> {
  if (!isNativeApp() || getAppPlatform() !== 'android') {
    throw new Error('Android self-install is only available in the native Android app.')
  }
  if (!isAllowedAndroidUpdateUrl(downloadUrl)) {
    throw new Error('The Android update URL is not a trusted Anchor release.')
  }

  const [upload, path, filesystem, installer] = await Promise.all([
    import('@tauri-apps/plugin-upload'),
    import('@tauri-apps/api/path'),
    import('@tauri-apps/plugin-fs'),
    import('tauri-plugin-android-installer-api'),
  ])

  if (!(await installer.canInstall())) {
    await installer.requestInstallPermission()
    if (!(await installer.canInstall())) {
      throw new Error('Allow Anchor to install updates from this source, then try again.')
    }
  }

  const cachePath = await path.appCacheDir()
  const apkPath = await path.join(cachePath, ANDROID_UPDATE_FILENAME)

  let latestProgress: AppUpdateProgress | undefined
  onProgress?.({ downloadedBytes: 0 })

  try {
    await upload.download(downloadUrl, apkPath, (progress) => {
      const totalBytes = Number.isFinite(progress.total) && progress.total > 0 ? progress.total : undefined
      const downloadedBytes = Math.max(0, progress.progressTotal)

      if (totalBytes && totalBytes > MAX_ANDROID_UPDATE_BYTES) {
        throw new Error('The Android update is unexpectedly large and was not downloaded.')
      }

      latestProgress = {
        downloadedBytes,
        ...(totalBytes ? {
          totalBytes,
          percent: Math.min(100, Math.max(0, Math.round((downloadedBytes / totalBytes) * 100))),
        } : {}),
        ...(progress.transferSpeed > 0 ? { transferSpeed: progress.transferSpeed } : {}),
      }
      onProgress?.(latestProgress)
    })
  } catch (error) {
    try {
      await filesystem.remove(apkPath)
    } catch {
      // A partial cache file is harmless if Android or the filesystem already
      // removed it while reporting the download failure.
    }
    throw error
  }

  if (latestProgress?.percent !== 100) {
    onProgress?.({
      ...latestProgress,
      downloadedBytes: latestProgress?.totalBytes ?? latestProgress?.downloadedBytes ?? 0,
      ...(latestProgress?.totalBytes ? { totalBytes: latestProgress.totalBytes } : {}),
      percent: 100,
    })
  }
  await installer.install(apkPath)
}

function noUpdateAvailable(platform: PlatformType, isNative: boolean): AppUpdateInfo {
  return {
    isAvailable: false,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: CURRENT_APP_VERSION,
    releaseName: `Anchor v${CURRENT_APP_VERSION}`,
    releaseNotes: '',
    publishedAt: new Date().toISOString(),
    changelog: mergeReleaseChangelog(),
    htmlUrl: RELEASES_WEB_URL,
    platform,
    isNative,
  }
}

/**
 * Uses Tauri's signed updater on desktop. Android uses the public APK release
 * asset and the Android system package installer instead, because Tauri's
 * signed updater plugin does not support mobile platforms.
 */
async function checkTauriUpdate(platform: PlatformType, isNative: boolean): Promise<AppUpdateInfo | undefined> {
  if (!isNative || platform === 'android') {
    return undefined
  }

  const { check } = await import('@tauri-apps/plugin-updater')
  const update = await check()

  if (!update) {
    return noUpdateAvailable(platform, true)
  }

  const changelog = await loadReleaseChangelog({
    tag_name: update.version,
    name: `Anchor v${update.version}`,
    body: update.body,
    published_at: update.date,
    html_url: RELEASES_WEB_URL,
  })

  return {
    isAvailable: true,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: update.version,
    releaseName: `Anchor v${update.version}`,
    releaseNotes: update.body || 'New features, improvements, and calm stability enhancements.',
    publishedAt: update.date || new Date().toISOString(),
    changelog,
    downloadUrl: RELEASES_WEB_URL,
    assetName: 'Built-in signed updater',
    htmlUrl: RELEASES_WEB_URL,
    platform,
    isNative: true,
    installUpdate: async () => {
      await update.downloadAndInstall()
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    },
  }
}

/** Checks the public GitHub release feed for web and Android downloads. */
async function checkGithubRelease(platform: PlatformType, isNative: boolean): Promise<AppUpdateInfo> {
  const response = await fetch(RELEASES_API_URL, {
    headers: {
      Accept: 'application/vnd.github.v3+json',
    },
  })

  if (!response.ok) {
    throw new Error(`Failed to check updates (HTTP ${response.status})`)
  }

  const data = await response.json() as GithubReleasePayload
  const latestTag = typeof data.tag_name === 'string' ? data.tag_name : ''
  const latestVersion = normalizeReleaseVersion(latestTag)
  const isAvailable = isNewerVersion(latestVersion, CURRENT_APP_VERSION)
  const assets = Array.isArray(data.assets) ? data.assets as ReleaseAsset[] : []
  const bestAsset = findPlatformAsset(assets, platform)
  const changelog = isAvailable ? await loadReleaseChangelog(data) : mergeReleaseChangelog()
  const releaseName = typeof data.name === 'string' && data.name.trim() ? data.name : `Anchor ${latestTag || `v${CURRENT_APP_VERSION}`}`
  const releaseNotes = typeof data.body === 'string' && data.body.trim()
    ? data.body
    : 'New features, improvements, and calm stability enhancements.'
  const publishedAt = typeof data.published_at === 'string' ? data.published_at : new Date().toISOString()
  const htmlUrl = typeof data.html_url === 'string' && data.html_url ? data.html_url : RELEASES_WEB_URL

  return {
    isAvailable,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: latestVersion || CURRENT_APP_VERSION,
    releaseName,
    releaseNotes,
    publishedAt,
    changelog,
    downloadUrl: platform === 'web'
      ? htmlUrl
      : bestAsset?.browser_download_url ?? htmlUrl,
    assetName: platform === 'web' ? undefined : bestAsset?.name,
    htmlUrl,
    platform,
    isNative,
    installUpdate: isNative && platform === 'android' && bestAsset
      ? (onProgress) => downloadAndInstallAndroidUpdate(bestAsset.browser_download_url, onProgress)
      : undefined,
  }
}

/**
 * Checks for a signed native update first, then falls back to the public release
 * page. Android uses the public GitHub metadata so its APK can be downloaded and
 * handed to the system installer.
 */
export async function checkAppUpdate(): Promise<AppUpdateInfo> {
  const platform = getAppPlatform()
  const isNative = isNativeApp()

  if (isNative && platform !== 'android') {
    try {
      const nativeUpdate = await checkTauriUpdate(platform, isNative)
      if (nativeUpdate) {
        return nativeUpdate
      }
    } catch {
      // A native build without updater metadata can still use the release page.
    }
  }

  try {
    return await checkGithubRelease(platform, isNative)
  } catch {
    return noUpdateAvailable(platform, isNative)
  }
}
