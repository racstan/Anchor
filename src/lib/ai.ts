export type AIProtocol = 'openai-compatible' | 'gemini' | 'cloudflare'

export interface AIProvider {
  id: string
  name: string
  description: string
  protocol: AIProtocol
  baseUrl: string
  keyLabel: string
  requiresAccountId?: boolean
}

export interface AIModel {
  id: string
  name: string
  description?: string
}

export interface AISettings {
  providerId: string
  apiKey: string
  model: string
  baseUrl: string
  accountId: string
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'opencode-zen',
    name: 'OpenCode Zen',
    description: 'Curated models through OpenCode’s API.',
    protocol: 'openai-compatible',
    baseUrl: 'https://opencode.ai/zen/v1',
    keyLabel: 'OpenCode API key',
  },
  {
    id: 'opencode-go',
    name: 'OpenCode Go',
    description: 'OpenCode’s affordable hosted model route.',
    protocol: 'openai-compatible',
    baseUrl: 'https://opencode.ai/zen/go/v1',
    keyLabel: 'OpenCode Go API key',
  },
  {
    id: 'nvidia-nim',
    name: 'NVIDIA NIM',
    description: 'NVIDIA-hosted inference with an OpenAI-compatible API.',
    protocol: 'openai-compatible',
    baseUrl: 'https://integrate.api.nvidia.com/v1',
    keyLabel: 'NVIDIA API key',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    description: 'One key for a broad set of model providers.',
    protocol: 'openai-compatible',
    baseUrl: 'https://openrouter.ai/api/v1',
    keyLabel: 'OpenRouter API key',
  },
  {
    id: 'mistral',
    name: 'Mistral',
    description: 'Mistral’s direct model API.',
    protocol: 'openai-compatible',
    baseUrl: 'https://api.mistral.ai/v1',
    keyLabel: 'Mistral API key',
  },
  {
    id: 'cloudflare-workers-ai',
    name: 'Cloudflare Workers AI',
    description: 'Run models from your Cloudflare account at the edge.',
    protocol: 'cloudflare',
    baseUrl: 'https://api.cloudflare.com/client/v4',
    keyLabel: 'Cloudflare API token',
    requiresAccountId: true,
  },
  {
    id: 'openai-codex-browser',
    name: 'OpenAI Codex (browser)',
    description: 'Use an OpenAI-compatible browser connection for Codex work.',
    protocol: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    keyLabel: 'OpenAI API key or browser token',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    description: 'Google’s Gemini Generative Language API.',
    protocol: 'gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    keyLabel: 'Gemini API key',
  },
  {
    id: 'openai',
    name: 'OpenAI API',
    description: 'OpenAI’s direct model API.',
    protocol: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    keyLabel: 'OpenAI API key',
  },
  {
    id: 'custom-openai-compatible',
    name: 'Custom OpenAI-compatible',
    description: 'Connect any provider that exposes /models and /chat/completions.',
    protocol: 'openai-compatible',
    baseUrl: '',
    keyLabel: 'Provider API key',
  },
]

export const DEFAULT_AI_SETTINGS: AISettings = {
  providerId: 'openrouter',
  apiKey: '',
  model: '',
  baseUrl: '',
  accountId: '',
}

export const AI_SETTINGS_STORAGE_KEY = 'anchor-ai-settings-v1'

export function readAISettings(): AISettings {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_AI_SETTINGS }
  }

  try {
    const savedSettings = window.localStorage.getItem(AI_SETTINGS_STORAGE_KEY)

    if (!savedSettings) {
      return { ...DEFAULT_AI_SETTINGS }
    }

    const parsedSettings = JSON.parse(savedSettings) as Partial<AISettings>
    const providerId = typeof parsedSettings.providerId === 'string' && AI_PROVIDERS.some((provider) => provider.id === parsedSettings.providerId)
      ? parsedSettings.providerId
      : DEFAULT_AI_SETTINGS.providerId

    return {
      providerId,
      apiKey: typeof parsedSettings.apiKey === 'string' ? parsedSettings.apiKey : '',
      model: typeof parsedSettings.model === 'string' ? parsedSettings.model : '',
      baseUrl: typeof parsedSettings.baseUrl === 'string' ? parsedSettings.baseUrl : '',
      accountId: typeof parsedSettings.accountId === 'string' ? parsedSettings.accountId : '',
    }
  } catch {
    return { ...DEFAULT_AI_SETTINGS }
  }
}

export function writeAISettings(settings: AISettings): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(AI_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

function trimTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, '')
}

function getProvider(settings: AISettings): AIProvider {
  const provider = AI_PROVIDERS.find((item) => item.id === settings.providerId)

  if (!provider) {
    throw new Error('Choose an AI provider before continuing.')
  }

  return provider
}

