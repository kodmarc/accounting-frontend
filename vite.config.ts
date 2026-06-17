import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const authSuccessPlugin = (): Plugin => ({
  name: 'auth-success',
  configureServer(server) {
    server.middlewares.use('/auth-success', (req, res, next) => {
      if (req.method === 'POST') {
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/plain')
        res.end('ok')
      } else {
        next()
      }
    })
  }
})

export default defineConfig({
  plugins: [react(), tailwindcss(), authSuccessPlugin()],
})
