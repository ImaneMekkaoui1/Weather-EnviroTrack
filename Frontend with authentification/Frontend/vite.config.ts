import { defineConfig } from 'vite';
import nodePolyfills from 'vite-plugin-node-polyfills';

export default defineConfig({
  plugins: [
    nodePolyfills({
      globals: {
        global: true
      },
      protocolImports: true
    })
  ],
  define: {
    'global': 'globalThis'
  }
}); 