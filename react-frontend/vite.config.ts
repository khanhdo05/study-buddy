import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const target = env.VITE_LEARNER_AGENT_URL || 'http://127.0.0.1:8000'
  return {
    plugins: [react()],
    server: {
      proxy: {
        '/agent': {
          target,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/agent/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyRequest) => {
              if (env.AGENT_API_KEY) proxyRequest.setHeader('Authorization', `Bearer ${env.AGENT_API_KEY}`)
            })
          },
        },
      },
    },
  }
})
