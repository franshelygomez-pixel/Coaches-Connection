import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    target: ['es2020', 'chrome90', 'edge90', 'firefox88', 'safari14'],
    chunkSizeWarningLimit: 500,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/@supabase/')) return 'vendor-supabase';
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) {
            return 'vendor-react';
          }
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: 'coverage',
      include: [
        'src/utils/**/*.js',
        'src/components/CentroAyudaPiloto.jsx',
        'src/components/Paginacion.jsx',
        'src/pages/Login.jsx',
        'src/pages/Registro.jsx',
      ],
      thresholds: {
        statements: 65,
        branches: 60,
        functions: 70,
        lines: 70,
      },
    },
  },
})