function getBaseUrl(settings: AISettings, provider: AIProvider): string {
  const baseUrl = trimTrailingSlash(settings.baseUrl || provider.baseUrl)

  if (!baseUrl) {
    throw new Error('Add the provider base URL in Settings first.')
  }

  return baseUrl
}

function getApiKey(settings: AISettings): string {
  const apiKey = settings.apiKey.trim()

  if (!apiKey) {
    throw new Error('Add an API key in Settings before asking Anchor to think this through.')
  }

  return apiKey
}

function getAccountId(settings: AISettings): string {
  const accountId = settings.accountId.trim()

  if (!accountId) {
    throw new Error('Add your Cloudflare account ID in Settings before continuing.')
  }

  return accountId
}

async function fetchThroughAnchorProxy(url: string, init: RequestInit): Promise<Response | undefined> {
  if (typeof window === 'undefined') {
    return undefined
  }

  try {
    const proxyResponse = await fetch('/api/anchor-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        method: init.method ?? 'GET',
        headers: Object.fromEntries(new Headers(init.headers).entries()),
        body: typeof init.body === 'string' ? init.body : undefined,
      }),
      signal: init.signal,
    })
    const contentType = proxyResponse.headers.get('content-type') ?? ''

    if (proxyResponse.status === 404 && contentType.includes('text/html')) {
      return undefined
    }

    if (proxyResponse.status === 200 && contentType.includes('text/html')) {
      return undefined
    }

    return proxyResponse
  } catch (error) {
    if (init.signal?.aborted) {
      throw error
    }

    return undefined
  }
}

async function fetchJson(url: string, init: RequestInit): Promise<unknown> {
  let response: Response

  try {
    response = (await fetchThroughAnchorProxy(url, init)) ?? await fetch(url, init)
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Anchor could not reach this provider. The local AI relay may be unavailable, or the provider may be blocking browser requests.')
    }

    throw error
  }

  if (!response.ok) {
    let detail = ''

    try {
      const payload = (await response.json()) as { error?: { message?: string }; message?: string }
      detail = payload.error?.message ?? payload.message ?? ''
    } catch {
      detail = ''
    }

    throw new Error(detail || `The provider returned ${response.status}.`)
  }

  return response.json()
}

function authHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }
}

function readModelId(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }

  if (typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string') {
    return value.id
  }

  if (typeof value === 'object' && value !== null && 'name' in value && typeof value.name === 'string') {
    return value.name
  }

  return ''
}

