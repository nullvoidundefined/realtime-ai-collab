const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let csrfToken: string | null = null;

export async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;

  const res = await fetch(`${API_URL}/api/csrf-token`, {
    credentials: 'include',
  });

  if (!res.ok) {
    throw new ApiError(res.status, 'Failed to fetch CSRF token');
  }

  const body = (await res.json()) as { token: string };
  csrfToken = body.token;
  return csrfToken;
}

/** Clear cached token so the next request fetches a fresh one. */
export function clearCsrfToken(): void {
  csrfToken = null;
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = await fetchCsrfToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-Token': token,
      ...options.headers,
    },
  });

  /* If a 403 with CSRF-related message, retry once with a fresh token */
  if (res.status === 403) {
    const body = await res.json().catch(() => ({ error: '' }));
    if (
      typeof body.error === 'string' &&
      body.error.toLowerCase().includes('csrf')
    ) {
      clearCsrfToken();
      const freshToken = await fetchCsrfToken();
      const retry = await fetch(`${API_URL}${path}`, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-Token': freshToken,
          ...options.headers,
        },
      });
      if (!retry.ok) {
        const retryBody = await retry.json().catch(() => ({ error: retry.statusText }));
        throw new ApiError(retry.status, retryBody.error ?? retry.statusText);
      }
      if (retry.status === 204) return undefined as T;
      return retry.json() as Promise<T>;
    }
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? res.statusText);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export { ApiError };
