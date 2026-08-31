import type { ServerResponse } from 'node:http'
import { handleAIProxy } from '../vite-ai-proxy.js'

export default async function handler(request: Parameters<typeof handleAIProxy>[0], response: ServerResponse): Promise<void> {
  await handleAIProxy(request, response)
}
