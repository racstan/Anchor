import { describe, expect, it } from 'vitest'
import { isNewerVersion, findPlatformAsset } from './updater'
import type { ReleaseAsset } from './updater'

describe('updater module', () => {
  it('correctly compares semantic versions', () => {
    expect(isNewerVersion('0.1.2', '0.1.1')).toBe(true)
    expect(isNewerVersion('v0.2.0', '0.1.1')).toBe(true)
    expect(isNewerVersion('1.0.0', '0.1.1')).toBe(true)
    expect(isNewerVersion('0.1.1', '0.1.1')).toBe(false)
    expect(isNewerVersion('0.1.0', '0.1.1')).toBe(false)
    expect(isNewerVersion('v0.1.1', 'v0.1.1')).toBe(false)
  })

  it('selects platform-specific assets appropriately', () => {
    const assets: ReleaseAsset[] = [
      { name: 'anchor_0.1.2_amd64.deb', browser_download_url: 'https://.../deb', size: 1000 },
      { name: 'Anchor_0.1.2_x64_en-US.msi', browser_download_url: 'https://.../msi', size: 1000 },
      { name: 'Anchor_0.1.2_aarch64.dmg', browser_download_url: 'https://.../dmg', size: 1000 },
      { name: 'app-universal-release.apk', browser_download_url: 'https://.../apk', size: 1000 },
    ]

    expect(findPlatformAsset(assets, 'android')?.name).toBe('app-universal-release.apk')
    expect(findPlatformAsset(assets, 'desktop-windows')?.name).toBe('Anchor_0.1.2_x64_en-US.msi')
    expect(findPlatformAsset(assets, 'desktop-macos')?.name).toBe('Anchor_0.1.2_aarch64.dmg')
    expect(findPlatformAsset(assets, 'desktop-linux')?.name).toBe('anchor_0.1.2_amd64.deb')
  })
})
