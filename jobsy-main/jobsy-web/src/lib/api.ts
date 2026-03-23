export const API_BASE = 'https://api.jobsyja.com'

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, detail: string) {
    super(detail)
    this.status = status
    this.detail = detail
  }
}

// ---------- Token refresh queue (mirrors mobile client.ts) ----------

let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

function processQueue(error: unknown, token: string | null) {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token!)
    }
  })
  failedQueue = []
}

function getStoredRefreshToken(): string | null {
  return sessionStorage.getItem('jobsy_refresh')
}

function clearAuthAndRedirect() {
  sessionStorage.removeItem('jobsy_token')
  sessionStorage.removeItem('jobsy_refresh')
  sessionStorage.removeItem('jobsy_role')
  window.location.href = '/login'
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getStoredRefreshToken()
  if (!refreshToken) {
    throw new Error('No refresh token')
  }

  // Call refresh endpoint directly (bypasses the interceptor)
  const res = await fetch(`${API_BASE}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  })

  if (!res.ok) {
    throw new ApiError(res.status, 'Token refresh failed')
  }

  const data = await res.json()
  sessionStorage.setItem('jobsy_token', data.access_token)
  sessionStorage.setItem('jobsy_refresh', data.refresh_token)
  return data.access_token
}

// ---------- Core fetch helpers ----------

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

/**
 * Wraps an API call with automatic 401 retry via token refresh.
 * Mirrors the queue-based approach from the mobile client.ts.
 * Auth endpoints (/auth/) are never retried.
 */
async function withAutoRefresh<T>(
  endpoint: string,
  apiFn: (token?: string | null) => Promise<T>,
  token?: string | null
): Promise<T> {
  try {
    return await apiFn(token)
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.status !== 401 ||
      endpoint.includes('/auth/')
    ) {
      throw error
    }

    // If another call is already refreshing, queue up and wait
    if (isRefreshing) {
      const newToken = await new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
      return apiFn(newToken)
    }

    isRefreshing = true

    try {
      const newToken = await refreshAccessToken()
      processQueue(null, newToken)
      return await apiFn(newToken)
    } catch (refreshError) {
      processQueue(refreshError, null)
      clearAuthAndRedirect()
      throw refreshError
    } finally {
      isRefreshing = false
    }
  }
}

// ---------- Public API functions ----------

export async function apiGet(endpoint: string, token?: string | null) {
  return withAutoRefresh(endpoint, async (t) => {
    const res = await baseFetch(endpoint, { method: 'GET' }, t)
    return handleResponse(res)
  }, token)
}

export async function apiPost(endpoint: string, body?: unknown, token?: string | null) {
  return withAutoRefresh(endpoint, async (t) => {
    const res = await baseFetch(
      endpoint,
      { method: 'POST', body: body ? JSON.stringify(body) : undefined },
      t
    )
    return handleResponse(res)
  }, token)
}

export async function apiPut(endpoint: string, body?: unknown, token?: string | null) {
  return withAutoRefresh(endpoint, async (t) => {
    const res = await baseFetch(
      endpoint,
      { method: 'PUT', body: body ? JSON.stringify(body) : undefined },
      t
    )
    return handleResponse(res)
  }, token)
}

export async function apiDelete(endpoint: string, token?: string | null) {
  return withAutoRefresh(endpoint, async (t) => {
    const res = await baseFetch(endpoint, { method: 'DELETE' }, t)
    return handleResponse(res)
  }, token)
}

export async function apiUpload(
  endpoint: string,
  file: File,
  folder: string,
  token?: string | null,
  onProgress?: (percent: number) => void
): Promise<{ key: string; url: string; size: number; content_type: string; thumbnail_url?: string }> {
  const formData = new FormData()
  formData.append('file', file)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}${endpoint}?folder=${encodeURIComponent(folder)}`)
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(JSON.parse(xhr.responseText))
      } else if (xhr.status === 401 && !endpoint.includes('/auth/')) {
        // Attempt token refresh for upload 401s
        refreshAccessToken()
          .then(newToken => {
            const retryXhr = new XMLHttpRequest()
            retryXhr.open('POST', `${API_BASE}${endpoint}?folder=${encodeURIComponent(folder)}`)
            retryXhr.setRequestHeader('Authorization', `Bearer ${newToken}`)
            retryXhr.upload.onprogress = (e) => {
              if (e.lengthComputable && onProgress) {
                onProgress(Math.round((e.loaded / e.total) * 100))
              }
            }
            retryXhr.onload = () => {
              if (retryXhr.status >= 200 && retryXhr.status < 300) {
                resolve(JSON.parse(retryXhr.responseText))
              } else {
                let detail = retryXhr.statusText
                try { detail = JSON.parse(retryXhr.responseText).detail || detail } catch {}
                reject(new ApiError(retryXhr.status, detail))
              }
            }
            retryXhr.onerror = () => reject(new ApiError(0, 'Network error'))
            retryXhr.send(formData)
          })
          .catch(() => {
            clearAuthAndRedirect()
            reject(new ApiError(401, 'Session expired'))
          })
      } else {
        let detail = xhr.statusText
        try { detail = JSON.parse(xhr.responseText).detail || detail } catch {}
        reject(new ApiError(xhr.status, detail))
      }
    }

    xhr.onerror = () => reject(new ApiError(0, 'Network error'))
    xhr.send(formData)
  })
}
