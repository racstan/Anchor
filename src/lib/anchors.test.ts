import { describe, expect, it } from 'vitest'
import { filterAnchors, formatUpdatedAt, getProjectAnchorCount, matchSearchText } from './anchors'
import type { Anchor } from './anchors'

const anchors: Anchor[] = [
  {
    id: 'global-pause',
    title: 'Pause before you pivot.',
    body: 'Give the current direction a fair attempt.',
    scope: 'global',
    tag: 'Decision making',
    color: 'coral',
    pinned: true,
    evidence: {
      label: 'Stanford Research',
      url: 'https://example.com/stanford',
    },
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
  {
    id: 'trade-plan',
    title: 'Trade the plan.',
    body: 'The job is to execute the setup.',
    scope: 'project',
    projectId: 'trading',
    tag: 'Strategy',
    color: 'gold',
    pinned: true,
    createdAt: '2025-01-01T00:00:00.000Z',
    updatedAt: '2025-01-01T00:00:00.000Z',
  },
]

describe('anchor filtering', () => {
  it('returns every anchor when no filter is applied', () => {
    expect(filterAnchors(anchors, 'all', undefined, '')).toHaveLength(2)
  })

  it('limits results to global context', () => {
    expect(filterAnchors(anchors, 'global', undefined, '')).toEqual([anchors[0]])
  })

  it('limits results to one project and searches its content', () => {
    expect(filterAnchors(anchors, 'projects', 'trading', 'execute')).toEqual([anchors[1]])
    expect(filterAnchors(anchors, 'projects', 'trading', 'pause')).toEqual([])
  })

  it('matches anchors by evidence source label', () => {
    expect(filterAnchors(anchors, 'all', undefined, 'Stanford')).toEqual([anchors[0]])
  })
})

describe('fuzzy search', () => {
  it('matches letters in order even when they are not next to each other', () => {
    expect(matchSearchText('Patience', 'ptec')?.indices).toEqual([0, 2, 4, 6])
  })

  it('ranks an exact substring ahead of a loose letter match', () => {
    const exact = filterAnchors(anchors, 'all', undefined, 'plan')
    const loose = filterAnchors(anchors, 'all', undefined, 'tah')

    expect(exact[0].id).toBe('trade-plan')
    expect(loose[0].id).toBe('trade-plan')
  })
})

describe('project anchor counts', () => {
  it('counts only anchors belonging to the requested project', () => {
    expect(getProjectAnchorCount(anchors, 'trading')).toBe(1)
    expect(getProjectAnchorCount(anchors, 'writing')).toBe(0)
  })
})

describe('formatUpdatedAt', () => {
  it('formats recent timestamps with human relative time', () => {
    const now = new Date().toISOString()
    expect(formatUpdatedAt(now)).toBe('Updated just now')

    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    expect(formatUpdatedAt(tenMinAgo)).toBe('Updated 10m ago')

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
    expect(formatUpdatedAt(twoHoursAgo)).toBe('Updated 2h ago')
  })
})
