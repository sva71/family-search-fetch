import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// FamilySearch does not send CORS headers for localhost, so we proxy its hosts
// here: the browser talks same-origin to Vite, and Vite forwards upstream with
// the Authorization header passed through.
//   /fs-api  -> api.familysearch.org           (clean OAuth2 platform API)
//   /fs-web  -> www.familysearch.org/service   (internal web-app service API)
// Note: www.familysearch.org sits behind aggressive bot protection (Imperva),
// so a Bearer token alone may not be enough — it can also expect the browser's
// session cookies. If a request comes back 403 "blocked by our security
// service", the token by itself was insufficient.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/fs-api': {
        target: 'https://api.familysearch.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/fs-api/, ''),
      },
      '/fs-web': {
        target: 'https://www.familysearch.org',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/fs-web/, ''),
      },
    },
  },
})
