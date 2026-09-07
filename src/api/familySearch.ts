// Thin client for the FamilySearch APIs.
//
// Auth model for this app: the user pastes a Bearer access_token grabbed from an
// already-authenticated familysearch.org browser session. Tokens are short-lived
// (~1h) with no refresh_token in this flow, so a 401 means "grab a fresh token".
//
// Requests go through the Vite dev proxy (see vite.config.ts) to avoid CORS:
//   /fs-web -> www.familysearch.org (internal web-app service API)

const WEB_SERVICE_BASE = '/fs-web/service'

// One name form (a script/language variant of a name), e.g. Cyrillic vs Latin.
export interface INameForm {
  fullText: string
  givenPart: string | null
  familyPart: string | null
  prefixPart: string | null
  suffixPart: string | null
  lang: string
}

export interface INameDetails {
  detailsType: string
  fullText: string
  nameForms: INameForm[]
  nameType: string
  preferredName: boolean
  sourceCount: number
  style: string
}

export interface INameConclusion {
  type: string
  id: string | null
  contributor: unknown
  justification: unknown
  multiValued: boolean
  details: INameDetails
}

// A person in the user's contributions list. Fields are modelled after the live
// contributions/by-person payload; `id` is the PID used as the pagination cursor.
export interface IPerson {
  id: string
  name: string
  gender: 'MALE' | 'FEMALE' | 'UNKNOWN'
  lifespan: string
  fullLifespan: string
  living: boolean
  deleted: boolean
  readOnly: boolean
  skeleton: boolean
  principlePerson: boolean
  hasSpouseOrChildren: boolean
  hasMultipleFamiliesAsChild: boolean
  hasMultipleFamiliesAsParent: boolean
  size: string
  treeType: string
  visibleToAll: boolean
  visibleToAllWhenUsingFamilySearchApps: boolean
  creationDate: string
  creationDateMs: number
  sourceCount: number
  memoryCount: number
  noteCount: number
  discussionCount: number
  collaborateCount: number
  nameConclusion: INameConclusion
}

export type ContributionsResponse = unknown

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

export interface PageParams {
  pageSize?: number
  // Cursor: the person id of the last item from the previous page. Omit for the
  // first page.
  from?: string
}

async function apiGet<T>(path: string, { token, signal }: RequestOptions): Promise<T> {
  let res: Response
  try {
    res = await fetch(path, {
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
    const body = await res.text().catch(() => '')
    if (res.status === 401) {
      throw new FsApiError(401, 'Unauthorized — the token is invalid or expired. Grab a fresh one from the browser.')
    }
    if (res.status === 403 && body.includes('security service')) {
      throw new FsApiError(
        403,
        'Blocked by FamilySearch bot protection. This internal endpoint likely needs your browser session cookies, not just the Bearer token.',
      )
    }
    throw new FsApiError(res.status, `Request failed (${res.status}): ${body.slice(0, 300)}`)
  }

  return res.json() as Promise<T>
}

const CONTRIBUTIONS_PATH = `${WEB_SERVICE_BASE}/tree/tree-data/user/contributions/by-person`
const PERSON_CONTRIBUTIONS_PATH = `${WEB_SERVICE_BASE}/tree/tree-data/user/contributions/person`

// One page of related persons the user has contributed to. The endpoint returns
// pageSize items (default 50) and pages via a cursor: pass `from` = the id of the
// last person from the previous page to get the next page.
export function fetchContributionsByPerson(
  options: RequestOptions,
  { pageSize = 50, from }: PageParams = {},
): Promise<ContributionsResponse> {
  const params = new URLSearchParams({ pageSize: String(pageSize) })
  if (from) {
    params.set('from', from)
  }
  return apiGet<ContributionsResponse>(`${CONTRIBUTIONS_PATH}?${params.toString()}`, options)
}

// A single related person's contribution detail.
export function fetchContributionsForPerson(
  options: RequestOptions,
  id: string,
  pageSize = 50,
): Promise<ContributionsResponse> {
  const params = new URLSearchParams({ pageSize: String(pageSize) })
  return apiGet<ContributionsResponse>(
    `${PERSON_CONTRIBUTIONS_PATH}/${encodeURIComponent(id)}?${params.toString()}`,
    options,
  )
}

export interface AllContributions {
  persons: IPerson[]
  pages: number
  firstPage: ContributionsResponse
}

// Fetch every page by following the `from` cursor and concatenate the results.
//
// The cursor is the id of the last person on a page. On the next request that
// person is the anchor; depending on whether `from` is inclusive or exclusive it
// may reappear as the first item, so we dedupe by id. The loop is correct either
// way, and stops on any of:
//   - a short page (fewer than pageSize items) -> the last page,
//   - a page that adds no new persons -> no forward progress,
//   - a cursor that cannot advance (last id missing or unchanged),
//   - the maxPages safety cap.
export async function fetchAllContributionsByPerson(
  options: RequestOptions,
  { pageSize = 50, maxPages = 1000 }: { pageSize?: number; maxPages?: number } = {},
): Promise<AllContributions> {
  const persons: IPerson[] = []
  const seen = new Set<string>()
  let firstPage: ContributionsResponse = null
  let from: string | undefined
  let pages = 0

  while (pages < maxPages) {
    const data = await fetchContributionsByPerson(options, { pageSize, from })
    if (pages === 0) {
      firstPage = data
    }
    pages += 1

    const batch = extractPersons(data)
    if (batch.length === 0) {
      break
    }

    let added = 0
    for (const person of batch) {
      if (!seen.has(person.id)) {
        seen.add(person.id)
        persons.push(person)
        added += 1
      }
    }

    if (batch.length < pageSize || added === 0) {
      break
    }

    // Advance the cursor to the last person's id.
    const lastId = batch[batch.length - 1].id
    if (!lastId || lastId === from) {
      break
    }
    from = lastId
  }

  return { persons, pages, firstPage }
}

// Best-effort extraction of a person list from the (undocumented) response,
// which may be a bare array or an object wrapping one under a common key.
export function extractPersons(data: ContributionsResponse): IPerson[] {
  if (Array.isArray(data)) {
    return data as IPerson[]
  }
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    for (const key of ['persons', 'people', 'contributions', 'entries', 'items', 'results']) {
      const value = record[key]
      if (Array.isArray(value)) {
        return value as IPerson[]
      }
    }
  }
  return []
}
