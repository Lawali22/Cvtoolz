import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'

export default defineConfig({
  plugins: [
    react({
      jsxRuntime: 'classic',
    }),
    // Plugin legacy — génère un bundle compatible avec les vieux navigateurs
    legacy({
      targets: ['defaults', 'not IE 11', 'Chrome >= 58', 'Firefox >= 57', 'Safari >= 11'],
      additionalLegacyPolyfills: ['regenerator-runtime/runtime'],
    }),
  ],
  build: {
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
    chunkSizeWarningLimit: 1500,
  },
})
