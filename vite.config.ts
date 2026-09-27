import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// Local API: the browser calls /api/... on localhost:5173 and Vite forwards it to
// XAMPP (http://localhost/bookera/api/...). Same origin for the browser → cookies
// work and no CORS is needed. Override with API_PROXY / API_PREFIX if your setup differs.
const apiTarget = process.env.API_PROXY ?? 'http://localhost'
const apiPrefix = process.env.API_PREFIX ?? '/bookera/api'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: apiTarget,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, apiPrefix),
      },
    },
  },
})
