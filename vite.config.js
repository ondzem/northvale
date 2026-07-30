import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    warmup: {
      clientFiles: [
        './src/App.jsx',
        './src/components/Homepage.jsx',
        './src/components/Navbar.jsx',
        './src/services/products.js'
      ]
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js']
  }
});
