import { env } from './env'

// Single chokepoint for every browser → Wagr api call. Hooks call api.get /
// api.post / api.patch / api.delete instead of hand-rolling fetch. Three
// things in one place: base URL, credentials (so the session cookie travels),
// and error shaping. If we ever add request IDs, retries, or telemetry, this
// is where they go.
//
// Every method accepts an optional AbortSignal so TanStack Query can cancel
// in-flight requests when a query is invalidated or the component unmounts.
// Without the signal, the request keeps running and the result gets discarded —
// not a memory leak, but wasted bandwidth.

export class ApiResponseError extends Error {
  public readonly code: string
  public readonly status: number

  constructor(code: string, status: number, message: string) {
    super(message)
    this.name = 'ApiResponseError'
    this.code = code
    this.status = status
  }
}

interface ApiErrorBody {
  error?: { code: string; message: string }
}

interface RequestOptions {
  signal?: AbortSignal
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const init: RequestInit = { method, credentials: 'include' }
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  if (options?.signal) {
    init.signal = options.signal
  }
  const res = await fetch(`${env.NEXT_PUBLIC_API_URL}${path}`, init)

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as ApiErrorBody | null
    throw new ApiResponseError(
      errBody?.error?.code ?? 'UNKNOWN',
      res.status,
      errBody?.error?.message ?? 'Something went wrong. Try again.',
    )
  }

  // 204 No Content — nothing to parse. Callers expecting void get undefined.
  const payload = res.status === 204 ? undefined : await res.json()
  return payload as T
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) => request<T>('GET', path, undefined, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
}
