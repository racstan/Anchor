import { describe, expect, it } from 'vitest'
import {
  decryptVault,
  encryptVault,
  mergeSyncState,
  readSyncSettings,
} from './sync'
import type { AnchorState } from './anchors'

describe('sync encryption (E2EE)', () => {
  it('encrypts and decrypts vault content symmetrically', async () => {
    const rawVault = JSON.stringify({ hello: 'anchor world', count: 42 })
    const password = 'calm-harbor-secret-password-123'

    const encrypted = await encryptVault(rawVault, password)
    expect(encrypted).toContain('anchor-encrypted-vault')
    expect(encrypted).not.toContain('anchor world')

    const decrypted = await decryptVault(encrypted, password)
    expect(decrypted).toBe(rawVault)
  })

  it('fails decryption when provided with the wrong password', async () => {
    const rawVault = 'confidential notes'
    const encrypted = await encryptVault(rawVault, 'correct-pass')

    await expect(decryptVault(encrypted, 'wrong-pass')).rejects.toThrow(
      'Incorrect sync encryption password',
    )
  })

  it('returns plaintext unchanged if data was not encrypted', async () => {
    const unencrypted = JSON.stringify({ unencrypted: true })
    const result = await decryptVault(unencrypted, 'any-pass')
    expect(result).toBe(unencrypted)
  })
})

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

describe('sync settings persistence', () => {
  it('returns default sync settings if none saved', () => {
    const settings = readSyncSettings()
    expect(settings.provider).toBe('none')
    expect(settings.vaultName).toBe('anchor-vault')
  })
})
