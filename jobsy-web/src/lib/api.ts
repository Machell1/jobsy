const API_BASE = 'https://api.jobsyja.com'

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

async function baseFetch(
  endpoint: string,
  options: RequestInit = {},
  token?: string | null
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }
  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  })
}

async function handleResponse(res: Response) {
  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = await res.json()
      detail = body.detail || body.message || JSON.stringify(body)
    } catch {
      try {
        detail = await res.text()
      } catch {
        // keep statusText
      }
    }
    throw new ApiError(res.status, detail)
  }
  const text = await res.text()
  if (!text) return null
  return JSON.parse(text)
}

export async function apiGet(endpoint: string, token?: string | null) {
  const res = await baseFetch(endpoint, { method: 'GET' }, token)
  return handleResponse(res)
}

export async function apiPost(endpoint: string, body?: unknown, token?: string | null) {
  const res = await baseFetch(
    endpoint,
    { method: 'POST', body: body ? JSON.stringify(body) : undefined },
    token
  )
  return handleResponse(res)
}

export async function apiPut(endpoint: string, body?: unknown, token?: string | null) {
  const res = await baseFetch(
    endpoint,
    { method: 'PUT', body: body ? JSON.stringify(body) : undefined },
    token
  )
  return handleResponse(res)
}

export async function apiDelete(endpoint: string, token?: string | null) {
  const res = await baseFetch(endpoint, { method: 'DELETE' }, token)
  return handleResponse(res)
}
