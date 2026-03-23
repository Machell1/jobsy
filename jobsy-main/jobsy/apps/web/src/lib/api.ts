import type { ApiResponse, PaginatedResponse } from "@jobsy/types";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "https://api.jobsyja.com";

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  status: number;
  detail: string;
  details?: Record<string, unknown>;

  constructor(
    status: number,
    detail: string,
    details?: Record<string, unknown>,
  ) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.details = details;
  }
}

// ---------------------------------------------------------------------------
// Internal fetch wrapper
// ---------------------------------------------------------------------------

async function request<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const { token, ...init } = options;

  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  headers.set("Accept", "application/json");

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;

  const res = await fetch(url, { ...init, headers });

  if (!res.ok) {
    let detail = "An unexpected error occurred";
    let details: Record<string, unknown> | undefined;

    try {
      const body = await res.json();
      detail = body.message ?? body.detail ?? body.error ?? detail;
      details = body.details;
    } catch {
      // response body was not JSON
    }

    throw new ApiError(res.status, detail, details);
  }

  // 204 No Content
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Public API methods
// ---------------------------------------------------------------------------

/** GET request returning `ApiResponse<T>` envelope or raw data. */
export async function apiGet<T>(
  path: string,
  token?: string | null,
): Promise<T> {
  return request<T>(path, { method: "GET", token });
}

/** POST request. */
export async function apiPost<T>(
  path: string,
  body: unknown,
  token?: string | null,
): Promise<T> {
  return request<T>(path, {
    method: "POST",
    body: JSON.stringify(body),
    token,
  });
}

/** PUT request. */
export async function apiPut<T>(
  path: string,
  body: unknown,
  token?: string | null,
): Promise<T> {
  return request<T>(path, {
    method: "PUT",
    body: JSON.stringify(body),
    token,
  });
}

/** PATCH request. */
export async function apiPatch<T>(
  path: string,
  body: unknown,
  token?: string | null,
): Promise<T> {
  return request<T>(path, {
    method: "PATCH",
    body: JSON.stringify(body),
    token,
  });
}

/** DELETE request. */
export async function apiDelete<T = void>(
  path: string,
  token?: string | null,
): Promise<T> {
  return request<T>(path, { method: "DELETE", token });
}

// ---------------------------------------------------------------------------
// Typed helpers for common response shapes
// ---------------------------------------------------------------------------

/** Unwrap the standard `{ data, message, meta }` envelope. */
export async function fetchData<T>(
  path: string,
  token?: string | null,
): Promise<T> {
  const res = await apiGet<ApiResponse<T>>(path, token);
  return res.data;
}

/** Fetch a paginated list. */
export async function fetchPaginated<T>(
  path: string,
  token?: string | null,
): Promise<PaginatedResponse<T>> {
  return apiGet<PaginatedResponse<T>>(path, token);
}
