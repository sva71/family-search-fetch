import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
// The FamilySearch platform API does not send CORS headers for localhost, so we
// proxy it here: the browser talks same-origin to Vite under /fs-api, and Vite
// forwards to api.familysearch.org (Authorization header is passed through).
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
    },
  },
})
