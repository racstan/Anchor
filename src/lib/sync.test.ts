import { describe, expect, it, vi } from 'vitest'
import {
  getDropboxAuthUrl,
  getDropboxBackupPath,
  getDropboxNativeCallbackUrl,
  getDropboxVaultFolder,
  executeWorkspaceSync,
  isDropboxNativeCallbackUrl,
  isNativeDropboxOAuthState,
  mergeSyncState,
  normalizeSyncSettings,
  readSyncSettings,
  uploadDropboxVault,
} from './sync'
import { initialState } from './anchors'
import type { AnchorState } from './anchors'
import { serializeWorkspaceExport } from './workspace'

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

describe('sync pipeline', () => {
  it('pulls, merges, then pushes one merged snapshot including the AI key', async () => {
    const remotePreferences = {
      updatedAt: '2026-01-02T00:00:00.000Z',
      ai: {
        providerId: 'openai',
        model: 'gpt-4.1-mini',
        baseUrl: 'https://api.openai.com/v1',
        accountId: '',
        apiKey: 'remote-ai-key',
      },
    }
    const remotePayload = serializeWorkspaceExport(initialState, { name: 'Remote name' }, remotePreferences, { includeAIKey: true })
    const phases: string[] = []
    const methods: string[] = []
    let uploadedPayload = ''

    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      methods.push(method)

      if (method === 'PUT') {
        uploadedPayload = new TextDecoder().decode(init?.body as Uint8Array)
      }

      return method === 'GET'
        ? new Response(remotePayload, { status: 200 })
        : new Response(null, { status: 200 })
    }))

    try {
      const result = await executeWorkspaceSync(
        { ...initialState, anchors: [] },
        { name: 'Local name' },
        {
          enabled: true,
          provider: 'webdav',
          vaultName: 'Anchor',
          autoSyncOnStartup: false,
          autoSyncIntervalMinutes: 0,
          webdavUrl: 'https://sync.example.test',
        },
        {
          updatedAt: '2026-01-01T00:00:00.000Z',
          ai: {
            providerId: 'openai',
            model: 'gpt-4.1-mini',
            baseUrl: 'https://api.openai.com/v1',
            accountId: '',
            apiKey: 'local-ai-key',
          },
        },
        { onPhase: (phase) => phases.push(phase) },
      )

      expect(result.success).toBe(true)
      expect(phases).toEqual(['pulling', 'merging', 'pushing'])
      expect(methods).toEqual(['GET', 'PUT'])
      expect(result.mergedPreferences?.ai?.apiKey).toBe('remote-ai-key')
      expect(uploadedPayload).toContain('remote-ai-key')
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('re-pulls before pushing when a WebDAV vault changes mid-sync', async () => {
    const firstPayload = serializeWorkspaceExport(initialState, { name: 'Remote name' })
    const latestState = {
      ...initialState,
      anchors: [{ ...initialState.anchors[0], title: 'Changed on another device', updatedAt: '2026-01-04T00:00:00.000Z' }],
    }
    const latestPayload = serializeWorkspaceExport(latestState, { name: 'Remote name' })
    const methods: string[] = []
    const ifMatchHeaders: (string | null)[] = []
    let getCount = 0
    let putCount = 0

    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      methods.push(method)

      if (method === 'GET') {
        getCount += 1
        return new Response(getCount === 1 ? firstPayload : latestPayload, {
          status: 200,
          headers: { ETag: getCount === 1 ? '"v1"' : '"v2"' },
        })
      }

      putCount += 1
      ifMatchHeaders.push(new Headers(init?.headers).get('If-Match'))
      return new Response(null, { status: putCount === 1 ? 412 : 200 })
    }))

    try {
      const result = await executeWorkspaceSync(
        { ...initialState, anchors: [] },
        { name: 'Local name' },
        {
          enabled: true,
          provider: 'webdav',
          vaultName: 'Anchor',
          autoSyncOnStartup: false,
          autoSyncIntervalMinutes: 0,
          webdavUrl: 'https://sync.example.test',
        },
      )

      expect(result.success).toBe(true)
      expect(methods).toEqual(['GET', 'PUT', 'GET', 'PUT'])
      expect(ifMatchHeaders).toEqual(['"v1"', '"v2"'])
      expect(result.mergedState?.anchors[0]?.title).toBe('Changed on another device')
    } finally {
      vi.unstubAllGlobals()
    }
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

  it('bridges native callbacks without changing Dropbox\'s registered redirect URI', () => {
    const callback = 'https://anchor-chi-eight.vercel.app/dropbox/callback?code=abc123&state=anchor-native-state'
    const nativeCallback = getDropboxNativeCallbackUrl(callback)

    expect(nativeCallback).toBe('anchor://dropbox/callback?code=abc123&state=anchor-native-state')
    expect(isDropboxNativeCallbackUrl(nativeCallback)).toBe(true)
    expect(isNativeDropboxOAuthState('anchor-native-state')).toBe(true)
    expect(isNativeDropboxOAuthState('ordinary-state')).toBe(false)
  })

  it('puts the backup in a folder named after the vault', () => {
    expect(getDropboxVaultFolder('My vault')).toBe('/My_vault')
    expect(getDropboxBackupPath('My vault')).toBe('/My_vault/anchor-vault.json')
  })

  it('sends Dropbox update revisions as strings', async () => {
    let apiArg: Record<string, unknown> | undefined

    vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
      const header = new Headers(init?.headers).get('Dropbox-API-Arg')
      apiArg = header ? JSON.parse(header) as Record<string, unknown> : undefined
      return new Response(null, { status: 200 })
    }))

    try {
      await uploadDropboxVault('token', 'Anchor', '{}', undefined, 'rev-123')

      expect(apiArg).toEqual({
        path: '/Anchor/anchor-vault.json',
        mode: { '.tag': 'update', update: 'rev-123' },
        autorename: false,
        mute: true,
        strict_conflict: true,
      })
    } finally {
      vi.unstubAllGlobals()
    }
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
