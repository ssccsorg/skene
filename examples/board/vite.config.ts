import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { boardIntoBuild } from '@ssccsorg/skene-frame/tools/vite-board.mjs';
import { SKENE_CHUNK_LIMIT, SKENE_DEDUPE, skeneChunks } from '@ssccsorg/skene-frame/tools/vite-chunks.mjs';

// The example is the smallest deployment of the frame, so it is built with the pieces a deployment is built with: the
// board copied into the build by the frame's own plugin, and the engines cut into the files a deployment caches. What it
// keeps for itself is the ports, which are this workspace's.
export default defineConfig({
  plugins: [react(), tailwindcss(), boardIntoBuild()],
  resolve: { dedupe: SKENE_DEDUPE },
  optimizeDeps: { exclude: ['maplibre-gl'] },
  server: { port: 5290, strictPort: true },
  preview: { port: 5291, strictPort: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    chunkSizeWarningLimit: SKENE_CHUNK_LIMIT,
    rollupOptions: { output: { manualChunks: skeneChunks } },
  },
});
