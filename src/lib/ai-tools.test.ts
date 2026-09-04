import { describe, expect, it } from 'vitest'
import { initialState } from './anchors'
import { createWorkspaceToolset } from './ai-tools'

describe('workspace AI tools', () => {
  it('searches local records and returns exact ids for follow-up lookups', () => {
    const tools = createWorkspaceToolset(initialState)
    const search = JSON.parse(tools.execute('search_workspace', { query: 'sleep' })) as {
      results: Array<{ kind: string; id: string; reference: string }>
    }

    expect(search.results[0]).toMatchObject({
      kind: 'anchor',
      id: 'protect-sleep-window',
      reference: 'GLOBAL-ANCHOR-0002',
    })

    const anchor = JSON.parse(tools.execute('get_anchor', { id: search.results[0].id })) as {
      title: string
      body: string
    }
    expect(anchor.title).toBe('Protect a regular sleep window.')
    expect(anchor.body).toContain('consistent sleep')
  })

  it('reports workspace totals without exposing unrelated state', () => {
    const tools = createWorkspaceToolset(initialState)
    const overview = JSON.parse(tools.execute('get_workspace_overview', {})) as {
      counts: { anchors: number; projects: number; notes: number; decisions: number }
    }

    expect(overview.counts).toEqual({
      anchors: initialState.anchors.length,
      projects: initialState.projects.length,
      notes: 0,
      decisions: 0,
    })
  })
})
