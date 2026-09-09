import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/ws': { target: 'ws://localhost:3001', ws: true },
    },
  },
  test: {
    include: ['src/**/*.test.ts', 'server/**/*.test.ts'],
  },
})
