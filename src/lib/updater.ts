export type PlatformType = 'web' | 'desktop-windows' | 'desktop-macos' | 'desktop-linux' | 'android'

export const CURRENT_APP_VERSION = '0.1.6'
export const GITHUB_REPO = 'racstan/Anchor'
export const RELEASES_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`
export const RELEASES_WEB_URL = `https://github.com/${GITHUB_REPO}/releases/latest`

export interface ReleaseAsset {
  name: string
  browser_download_url: string
  size: number
}

export interface AppUpdateInfo {
  isAvailable: boolean
  currentVersion: string
  latestVersion: string
  releaseName: string
  releaseNotes: string
  publishedAt: string
  downloadUrl?: string
  assetName?: string
  installUpdate?: () => Promise<void>
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

function noUpdateAvailable(platform: PlatformType, isNative: boolean): AppUpdateInfo {
  return {
    isAvailable: false,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: CURRENT_APP_VERSION,
    releaseName: `Anchor v${CURRENT_APP_VERSION}`,
    releaseNotes: '',
    publishedAt: new Date().toISOString(),
    htmlUrl: RELEASES_WEB_URL,
    platform,
    isNative,
  }
}

/**
 * Uses Tauri's signed updater on desktop. Android is intentionally excluded:
 * Android does not support this plugin, so Android users receive the signed APK
 * download from the GitHub release instead.
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

  return {
    isAvailable: true,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: update.version,
    releaseName: `Anchor v${update.version}`,
    releaseNotes: update.body || 'New features, improvements, and calm stability enhancements.',
    publishedAt: update.date || new Date().toISOString(),
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

  const data = await response.json()
  const latestVersion = (data.tag_name || '').replace(/^v/i, '')
  const isAvailable = isNewerVersion(latestVersion, CURRENT_APP_VERSION)
  const bestAsset = findPlatformAsset(data.assets || [], platform)

  return {
    isAvailable,
    currentVersion: CURRENT_APP_VERSION,
    latestVersion: latestVersion || CURRENT_APP_VERSION,
    releaseName: data.name || `Anchor ${data.tag_name}`,
    releaseNotes: data.body || 'New features, improvements, and calm stability enhancements.',
    publishedAt: data.published_at || new Date().toISOString(),
    downloadUrl: platform === 'web'
      ? data.html_url ?? RELEASES_WEB_URL
      : bestAsset?.browser_download_url ?? data.html_url ?? RELEASES_WEB_URL,
    assetName: platform === 'web' ? undefined : bestAsset?.name,
    htmlUrl: data.html_url || RELEASES_WEB_URL,
    platform,
    isNative,
  }
}

/**
 * Checks for a signed native update first, then falls back to the public release
 * page. Web and Android always use the public GitHub release metadata.
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
