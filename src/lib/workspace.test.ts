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
      theme: 'dark',
      sidebarCollapsed: true,
      ai: {
        providerId: 'openai',
        model: 'gpt-4.1-mini',
        baseUrl: 'https://api.openai.com/v1',
        accountId: 'account-123',
      },
    })
    const parsed = parseWorkspaceExport(raw)

    expect(parsed.preferences.theme).toBe('dark')
    expect(parsed.preferences.sidebarCollapsed).toBe(true)
    expect(parsed.preferences.ai?.model).toBe('gpt-4.1-mini')
    expect(raw).not.toContain('apiKey')
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
