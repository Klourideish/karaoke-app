import fs from 'node:fs'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const httpsCertPath = env.VITE_DEV_HTTPS_CERT_PATH
  const httpsKeyPath = env.VITE_DEV_HTTPS_KEY_PATH
  const https =
    httpsCertPath && httpsKeyPath
      ? {
          cert: fs.readFileSync(httpsCertPath),
          key: fs.readFileSync(httpsKeyPath),
        }
      : undefined

  return {
    plugins: [react()],
    server: {
      host: "0.0.0.0",
      https,
      proxy: {
        "/health": "http://localhost:3001",
        "/library": "http://localhost:3001",
        "/media": "http://localhost:3001",
        "/socket.io": {
          target: "http://localhost:3001",
          ws: true,
        },
      },
    },
  }
})
