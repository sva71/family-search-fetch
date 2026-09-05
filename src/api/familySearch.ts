// Thin client for the FamilySearch platform API.
//
// Auth model for this app: the user pastes a Bearer access_token grabbed from an
// already-authenticated familysearch.org browser session. That token is all the
// API needs — the client_id is only required to *obtain* a token, not to use one.
// Tokens are short-lived (~1h) and there is no refresh_token in this flow, so a
// 401 means "grab a fresh token from the browser".

// Requests go through the Vite dev proxy (see vite.config.ts) to avoid CORS.
const API_BASE = '/fs-api/platform'

export interface FsUser {
  id?: string
  contactName?: string
  fullName?: string
  displayName?: string
  email?: string
  personId?: string
  treeUserId?: string
  preferredLanguage?: string
}

export interface CurrentUserResponse {
  users?: FsUser[]
}

export class FsApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'FsApiError'
    this.status = status
  }
}

interface RequestOptions {
  token: string
  signal?: AbortSignal
}

async function apiGet<T>(path: string, { token, signal }: RequestOptions): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal,
    })
  } catch (cause) {
    throw new FsApiError(0, `Network error (is the dev server running?): ${String(cause)}`)
  }

  if (!res.ok) {
    if (res.status === 401) {
      throw new FsApiError(401, 'Unauthorized — the token is invalid or expired. Grab a fresh one from the browser.')
    }
    const body = await res.text().catch(() => '')
    throw new FsApiError(res.status, `Request failed (${res.status}): ${body.slice(0, 300)}`)
  }

  return res.json() as Promise<T>
}

export function fetchCurrentUser(options: RequestOptions): Promise<CurrentUserResponse> {
  return apiGet<CurrentUserResponse>('/users/current', options)
}
