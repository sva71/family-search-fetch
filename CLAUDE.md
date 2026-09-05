# CLAUDE.md

## Project

`family-search-fetch` — a browser app for fetching genealogical data from
[FamilySearch](https://www.familysearch.org). Fetching requires an authenticated session;
the login endpoint is `https://ident.familysearch.org/login`.

Current state: freshly scaffolded Vite + React template. `src/App.tsx` is a placeholder;
no FamilySearch integration exists yet.

## Stack

- **Vite 8** + `@vitejs/plugin-react` (Oxc-based)
- **React 19** with `StrictMode`, `createRoot`
- **TypeScript 6** — bundler module resolution, `verbatimModuleSyntax`, `noEmit`
- **ESLint 10** flat config (`eslint.config.js`)

## Commands

```bash
npm run dev      # Vite dev server with HMR
npm run build    # tsc -b && vite build
npm run lint     # eslint .
npm run preview  # serve the production build
```

Always run `npm run lint` and `npm run build` after changes — the build is the only
type-check step (`vite build` alone does not type-check).

## Code style

Enforced by ESLint, so don't fight it:

- **No semicolons** (`semi: never`)
- **Single quotes** everywhere, including JSX attributes (`jsx-quotes: prefer-single`)
- **Spaces inside braces**: `{ foo }`, not `{foo}`
- `.tsx` extensions are included in relative imports (`import App from './App.tsx'`)
- `verbatimModuleSyntax` is on → type-only imports must use `import type { … }`

`noUnusedLocals` / `noUnusedParameters` are on, so dead bindings break the build.
Note that `strict` is *not* enabled in `tsconfig.app.json`.

## Layout

```
index.html          # Vite entry, mounts #root
src/main.tsx        # createRoot + StrictMode
src/App.tsx         # root component
public/             # favicon.svg, icons.svg — served at /
docs/               # scratch notes (see security note below)
```

## Security

`docs/context.md` holds a **plaintext FamilySearch username and password**. It is not
gitignored and the repository has no commits yet, so nothing is in history — keep it out.
Never copy those credentials into source, tests, config, commit messages, or logs; read
them from the environment (e.g. a gitignored `.env.local`, which Vite loads) if the app
needs them.

Also relevant: anything a Vite app can read is public. Credentials or tokens shipped in
client-side code (including `VITE_`-prefixed env vars) are visible to anyone loading the
page. FamilySearch auth needs to happen somewhere the browser bundle isn't — a small
server or proxy — before this app can fetch on a user's behalf.
