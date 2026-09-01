import { describe, expect, it } from 'vitest'
import { initialState } from './anchors'
import {
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
    expect(parsed.state.anchors).toHaveLength(initialState.anchors.length)
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