function readModelName(value: unknown, id: string): string {
  if (typeof value === 'object' && value !== null && 'displayName' in value && typeof value.displayName === 'string') {
    return value.displayName
  }

  if (typeof value === 'object' && value !== null && 'name' in value && typeof value.name === 'string') {
    return value.name.replace(/^models\//, '')
  }

  return id.replace(/^models\//, '')
}

function toModels(values: unknown[]): AIModel[] {
  const seen = new Set<string>()

  return values
    .map((value): AIModel | null => {
      const id = readModelId(value)

      if (!id || seen.has(id)) {
        return null
      }

      seen.add(id)
      return {
        id,
        name: readModelName(value, id),
        description:
          typeof value === 'object' && value !== null && 'description' in value && typeof value.description === 'string'
            ? value.description
            : undefined,
      }
    })
    .filter((model): model is AIModel => model !== null)
    .sort((first, second) => first.name.localeCompare(second.name))
}

export async function discoverModels(settings: AISettings, signal?: AbortSignal): Promise<AIModel[]> {
  const provider = getProvider(settings)
  const apiKey = getApiKey(settings)
  const baseUrl = getBaseUrl(settings, provider)

  if (provider.protocol === 'gemini') {
    const payload = (await fetchJson(`${baseUrl}/models?key=${encodeURIComponent(apiKey)}`, {
      headers: { 'Content-Type': 'application/json' },
      signal,
    })) as { models?: unknown[] }
    const models = (payload.models ?? []).filter((model) => {
      if (typeof model !== 'object' || model === null || !('supportedGenerationMethods' in model)) {
        return true
      }

      return Array.isArray(model.supportedGenerationMethods) && model.supportedGenerationMethods.includes('generateContent')
    })

    return toModels(models)
  }

  if (provider.protocol === 'cloudflare') {
    const accountId = getAccountId(settings)
    const payload = (await fetchJson(
      `${baseUrl}/accounts/${encodeURIComponent(accountId)}/ai/models/search?per_page=100`,
      {
        headers: { Authorization: `Bearer ${apiKey}` },
        signal,
      },
    )) as { result?: unknown[] }

    return toModels(payload.result ?? [])
  }

  const payload = (await fetchJson(`${baseUrl}/models`, {
    headers: authHeaders(apiKey),
    signal,
  })) as { data?: unknown[] }

  return toModels(payload.data ?? [])
}

function extractText(payload: unknown): string {
  if (typeof payload === 'string') {
    return payload
  }

  if (typeof payload !== 'object' || payload === null) {
    return ''
  }

  if ('choices' in payload && Array.isArray(payload.choices) && payload.choices.length > 0) {
    const choice = payload.choices[0]

    if (typeof choice === 'object' && choice !== null && 'message' in choice && typeof choice.message === 'object' && choice.message !== null && 'content' in choice.message) {
      const content = choice.message.content

      if (typeof content === 'string') {
        return content
      }

      if (Array.isArray(content)) {
        return content
          .map((part: unknown) => {
            if (typeof part === 'string') return part
            if (typeof part === 'object' && part !== null && 'text' in part && typeof (part as { text: unknown }).text === 'string') {
              return (part as { text: string }).text
            }
            return ''
          })
          .join('')
      }
    }

    if (typeof choice === 'object' && choice !== null && 'text' in choice && typeof (choice as { text: unknown }).text === 'string') {
      return (choice as { text: string }).text
    }
  }

  if ('candidates' in payload && Array.isArray(payload.candidates) && payload.candidates.length > 0) {
    const candidate = payload.candidates[0]

    if (typeof candidate === 'object' && candidate !== null && 'content' in candidate && typeof candidate.content === 'object' && candidate.content !== null && 'parts' in candidate.content && Array.isArray(candidate.content.parts)) {
      const partsText = candidate.content.parts
        .map((part: unknown) => {
          if (typeof part === 'object' && part !== null && 'text' in part && typeof (part as { text: unknown }).text === 'string') {
            return (part as { text: string }).text
          }
          return ''
        })
        .join('')

      if (partsText) {
        return partsText
      }
    }

    if (typeof candidate === 'object' && candidate !== null && 'finishReason' in candidate && candidate.finishReason === 'SAFETY') {
      throw new Error('This request was blocked by the provider’s safety filter. Please rephrase the context.')
    }
  }

  if ('result' in payload) {
    const result = payload.result

    if (typeof result === 'string') {
      return result
    }

    if (typeof result === 'object' && result !== null) {
      if ('response' in result && typeof (result as { response: unknown }).response === 'string') {
        return (result as { response: string }).response
      }
      if ('text' in result && typeof (result as { text: unknown }).text === 'string') {
        return (result as { text: string }).text
      }
    }
  }

  if ('output_text' in payload && typeof payload.output_text === 'string') {
    return payload.output_text
  }

  return ''
}

function ensureText(payload: unknown): string {
  const text = extractText(payload).trim()

  if (!text) {
    throw new Error('The provider returned an empty response. Try another model or add more context.')
  }

  return text
}

export async function completeAIChat(
  settings: AISettings,
  messages: AIMessage[],
  signal?: AbortSignal,
): Promise<string> {
  const provider = getProvider(settings)
  const apiKey = getApiKey(settings)
  const model = settings.model.trim()

  if (!model) {
    throw new Error('Choose or type a model in Settings before starting a decision.')
  }

  const baseUrl = getBaseUrl(settings, provider)

  if (provider.protocol === 'gemini') {
    const systemMessage = messages.find((message) => message.role === 'system')
    const nonSystemMessages = messages.filter((message) => message.role !== 'system')

    const contents: { role: string; parts: { text: string }[] }[] = []
    for (const message of nonSystemMessages) {
      const geminiRole = message.role === 'assistant' ? 'model' : 'user'
      const lastEntry = contents[contents.length - 1]

      if (lastEntry && lastEntry.role === geminiRole) {
        lastEntry.parts.push({ text: message.content })
      } else {
        contents.push({
          role: geminiRole,
          parts: [{ text: message.content }],
        })
      }
    }

    if (contents.length > 0 && contents[0].role === 'model') {
      contents.unshift({ role: 'user', parts: [{ text: 'Hello.' }] })
    }

    const payload = await fetchJson(
      `${baseUrl}/models/${encodeURIComponent(model.replace(/^models\//, ''))}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: systemMessage ? { parts: [{ text: systemMessage.content }] } : undefined,
          contents,
          generationConfig: { temperature: 0.35 },
        }),
        signal,
      },
    )

    return ensureText(payload)
  }

  if (provider.protocol === 'cloudflare') {
    const accountId = getAccountId(settings)
    const payload = await fetchJson(
      `${baseUrl}/accounts/${encodeURIComponent(accountId)}/ai/run/${encodeURIComponent(model)}`,
      {
        method: 'POST',
        headers: authHeaders(apiKey),
        body: JSON.stringify({ messages }),
        signal,
      },
    )

    return ensureText(payload)
  }

  const payload = await fetchJson(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: JSON.stringify({ model, messages, temperature: 0.35, stream: false }),
    signal,
  })

  return ensureText(payload)
}
