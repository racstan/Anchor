import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { listDrafts, readDraft, removeDraft, writeDraft } from './drafts'

describe('local drafts', () => {
  const values = new Map<string, string>()
  const localStorage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => { values.delete(key) },
    clear: () => { values.clear() },
    key: (index: number) => Array.from(values.keys())[index] ?? null,
    get length() {
      return values.size
    },
  } as unknown as Storage

  beforeEach(() => {
    values.clear()
    vi.stubGlobal('window', { localStorage })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('writes and reads a typed draft envelope', () => {
    expect(writeDraft('note:new', 'note', { title: 'Idea', content: 'Keep this.' })).toBe(true)

    expect(readDraft<{ title: string; content: string }>('note:new', 'note')?.data).toEqual({
      title: 'Idea',
      content: 'Keep this.',
    })
    expect(readDraft('note:new', 'project')).toBeUndefined()
  })

  it('lists drafts newest first and removes them', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
    writeDraft('note:one', 'note', { content: 'one' })
    vi.setSystemTime(new Date('2026-01-01T00:00:01.000Z'))
    writeDraft('note:two', 'note', { content: 'two' })

    const drafts = listDrafts<{ content: string }>('note')
    expect(drafts).toHaveLength(2)
    expect(drafts[0].key).toBe('note:two')

    removeDraft('note:two')
    expect(readDraft('note:two', 'note')).toBeUndefined()
  })

  it('ignores malformed draft records', () => {
    values.set('anchor-draft-v1:note:broken', '{not json')

    expect(listDrafts('note')).toEqual([])
  })
})
