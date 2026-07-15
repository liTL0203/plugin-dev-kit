import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '../dist',
    emptyOutDir: true
  },
  base: './',
  server: {
    hmr: {
      protocol: 'ws',
      host: 'localhost'
    }
  }
})
