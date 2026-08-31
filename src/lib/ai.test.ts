import { afterEach, describe, expect, it, vi } from 'vitest'
import { AI_PROVIDERS, discoverModels } from './ai'
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
})
