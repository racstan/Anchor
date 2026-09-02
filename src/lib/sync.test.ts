import { describe, expect, it } from 'vitest'
import {
  getDropboxAuthUrl,
  getDropboxBackupPath,
  getDropboxVaultFolder,
  mergeSyncState,
  normalizeSyncSettings,
  readSyncSettings,
} from './sync'
import type { AnchorState } from './anchors'

describe('timestamp-aware CRDT merge', () => {
  it('merges records preferring the newer timestamp', () => {
    const localState: AnchorState = {
      anchors: [
        {
          id: 'anchor-1',
          title: 'Local title older',
          body: 'Local body',
          scope: 'global',
          tag: 'Tag',
          color: 'coral',
          pinned: true,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'anchor-2',
          title: 'Local only anchor',
          body: 'Local only body',
          scope: 'global',
          tag: 'Tag',
          color: 'sky',
          pinned: false,
          createdAt: '2026-01-02T00:00:00Z',
          updatedAt: '2026-01-02T00:00:00Z',
        },
      ],
      projects: [],
      decisions: [],
      notes: [],
    }

    const remoteState: AnchorState = {
      anchors: [
        {
          id: 'anchor-1',
          title: 'Remote title newer',
          body: 'Remote body modified',
          scope: 'global',
          tag: 'Tag',
          color: 'coral',
          pinned: true,
          createdAt: '2026-01-01T00:00:00Z',
          updatedAt: '2026-01-03T00:00:00Z',
        },
        {
          id: 'anchor-3',
          title: 'Remote only anchor',
          body: 'Remote only body',
          scope: 'global',
          tag: 'Tag',
          color: 'gold',
          pinned: true,
          createdAt: '2026-01-03T00:00:00Z',
          updatedAt: '2026-01-03T00:00:00Z',
        },
      ],
      projects: [],
      decisions: [],
      notes: [],
    }

    const merged = mergeSyncState(localState, remoteState)
    expect(merged.anchors).toHaveLength(3)

    const anchor1 = merged.anchors.find((a) => a.id === 'anchor-1')
    expect(anchor1?.title).toBe('Remote title newer')

    const anchor2 = merged.anchors.find((a) => a.id === 'anchor-2')
    expect(anchor2?.title).toBe('Local only anchor')

    const anchor3 = merged.anchors.find((a) => a.id === 'anchor-3')
    expect(anchor3?.title).toBe('Remote only anchor')
  })
})

describe('Dropbox configuration', () => {
  it('uses the PKCE code flow and the configured callback', () => {
    const url = new URL(getDropboxAuthUrl('test-app-key', 'https://anchor.example/dropbox/callback', 'challenge', 'state'))

    expect(url.origin).toBe('https://www.dropbox.com')
    expect(url.pathname).toBe('/oauth2/authorize')
    expect(url.searchParams.get('response_type')).toBe('code')
    expect(url.searchParams.get('client_id')).toBe('test-app-key')
    expect(url.searchParams.get('redirect_uri')).toBe('https://anchor.example/dropbox/callback')
    expect(url.searchParams.get('token_access_type')).toBe('offline')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
    expect(url.searchParams.get('code_challenge')).toBe('challenge')
    expect(url.searchParams.get('state')).toBe('state')
  })

  it('puts the backup in a folder named after the vault', () => {
    expect(getDropboxVaultFolder('My vault')).toBe('/My_vault')
    expect(getDropboxBackupPath('My vault')).toBe('/My_vault/anchor-vault.json')
  })

  it('normalizes the old default vault name to Anchor', () => {
    const settings = normalizeSyncSettings({
      enabled: true,
      provider: 'dropbox',
      vaultName: 'anchor-vault',
      autoSyncOnStartup: true,
      autoSyncIntervalMinutes: 15,
    })

    expect(settings.vaultName).toBe('Anchor')
    expect(settings.dropboxPath).toBe('/Anchor/anchor-vault.json')
  })

  it('returns the release defaults when no settings are saved', () => {
    const settings = readSyncSettings()
    expect(settings.provider).toBe('none')
    expect(settings.vaultName).toBe('Anchor')
    expect(settings.dropboxAppKey).toBeTruthy()
  })
})
