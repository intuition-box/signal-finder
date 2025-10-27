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
      // Proxy all requests from '/graphql' to the real API
      '/graphql': {
        target: 'https://testnet.intuition.sh/v1/graphql',
        changeOrigin: true, // Needed for virtual hosted sites
        secure: false,      // Often needed for self-signed SSL certs
        rewrite: (path) => path.replace(/^\/graphql/, '') // Remove the '/graphql' prefix
      }
    }
  },
})