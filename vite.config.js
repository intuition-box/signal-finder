// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills(),
  ],
  server: {
    open: true,
    proxy: {
      // This rule proxies both HTTP and WebSockets
      '/graphql': {
        target: 'https://testnet.intuition.sh/v1/graphql',
        changeOrigin: true,
        secure: false,
        ws: true, // Enable WebSocket proxying
        rewrite: (path) => path.replace(/^\/graphql/, ''),
      }
    }
  },
})