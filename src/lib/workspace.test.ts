import { describe, expect, it } from 'vitest'
import { initialState } from './anchors'
import {
  mergeWorkspacePreferences,
  mergeWorkspaceProfile,
  mergeWorkspaceState,
  parseWorkspaceExport,
  serializeWorkspaceExport,
} from './workspace'

describe('workspace backups', () => {
  it('round-trips workspace data and the user profile', () => {
    const raw = serializeWorkspaceExport(initialState, { name: 'Maya' })
    const parsed = parseWorkspaceExport(raw)

    expect(parsed.profile).toEqual({ name: 'Maya' })
    expect(parsed.state).toEqual(initialState)
  })

  it('accepts legacy state-only backups', () => {
    const parsed = parseWorkspaceExport(JSON.stringify(initialState))

    expect(parsed.profile).toEqual({ name: '' })
    expect(parsed.preferences).toEqual({})
    expect(parsed.state.anchors).toHaveLength(initialState.anchors.length)
  })

  it('round-trips safe preferences without exporting AI secrets', () => {
    const raw = serializeWorkspaceExport(initialState, { name: 'Maya' }, {
      updatedAt: '2026-01-02T00:00:00.000Z',
      theme: 'dusk',
      sidebarCollapsed: true,
      ai: {
        providerId: 'openai',
        model: 'gpt-4.1-mini',
        baseUrl: 'https://api.openai.com/v1',
        accountId: 'account-123',
        apiKey: 'do-not-export',
      },
      notifications: {
        enabled: true,
        aiResponses: true,
        anchorReminders: true,
        thoughtReminders: false,
        frequency: 'daily',
        time: '09:30',
        weekday: 1,
        weekdays: [2, 3, 4, 5, 6],
        intervalMinutes: 120,
      },
    })
    const parsed = parseWorkspaceExport(raw)

    expect(parsed.preferences.theme).toBe('dusk')
    expect(parsed.preferences.sidebarCollapsed).toBe(true)
    expect(parsed.preferences.ai?.model).toBe('gpt-4.1-mini')
    expect(parsed.preferences.notifications?.time).toBe('09:30')
    expect(raw).not.toContain('apiKey')
  })

  it('includes the AI key in an explicitly requested cloud-sync snapshot', () => {
    const raw = serializeWorkspaceExport(initialState, { name: 'Maya' }, {
      updatedAt: '2026-01-02T00:00:00.000Z',
      ai: {
        providerId: 'openai',
        model: 'gpt-4.1-mini',
        baseUrl: 'https://api.openai.com/v1',
        accountId: '',
        apiKey: 'sync-me-carefully',
      },
    }, { includeAIKey: true })
    const parsed = parseWorkspaceExport(raw)

    expect(parsed.preferences.ai?.apiKey).toBe('sync-me-carefully')
    expect(raw).toContain('sync-me-carefully')
  })

  it('prefers newer preference snapshots while preserving local settings', () => {
    const current = {
      updatedAt: '2026-01-03T00:00:00.000Z',
      theme: 'dark' as const,
      sidebarCollapsed: true,
    }
    const older = {
      updatedAt: '2026-01-02T00:00:00.000Z',
      theme: 'light' as const,
      sidebarCollapsed: false,
    }

    expect(mergeWorkspacePreferences(current, older)).toEqual(current)
  })

  it('does not lose a local AI key when an incoming snapshot predates key sync', () => {
    const current = {
      updatedAt: '2026-01-01T00:00:00.000Z',
      ai: {
        providerId: 'openai',
        model: 'gpt-4.1-mini',
        baseUrl: 'https://api.openai.com/v1',
        accountId: '',
        apiKey: 'keep-local-key',
      },
    }
    const incoming = {
      updatedAt: '2026-01-02T00:00:00.000Z',
      ai: {
        providerId: 'openai',
        model: 'gpt-4.1-mini',
        baseUrl: 'https://api.openai.com/v1',
        accountId: '',
      },
    }

    expect(mergeWorkspacePreferences(current, incoming).ai?.apiKey).toBe('keep-local-key')
  })

  it('syncs the newer profile without replacing a newer local name', () => {
    const current = { name: 'Local name', updatedAt: '2026-01-03T00:00:00.000Z' }
    const incoming = { name: 'Remote name', updatedAt: '2026-01-02T00:00:00.000Z' }

    expect(mergeWorkspaceProfile(current, incoming)).toEqual(current)
    expect(mergeWorkspaceProfile({ name: '' }, { name: 'Remote name' })).toEqual({ name: 'Remote name' })
  })

  it('merges incoming records by id without duplicating them', () => {
    const incoming = {
      ...initialState,
      anchors: [
        { ...initialState.anchors[0], title: 'Updated anchor' },
      ],
    }
    const merged = mergeWorkspaceState(initialState, incoming)

    expect(merged.anchors).toHaveLength(initialState.anchors.length)
    expect(merged.anchors.find((anchor) => anchor.id === initialState.anchors[0].id)?.title).toBe('Updated anchor')
  })

  it('rejects malformed backups', () => {
    expect(() => parseWorkspaceExport('{"format":"anchor-workspace","version":1,"state":{}}')).toThrow(
      'valid anchor list',
    )
  })
})
