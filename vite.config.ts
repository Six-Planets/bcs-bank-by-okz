import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync('./package.json', 'utf8')) as { version?: string };
let buildNumber = 1;
try {
  const nativeMeta = JSON.parse(readFileSync('./deploy/native.json', 'utf8')) as { code?: number };
  buildNumber = Number(nativeMeta.code) || 1;
} catch {
  buildNumber = 1;
}

const appVersion = process.env.VITE_APP_VERSION || pkg.version || '2.0.0';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  define: {
    __BBBOKZ_VERSION__: JSON.stringify(appVersion),
    __BBBOKZ_BUILD__: JSON.stringify(buildNumber)
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-motion': ['framer-motion'],
          'vendor-icons': ['lucide-react']
        }
      }
    }
  },
  optimizeDeps: {
    entries: ['index.html']
  },
  server: {
    port: 5174,
    host: true,
    allowedHosts: true,
    watch: {
      ignored: ['**/android/**', '**/deploy/**', '**/dist/**']
    }
  }
});
