import { afterEach, describe, expect, it, vi } from 'vitest'
import { AI_PROVIDERS, discoverModels, isAIReady, parseAIObject, runAIToolAgent } from './ai'
import type { AISettings } from './ai'

const settings: AISettings = {
  providerId: 'openrouter',
  apiKey: 'test-key',
  model: '',
  baseUrl: '',
  accountId: '',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('AI provider connections', () => {
  it('includes the requested provider routes without bundling a model catalog', () => {
    const providerIds = AI_PROVIDERS.map((provider) => provider.id)

    expect(providerIds).toEqual(expect.arrayContaining([
      'opencode-zen',
      'opencode-go',
      'nvidia-nim',
      'openrouter',
      'mistral',
      'cloudflare-workers-ai',
      'openai-codex-browser',
      'gemini',
    ]))
    expect(AI_PROVIDERS.every((provider) => !('models' in provider))).toBe(true)
  })

  it('recognizes when a configured connection can be used for actions', () => {
    expect(isAIReady({ ...settings, model: 'live-model' })).toBe(true)
    expect(isAIReady({ ...settings, apiKey: '' })).toBe(false)
    expect(isAIReady({ ...settings, model: '' })).toBe(false)
    expect(isAIReady({ ...settings, providerId: 'cloudflare-workers-ai', model: 'model' })).toBe(false)
  })

  it('reads JSON drafts wrapped in markdown fences or explanatory text', () => {
    expect(parseAIObject('```json\n{"title":"A clear title"}\n```')).toEqual({ title: 'A clear title' })
    expect(parseAIObject('Here is the draft: {"tag":"Focus"}')).toEqual({ tag: 'Focus' })
  })

  it('maps the provider model response at runtime', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'live-model-a' }, { id: 'live-model-b', name: 'Readable model' }] }),
    })
    vi.stubGlobal('fetch', fetchMock)

    const models = await discoverModels(settings)

    expect(models.map((model) => model.id)).toEqual(['live-model-a', 'live-model-b'])
    expect(fetchMock).toHaveBeenCalledWith(
      'https://openrouter.ai/api/v1/models',
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-key' }) }),
    )
  })

  it('runs a local tool before returning an agent answer', async () => {
    const responses = [
      '{"type":"tool_call","tool":"search_workspace","input":{"query":"sleep"}}',
      '{"type":"final","answer":"I found the sleep anchor."}',
    ]
    const fetchMock = vi.fn().mockImplementation(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: responses.shift() } }] }),
    }))
    const executeTool = vi.fn().mockReturnValue('{"results":[{"id":"sleep-anchor"}]}')
    vi.stubGlobal('fetch', fetchMock)

    const result = await runAIToolAgent({ ...settings, model: 'live-model' }, {
      systemPrompt: 'Use the workspace carefully.',
      messages: [{ role: 'user', content: 'Find my sleep anchor.' }],
      tools: [{ name: 'search_workspace', description: 'Search local records.', input: '{"query":"..."}' }],
      executeTool,
    })

    expect(result.answer).toBe('I found the sleep anchor.')
    expect(result.toolCalls).toEqual(['search_workspace'])
    expect(executeTool).toHaveBeenCalledWith('search_workspace', { query: 'sleep' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
