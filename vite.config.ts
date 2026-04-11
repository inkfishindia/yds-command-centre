import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5173,
        proxy: {
          // Proxy /api to the Express backend running on port 3000
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
          },
        },
      },
      build: {
        outDir: 'dist',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'app'),
        },
      },
    };
});
