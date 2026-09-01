export type PlatformType = 'web' | 'desktop-windows' | 'desktop-macos' | 'desktop-linux' | 'android'

export const CURRENT_APP_VERSION = '0.1.3'
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

/**
 * Checks GitHub Releases API for new updates.
 */
export async function checkAppUpdate(): Promise<AppUpdateInfo> {
  const platform = getAppPlatform()
  const isNative = isNativeApp()

  try {
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
      downloadUrl: bestAsset?.browser_download_url ?? data.html_url ?? RELEASES_WEB_URL,
      assetName: bestAsset?.name,
      htmlUrl: data.html_url || RELEASES_WEB_URL,
      platform,
      isNative,
    }
  } catch {
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
}
