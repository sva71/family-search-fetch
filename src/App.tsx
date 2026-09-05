import { useState } from 'react'
import type { FormEvent } from 'react'
import { fetchCurrentUser, FsApiError } from './api/familySearch.ts'
import type { CurrentUserResponse, FsUser } from './api/familySearch.ts'

type Status = 'idle' | 'loading' | 'done' | 'error'

function App() {
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState('')
  const [user, setUser] = useState<FsUser | null>(null)
  const [raw, setRaw] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!token.trim()) {
      return
    }
    setStatus('loading')
    setError('')
    setUser(null)
    setRaw('')
    try {
      const data: CurrentUserResponse = await fetchCurrentUser({ token: token.trim() })
      setUser(data.users?.[0] ?? null)
      setRaw(JSON.stringify(data, null, 2))
      setStatus('done')
    } catch (cause) {
      setError(cause instanceof FsApiError ? cause.message : String(cause))
      setStatus('error')
    }
  }

  return (
    <main style={{ maxWidth: 720, margin: '2rem auto', padding: '0 1rem', fontFamily: 'system-ui, sans-serif' }}>
      <h1>Family Search Data Fetch</h1>
      <p style={{ color: '#555' }}>
        Paste a Bearer access token from an authenticated familysearch.org browser
        session (DevTools → Network → any request to api.familysearch.org →
        <code> Authorization </code> header). Tokens expire after about an hour.
      </p>

      <form onSubmit={handleSubmit}>
        <label htmlFor='token' style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>
          Access token
        </label>
        <input
          id='token'
          type='password'
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder='eyJ… or b0-…'
          autoComplete='off'
          spellCheck={false}
          style={{ width: '100%', padding: 8, fontFamily: 'monospace', boxSizing: 'border-box' }}
        />
        <button
          type='submit'
          disabled={status === 'loading' || !token.trim()}
          style={{ marginTop: 12, padding: '8px 16px' }}
        >
          {status === 'loading' ? 'Fetching…' : 'Fetch my profile'}
        </button>
      </form>

      {status === 'error' && (
        <p style={{ color: '#b00020', marginTop: 16 }} role='alert'>
          {error}
        </p>
      )}

      {user && (
        <section style={{ marginTop: 24 }}>
          <h2>Profile</h2>
          <dl style={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '4px 16px' }}>
            <dt>Name</dt>
            <dd>{user.displayName ?? user.contactName ?? user.fullName ?? '—'}</dd>
            <dt>User id</dt>
            <dd>{user.id ?? '—'}</dd>
            <dt>Person id</dt>
            <dd>{user.personId ?? '—'}</dd>
            <dt>Email</dt>
            <dd>{user.email ?? '—'}</dd>
          </dl>
        </section>
      )}

      {raw && (
        <details style={{ marginTop: 16 }}>
          <summary>Raw response</summary>
          <pre style={{ overflow: 'auto', background: '#f5f5f5', padding: 12 }}>{raw}</pre>
        </details>
      )}
    </main>
  )
}

export default App
