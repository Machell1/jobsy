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
