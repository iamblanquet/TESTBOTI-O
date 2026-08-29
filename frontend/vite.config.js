import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    // Optimizar el bundle
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-icons': ['lucide-react']
        }
      }
    },
    // Reducir el tamaño de los chunks
    chunkSizeWarningLimit: 1000,
    // Sourcemaps solo en desarrollo
    sourcemap: process.env.NODE_ENV === 'development'
  },
  // Optimizar dependencias
  optimizeDeps: {
    include: ['react', 'react-dom', 'lucide-react']
  }
});
