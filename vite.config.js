import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/graphql': {
        target: 'https://rpc.intuition.systems',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
});