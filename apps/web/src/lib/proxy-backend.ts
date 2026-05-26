import { NextRequest, NextResponse } from 'next/server'
import { getBackendUrl } from '@/lib/backend-url'

type ProxyOptions = {
  method?: string
  body?: unknown
}

/**
 * Forward request to Express (team domain).
 * Express strips `/api` prefix — pass paths like `/api/team/members`.
 */
export async function proxyToBackend(
  request: NextRequest,
  apiPath: string,
  options: ProxyOptions = {}
): Promise<NextResponse> {
  const backendUrl = getBackendUrl()
  const token = request.headers.get('authorization')?.split(' ')[1] || ''
  const method = options.method ?? request.method

  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`
  }

  let body: string | undefined
  if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  } else if (method !== 'GET' && method !== 'HEAD') {
    try {
      const json = await request.json()
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify(json)
    } catch {
      /* no body */
    }
  }

  const response = await fetch(`${backendUrl}${apiPath.startsWith('/') ? apiPath : `/${apiPath}`}`, {
    method,
    headers,
    body
  })

  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const data = await response.json()
    return NextResponse.json(data, { status: response.status })
  }

  const text = await response.text()
  return NextResponse.json({ error: text || 'Réponse non-JSON du backend' }, { status: response.status })
}
