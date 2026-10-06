import { defineConfig } from 'vite';

// `vite build`            → single self-contained file (build/index.html, opens from disk)
// `vite build --mode web` → deployable website (web/): split + hashed chunks for long-term caching,
//                           three.js in its own chunk, studio/recording tools excluded.
export default defineConfig(({ mode }) => (mode === 'web' ? {
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2020',
    cssCodeSplit: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: { output: { manualChunks: { three: ['three'] } } },
  },
} : {
  base: './',
  server: { port: 5199, strictPort: true, host: '127.0.0.1' },
  build: {
    outDir: '../build',
    emptyOutDir: true,
    assetsInlineLimit: 100000000,
    cssCodeSplit: false,
    modulePreload: false,
    chunkSizeWarningLimit: 4000,
    rollupOptions: { output: { inlineDynamicImports: true, manualChunks: undefined } },
  },
}));
