import { request as httpRequest } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { request as httpsRequest } from 'node:https'

interface ProxyPayload {
  url?: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

function readRequestBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []

    request.on('data', (chunk: Buffer | string) => chunks.push(Buffer.from(chunk)))
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

function sendError(response: ServerResponse, statusCode: number, message: string): void {
  response.statusCode = statusCode
  response.setHeader('content-type', 'application/json')
  response.end(JSON.stringify({ error: { message } }))
}

function isAllowedTarget(target: URL): boolean {
  return target.protocol === 'https:' ||
    (target.protocol === 'http:' && ['localhost', '127.0.0.1', '::1'].includes(target.hostname))
}

export async function handleAIProxy(request: IncomingMessage, response: ServerResponse): Promise<void> {
  if (request.method !== 'POST') {
    sendError(response, 405, 'The Anchor AI proxy only accepts POST requests.')
    return
  }

  try {
    const body = await readRequestBody(request)
    const payload = JSON.parse(body) as ProxyPayload

    if (!payload.url) {
      sendError(response, 400, 'The provider URL is missing.')
      return
    }

    const target = new URL(payload.url)

    if (!isAllowedTarget(target)) {
      sendError(response, 400, 'Only HTTPS provider URLs are allowed.')
      return
    }

    const forwardedHeaders = Object.fromEntries(
      Object.entries(payload.headers ?? {}).filter(([name]) =>
        !['connection', 'content-length', 'host', 'origin', 'referer'].includes(name.toLowerCase()),
      ),
    )
    const requestBody = payload.body ?? ''
    const requestOptions = {
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || undefined,
      path: `${target.pathname}${target.search}`,
      method: payload.method ?? 'GET',
      headers: {
        ...forwardedHeaders,
        ...(requestBody ? { 'content-length': Buffer.byteLength(requestBody) } : {}),
      },
    }
    const handleResponse = (upstreamResponse: IncomingMessage) => {
      response.statusCode = upstreamResponse.statusCode ?? 502
      if (upstreamResponse.headers['content-type']) {
        response.setHeader('content-type', upstreamResponse.headers['content-type'])
      }
      upstreamResponse.pipe(response)
    }
    const upstreamRequest = target.protocol === 'https:'
      ? httpsRequest(requestOptions, handleResponse)
      : httpRequest(requestOptions, handleResponse)

    upstreamRequest.on('error', (error: Error) => {
      if (!response.headersSent) {
        sendError(response, 502, error.message || 'The provider could not be reached.')
      } else {
        response.end()
      }
    })

    if (requestBody) {
      upstreamRequest.write(requestBody)
    }

    upstreamRequest.end()
  } catch (error) {
    sendError(response, 400, error instanceof Error ? error.message : 'The AI proxy received an invalid request.')
  }
}
